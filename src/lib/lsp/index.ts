/**
 * LSP Manager — the main entry point for LSP functionality in Brainzo.
 * 
 * Manages spawning language servers, routing files to the correct server,
 * and collecting diagnostics. Also includes the diagnostic formatting
 * functions that produce the error messages the AI reads.
 * 
 * Usage:
 *   const lsp = createLSPManager(workspaceRoot);
 *   await lsp.touchFile('/path/to/file.ts');  // notifies relevant servers
 *   const diags = lsp.getDiagnostics();       // get all accumulated diagnostics
 *   const report = formatDiagnosticReport('/path/to/file.ts', diags[normalizedPath] ?? []);
 *   await lsp.shutdown();                     // kill all servers
 */
import path from "path";
import { createLSPClient, type LSPClientInfo, type Diagnostic, DiagnosticSeverity } from "./client";
import { ALL_SERVERS, type ServerConfig } from "./server";

const log = (...args: any[]) => console.log("[LSP]", ...args);

/** Maximum errors to report per file */
const MAX_DIAGNOSTICS_PER_FILE = 20;

/** Maximum number of other-file diagnostic blocks to report */
const MAX_PROJECT_DIAGNOSTICS_FILES = 5;

// ─── Diagnostic Formatting ───────────────────────────────────────────────────

/**
 * Format a single diagnostic into a human-readable string.
 * Example: "ERROR [5:10] Cannot find name 'myVar'."
 */
export function prettyDiagnostic(diagnostic: Diagnostic): string {
  const severityMap: Record<number, string> = {
    1: "ERROR",
    2: "WARN",
    3: "INFO",
    4: "HINT",
  };
  const severity = severityMap[diagnostic.severity || 1] || "ERROR";
  const line = diagnostic.range.start.line + 1;
  const col = diagnostic.range.start.character + 1;
  return `${severity} [${line}:${col}] ${diagnostic.message}`;
}

/**
 * Format all ERROR-level diagnostics for a file into an XML-style report block.
 * Returns empty string if there are no errors.
 * 
 * Example output:
 * <diagnostics file="src/foo.ts">
 * ERROR [5:10] Cannot find name 'myVar'.
 * ERROR [12:3] Type 'string' is not assignable to type 'number'.
 * </diagnostics>
 */
export function formatDiagnosticReport(
  file: string,
  issues: Diagnostic[]
): string {
  const errors = issues.filter(
    (item) => item.severity === DiagnosticSeverity.Error
  );
  if (errors.length === 0) return "";

  const limited = errors.slice(0, MAX_DIAGNOSTICS_PER_FILE);
  const more = errors.length - MAX_DIAGNOSTICS_PER_FILE;
  const suffix = more > 0 ? `\n... and ${more} more` : "";

  return `<diagnostics file="${file}">\n${limited.map(prettyDiagnostic).join("\n")}${suffix}\n</diagnostics>`;
}

// ─── LSP Manager ─────────────────────────────────────────────────────────────

export interface LSPManager {
  /** Notify relevant servers about a file change and wait for diagnostics */
  touchFile(filePath: string, waitForDiags?: boolean): Promise<void>;
  /** Get all accumulated diagnostics from all servers, keyed by normalized file path */
  getDiagnostics(): Record<string, Diagnostic[]>;
  /** Format a complete diagnostic output for a file after an edit/write operation */
  formatFileOutput(filePath: string, baseOutput: string): string;
  /** Format diagnostic output including other-file diagnostics (for writeFile) */
  formatFullOutput(targetFilePath: string, baseOutput: string): string;
  /** Shut down all active language servers */
  shutdown(): Promise<void>;
  /** Check if any servers are active */
  hasClients(): boolean;
}

declare global {
  var lspManagers: Map<string, LSPManager> | undefined;
}

export function getGlobalLSPManager(workspaceRoot: string): LSPManager {
  if (!global.lspManagers) {
    global.lspManagers = new Map();
  }
  
  const normalizedRoot = path.resolve(workspaceRoot).replace(/\\/g, "/").toLowerCase();
  
  if (!global.lspManagers.has(normalizedRoot)) {
    global.lspManagers.set(normalizedRoot, createLSPManager(workspaceRoot));
  }
  return global.lspManagers.get(normalizedRoot)!;
}

/**
 * Create an LSP manager for a given workspace root.
 * Lazily spawns language servers as files are touched.
 */
