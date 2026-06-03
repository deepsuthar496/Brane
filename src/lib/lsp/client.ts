/**
 * LSP Client — JSON-RPC connection to a single language server.
 * 
 * Uses vscode-jsonrpc to communicate with the server over stdio.
 * Handles initialize handshake, textDocument/didOpen, textDocument/didChange,
 * and listens for textDocument/publishDiagnostics notifications.
 * 
 * Adapted from OpenCode's client.ts but using plain async/await instead of Effect.ts.
 */
import path from "path";
import fs from "fs/promises";
import { pathToFileURL, fileURLToPath } from "url";
import {
  createMessageConnection,
  StreamMessageReader,
  StreamMessageWriter,
  type MessageConnection,
} from "vscode-jsonrpc/node";
import type { ServerHandle } from "./server";
import { LANGUAGE_EXTENSIONS } from "./language";

const log = (...args: any[]) => console.log("[LSP:Client]", ...args);

/** Diagnostic severity levels from LSP spec */
export enum DiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4,
}

/** LSP Diagnostic structure (subset of the full spec) */
export interface Diagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  severity?: DiagnosticSeverity;
  code?: string | number;
  source?: string;
  message: string;
}

/** Timeout for waiting for diagnostics after touching a file */
const DIAGNOSTICS_TIMEOUT_MS = 3000;

/** Debounce time to wait for follow-up diagnostics (e.g., semantic after syntax) */
const DIAGNOSTICS_DEBOUNCE_MS = 150;

/** Timeout for the initialize handshake */
const INITIALIZE_TIMEOUT_MS = 30000;

export interface LSPClientInfo {
  serverID: string;
  root: string;
  connection: MessageConnection;
  diagnostics: Map<string, Diagnostic[]>;
  notify: {
    open(filePath: string): Promise<void>;
  };
  waitForDiagnostics(filePath: string): Promise<void>;
  shutdown(): Promise<void>;
}

/**
 * Normalize a file path for consistent Map key usage.
 */
function normalizePath(p: string): string {
  return path.resolve(p).replace(/\\/g, "/").toLowerCase();
}

/**
 * Create a promise that rejects after the given timeout.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout after ${ms}ms`)),
      ms
    );
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Create and initialize an LSP client for a given server.
 */
export async function createLSPClient(input: {
  serverID: string;
  server: ServerHandle;
  root: string;
}): Promise<LSPClientInfo> {
  log(`[${input.serverID}] Starting client for root: ${input.root}`);

  // Create JSON-RPC message connection over stdio
  const connection = createMessageConnection(
    new StreamMessageReader(input.server.process.stdout as any),
    new StreamMessageWriter(input.server.process.stdin as any)
  );

  // Accumulated diagnostics per file
  const diagnostics = new Map<string, Diagnostic[]>();

  // Event system for diagnostic notifications
  type DiagListener = (filePath: string) => void;
  const diagListeners = new Set<DiagListener>();

  // Handle incoming diagnostics from the server
  connection.onNotification(
    "textDocument/publishDiagnostics",
    (params: any) => {
      let filePath: string;
      try {
        filePath = normalizePath(fileURLToPath(params.uri));
      } catch {
        filePath = normalizePath(params.uri);
      }

      log(
        `[${input.serverID}] publishDiagnostics: ${filePath} (${params.diagnostics.length} issues)`
      );
      diagnostics.set(filePath, params.diagnostics);

      // Notify listeners
      for (const listener of diagListeners) {
        listener(filePath);
      }
    }
  );

  // Handle server requests that we need to respond to
  connection.onRequest(
    "window/workDoneProgress/create",
    () => null
  );
  connection.onRequest(
    "workspace/configuration",
    () => [input.server.initialization ?? {}]
  );
  connection.onRequest("client/registerCapability", async () => {});
  connection.onRequest("client/unregisterCapability", async () => {});
  connection.onRequest("workspace/workspaceFolders", async () => [
    {
      name: "workspace",
      uri: pathToFileURL(input.root).href,
    },
  ]);

  // Start listening
  connection.listen();

  // Send initialize request
  log(`[${input.serverID}] Sending initialize...`);
  await withTimeout(
    connection.sendRequest("initialize", {
      rootUri: pathToFileURL(input.root).href,
      processId: input.server.process.pid,
      workspaceFolders: [
        {
          name: "workspace",
          uri: pathToFileURL(input.root).href,
        },
      ],
      initializationOptions: {
        ...input.server.initialization,
      },
      capabilities: {
        window: {
          workDoneProgress: true,
        },
        workspace: {
          configuration: true,
          didChangeWatchedFiles: {
            dynamicRegistration: true,
          },
        },
        textDocument: {
          synchronization: {
            didOpen: true,
            didChange: true,
          },
          publishDiagnostics: {
            versionSupport: true,
          },
        },
      },
    }),
    INITIALIZE_TIMEOUT_MS
  );

  // Send initialized notification
  await connection.sendNotification("initialized", {});

  // Send workspace configuration if server has initialization options
  if (input.server.initialization) {
    await connection.sendNotification("workspace/didChangeConfiguration", {
      settings: input.server.initialization,
    });
  }

  log(`[${input.serverID}] Initialized successfully`);

  // Track file versions for didOpen/didChange
  const fileVersions: Record<string, number> = {};

  const client: LSPClientInfo = {
    serverID: input.serverID,
    root: input.root,
    connection,
    diagnostics,

    notify: {
      async open(filePath: string) {
        const absPath = path.isAbsolute(filePath)
          ? filePath
          : path.resolve(input.root, filePath);
          
        let text: string;
        try {
          text = await fs.readFile(absPath, "utf-8");
        } catch (err: any) {
          if (err.code === "ENOENT") {
            log(`[${input.serverID}] File not found, skipping open: ${absPath}`);
            return;
          }
          throw err;
        }

        const extension = path.extname(absPath);
        const languageId = LANGUAGE_EXTENSIONS[extension] ?? "plaintext";
        const uri = pathToFileURL(absPath).href;

        const version = fileVersions[absPath];
        if (version !== undefined) {
          // File already opened — send didChange
          const next = version + 1;
          fileVersions[absPath] = next;

          // Also notify workspace file watcher
          await connection.sendNotification(
            "workspace/didChangeWatchedFiles",
            {
              changes: [{ uri, type: 2 /* Changed */ }],
            }
          );

          await connection.sendNotification("textDocument/didChange", {
            textDocument: { uri, version: next },
            contentChanges: [{ text }],
          });
          return;
        }

        // First time opening — send didOpen
        log(`[${input.serverID}] didOpen: ${absPath}`);
        diagnostics.delete(normalizePath(absPath));

        await connection.sendNotification(
          "workspace/didChangeWatchedFiles",
          {
            changes: [{ uri, type: 1 /* Created */ }],
          }
        );

        await connection.sendNotification("textDocument/didOpen", {
          textDocument: {
            uri,
            languageId,
            version: 0,
            text,
          },
        });
        fileVersions[absPath] = 0;
      },
    },

    async waitForDiagnostics(filePath: string) {
      const normalizedPath = normalizePath(
        path.isAbsolute(filePath)
          ? filePath
          : path.resolve(input.root, filePath)
      );
      log(`[${input.serverID}] Waiting for diagnostics: ${normalizedPath}`);

      return withTimeout(
        new Promise<void>((resolve) => {
          let debounceTimer: NodeJS.Timeout | undefined;

          const listener: DiagListener = (diagPath) => {
            if (diagPath === normalizedPath) {
              // Debounce: wait for follow-up diagnostics
              if (debounceTimer) clearTimeout(debounceTimer);
              debounceTimer = setTimeout(() => {
                diagListeners.delete(listener);
                resolve();
              }, DIAGNOSTICS_DEBOUNCE_MS);
            }
          };

          diagListeners.add(listener);
        }),
        DIAGNOSTICS_TIMEOUT_MS
      ).catch(() => {
        // Timeout is OK — some servers are slow or may not emit diagnostics
        log(
          `[${input.serverID}] Diagnostics timeout for ${normalizedPath}`
        );
      });
    },

    async shutdown() {
      log(`[${input.serverID}] Shutting down`);
      try {
        connection.end();
        connection.dispose();
      } catch {
        // ignore
      }
      try {
        input.server.process.kill();
      } catch {
        // ignore
      }
      log(`[${input.serverID}] Shutdown complete`);
    },
  };

  return client;
}