export function createLSPManager(workspaceRoot: string): LSPManager {
  const clients: LSPClientInfo[] = [];
  const broken = new Set<string>(); // server IDs that failed to spawn
  const spawning = new Map<string, Promise<LSPClientInfo | null>>(); // in-flight spawns

  /**
   * Get or spawn the LSP clients that handle the given file extension.
   */
  async function getClients(filePath: string): Promise<LSPClientInfo[]> {
    const extension = path.extname(filePath);
    if (!extension) return [];

    const result: LSPClientInfo[] = [];

    for (const serverConfig of ALL_SERVERS) {
      // Skip if this server doesn't handle this extension
      if (
        serverConfig.extensions.length > 0 &&
        !serverConfig.extensions.includes(extension)
      ) {
        continue;
      }

      // Check if this workspace is relevant for this server
      const root = serverConfig.findRoot(workspaceRoot);
      if (!root) continue;

      const key = root + ":" + serverConfig.id;

      // Skip broken servers
      if (broken.has(key)) continue;

      // Reuse existing client
      const existing = clients.find(
        (c) => c.root === root && c.serverID === serverConfig.id
      );
      if (existing) {
        result.push(existing);
        continue;
      }

      // Wait for in-flight spawn
      const inflight = spawning.get(key);
      if (inflight) {
        const client = await inflight;
        if (client) result.push(client);
        continue;
      }

      // Spawn new server
      const spawnPromise = spawnServer(serverConfig, root, key);
      spawning.set(key, spawnPromise);

      spawnPromise.finally(() => {
        if (spawning.get(key) === spawnPromise) {
          spawning.delete(key);
        }
      });

      const client = await spawnPromise;
      if (client) result.push(client);
    }

    return result;
  }

  /**
   * Spawn a single language server and create an LSP client for it.
   */
  async function spawnServer(
    serverConfig: ServerConfig,
    root: string,
    key: string
  ): Promise<LSPClientInfo | null> {
    try {
      const handle = serverConfig.spawn(root);
      if (!handle) {
        broken.add(key);
        return null;
      }

      log(`Spawned server: ${serverConfig.id} (root: ${root})`);

      const client = await createLSPClient({
        serverID: serverConfig.id,
        server: handle,
        root,
      });

      // Check if another spawn happened while we were initializing
      const existing = clients.find(
        (c) => c.root === root && c.serverID === serverConfig.id
      );
      if (existing) {
        await client.shutdown();
        return existing;
      }

      clients.push(client);
      return client;
    } catch (err) {
      log(`Failed to spawn ${serverConfig.id}:`, err);
      broken.add(key);
      return null;
    }
  }

  /**
   * Normalize a file path for consistent key usage.
   */
  function normalizePath(p: string): string {
    return path.resolve(p).replace(/\\/g, "/").toLowerCase();
  }

  return {
    async touchFile(
      filePath: string,
      waitForDiags: boolean = true
    ): Promise<void> {
      const absPath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(workspaceRoot, filePath);

      log(`Touching file: ${absPath}`);
      const matchingClients = await getClients(absPath);

      if (matchingClients.length === 0) {
        log(`No LSP servers available for: ${absPath}`);
        return;
      }

      await Promise.all(
        matchingClients.map(async (client) => {
          try {
            const waitPromise = waitForDiags
              ? client.waitForDiagnostics(absPath)
              : Promise.resolve();
            await client.notify.open(absPath);
            await waitPromise;
          } catch (err) {
            log(
              `[${client.serverID}] Error touching file ${absPath}:`,
              err
            );
          }
        })
      );
    },

    getDiagnostics(): Record<string, Diagnostic[]> {
      const result: Record<string, Diagnostic[]> = {};

      for (const client of clients) {
        for (const [filePath, diags] of client.diagnostics.entries()) {
          const existing = result[filePath] || [];
          existing.push(...diags);
          result[filePath] = existing;
        }
      }

      return result;
    },

    formatFileOutput(filePath: string, baseOutput: string): string {
      const diagnostics = this.getDiagnostics();
      const normalizedPath = normalizePath(filePath);

      const block = formatDiagnosticReport(
        filePath,
        diagnostics[normalizedPath] ?? []
      );

      if (block) {
        return `${baseOutput}\n\nLSP errors detected in this file, please fix:\n${block}`;
      }
      return baseOutput;
    },

    formatFullOutput(
      targetFilePath: string,
      baseOutput: string
    ): string {
      const diagnostics = this.getDiagnostics();
      const normalizedTarget = normalizePath(targetFilePath);
      let output = baseOutput;

      let projectDiagCount = 0;
      for (const [file, issues] of Object.entries(diagnostics)) {
        const isCurrent = file === normalizedTarget;
        if (!isCurrent && projectDiagCount >= MAX_PROJECT_DIAGNOSTICS_FILES) continue;

        const block = formatDiagnosticReport(
          isCurrent ? targetFilePath : file,
          issues
        );
        if (!block) continue;

        if (isCurrent) {
          output += `\n\nLSP errors detected in this file, please fix:\n${block}`;
        } else {
          projectDiagCount++;
          output += `\n\nLSP errors detected in other files:\n${block}`;
        }
      }

      return output;
    },

    async shutdown(): Promise<void> {
      log(`Shutting down ${clients.length} LSP server(s)...`);
      await Promise.all(
        clients.map((c) => c.shutdown().catch(() => {}))
      );
      clients.length = 0;
      broken.clear();
      spawning.clear();
      log("All LSP servers shut down");
    },

    hasClients(): boolean {
      return clients.length > 0;
    },
  };
}

// Re-export types for convenience
export type { Diagnostic, ServerConfig };
export { DiagnosticSeverity };
