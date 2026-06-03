/**
 * Language server spawn configurations.
 * Each server defines how to find and spawn its binary,
 * which file extensions it handles, and how to detect its project root.
 */
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import path from "path";
import fs from "fs";

const log = (...args: any[]) => console.log("[LSP:Server]", ...args);

/**
 * Get Brane's own installation root (where Brane's package.json / node_modules live).
 * Uses __dirname to walk up from the compiled output to the project root.
 */
function getBraneRoot(): string {
  // In Next.js, __dirname points to something like:
  //   <project>/.next/server/app/api/... or similar
  // We walk up until we find a directory with node_modules
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    if (fileExists(path.join(dir, "node_modules", ".bin"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: use process.cwd() which is the Brane project root during dev
  return process.cwd();
}

/** Result of spawning a language server */
export interface ServerHandle {
  process: ChildProcessWithoutNullStreams;
  initialization?: Record<string, any>;
}

/** Configuration for a single language server */
export interface ServerConfig {
  id: string;
  extensions: string[];
  /** Detect the project root for this server. Returns null if not applicable. */
  findRoot(workspaceRoot: string): string | null;
  /** Spawn the server process. Returns null if the binary isn't available. */
  spawn(root: string): ServerHandle | null;
}

/**
 * Find a binary on the system PATH.
 * Returns the full path or null if not found.
 */
function which(command: string): string | null {
  const isWindows = process.platform === "win32";
  const pathEnv = process.env.PATH || "";
  const pathDirs = pathEnv.split(isWindows ? ";" : ":");
  const extensions = isWindows ? [".exe", ".cmd", ".bat", ""] : [""];

  for (const dir of pathDirs) {
    for (const ext of extensions) {
      const fullPath = path.join(dir, command + ext);
      try {
        fs.accessSync(fullPath, fs.constants.X_OK);
        return fullPath;
      } catch {
        // not found here, continue
      }
    }
  }
  return null;
}

/**
 * Check if a file exists synchronously.
 */
function fileExists(p: string): boolean {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Find a binary by checking:
 *  1. The user's project node_modules/.bin/
 *  2. Brane's own node_modules/.bin/
 *  3. System PATH
 */
function findBinary(command: string, projectRoot: string): string | null {
  const ext = process.platform === "win32" ? ".cmd" : "";

  // 1. User's project local bin
  const localBin = path.join(projectRoot, "node_modules", ".bin", command + ext);
  if (fileExists(localBin)) {
    log(`Found ${command} in project: ${localBin}`);
    return localBin;
  }

  // 2. Brane's own node_modules
  const braneRoot = getBraneRoot();
  const braneBin = path.join(braneRoot, "node_modules", ".bin", command + ext);
  if (fileExists(braneBin)) {
    log(`Found ${command} in Brane: ${braneBin}`);
    return braneBin;
  }

  // 3. System PATH
  const globalBin = which(command);
  if (globalBin) {
    log(`Found ${command} on PATH: ${globalBin}`);
    return globalBin;
  }

  return null;
}

/**
 * Spawn a child process with stdio pipes for LSP communication.
 */
function spawnLSP(
  command: string,
  args: string[] = [],
  cwd?: string
): ChildProcessWithoutNullStreams {
  const proc = spawn(command, args, {
    cwd,
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env },
    shell: process.platform === "win32",
  });

  proc.stderr?.on("data", (data: Buffer) => {
    // Log stderr but don't crash — many LSP servers emit info to stderr
    const msg = data.toString().trim();
    if (msg) log(`[stderr] ${msg.slice(0, 200)}`);
  });

  return proc;
}

// ─── TypeScript Language Server ───────────────────────────────────────────────

export const TypescriptServer: ServerConfig = {
  id: "typescript",
  extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"],

  findRoot(workspaceRoot: string): string | null {
    // Like OpenCode's NearestRoot, ALWAYS fall back to workspace root.
    // TypeScript/JavaScript is ubiquitous — we should always try to serve it.
    const markers = [
      "package-lock.json",
      "bun.lockb",
      "bun.lock",
      "pnpm-lock.yaml",
      "yarn.lock",
      "package.json",
      "tsconfig.json",
    ];
    for (const marker of markers) {
      if (fileExists(path.join(workspaceRoot, marker))) {
        log(`[typescript] findRoot: found ${marker} in ${workspaceRoot}`);
        return workspaceRoot;
      }
    }
    // Fallback: always return workspace root (matches OpenCode behavior)
    log(`[typescript] findRoot: no marker found, falling back to ${workspaceRoot}`);
    return workspaceRoot;
  },

  spawn(root: string): ServerHandle | null {
    log(`[typescript] spawn: looking for typescript-language-server binary...`);
    const braneRoot = getBraneRoot();
    log(`[typescript] spawn: Brane root resolved to: ${braneRoot}`);
    const bin = findBinary("typescript-language-server", root);

    if (!bin) {
      log(
        "typescript-language-server not found anywhere. Install it: npm i -g typescript-language-server typescript"
      );
      return null;
    }

    // Find tsserver.js — check user's project first, then Brane's own
    let tsserverPath = path.join(root, "node_modules", "typescript", "lib", "tsserver.js");
    if (!fileExists(tsserverPath)) {
      log(`[typescript] spawn: tsserver not in project, checking Brane root...`);
      tsserverPath = path.join(braneRoot, "node_modules", "typescript", "lib", "tsserver.js");
    }
    log(`[typescript] spawn: tsserver.js at: ${tsserverPath} (exists: ${fileExists(tsserverPath)})`);

    log(`Spawning TypeScript LSP: ${bin} --stdio (root: ${root})`);
    const proc = spawnLSP(bin, ["--stdio"], root);

    return {
      process: proc,
      initialization: fileExists(tsserverPath)
        ? { tsserver: { path: tsserverPath } }
        : undefined,
    };
  },
};

// ─── Pyright Language Server ──────────────────────────────────────────────────

export const PyrightServer: ServerConfig = {
  id: "pyright",
  extensions: [".py", ".pyi"],

  findRoot(workspaceRoot: string): string | null {
    const markers = [
      "pyproject.toml",
      "setup.py",
      "setup.cfg",
      "requirements.txt",
      "Pipfile",
      "pyrightconfig.json",
    ];
    for (const marker of markers) {
      if (fileExists(path.join(workspaceRoot, marker))) {
        return workspaceRoot;
      }
    }
    return null;
  },

  spawn(root: string): ServerHandle | null {
    let bin = which("pyright-langserver");
    if (!bin) {
      // Try npx-style basescript
      bin = which("pyright");
      if (bin) {
        // pyright CLI can act as a language server with --langserver flag
        // but the dedicated pyright-langserver is preferred
        log(
          "pyright-langserver not found, but pyright CLI is available. Install pyright-langserver for LSP support."
        );
        return null;
      }
      log("pyright not found. Install it: npm i -g pyright");
      return null;
    }

    log(`Spawning Pyright LSP: ${bin} --stdio (root: ${root})`);
    const proc = spawnLSP(bin, ["--stdio"], root);

    // Check for virtual environment
    const initialization: Record<string, any> = {};
    const venvPaths = [
      process.env["VIRTUAL_ENV"],
      path.join(root, ".venv"),
      path.join(root, "venv"),
    ].filter((p): p is string => !!p);

    for (const venvPath of venvPaths) {
      const isWindows = process.platform === "win32";
      const pythonPath = isWindows
        ? path.join(venvPath, "Scripts", "python.exe")
        : path.join(venvPath, "bin", "python");
      if (fileExists(pythonPath)) {
        initialization["pythonPath"] = pythonPath;
        break;
      }
    }

    return { process: proc, initialization };
  },
};

// ─── Go Language Server (gopls) ───────────────────────────────────────────────

export const GoplsServer: ServerConfig = {
  id: "gopls",
  extensions: [".go"],

  findRoot(workspaceRoot: string): string | null {
    if (
      fileExists(path.join(workspaceRoot, "go.mod")) ||
      fileExists(path.join(workspaceRoot, "go.sum")) ||
      fileExists(path.join(workspaceRoot, "go.work"))
    ) {
      return workspaceRoot;
    }
    return null;
  },

  spawn(root: string): ServerHandle | null {
    const bin = which("gopls");
    if (!bin) {
      log(
        "gopls not found. Install it: go install golang.org/x/tools/gopls@latest"
      );
      return null;
    }

    log(`Spawning gopls LSP: ${bin} (root: ${root})`);
    const proc = spawnLSP(bin, [], root);
    return { process: proc };
  },
};

// ─── Rust Analyzer ────────────────────────────────────────────────────────────

export const RustAnalyzerServer: ServerConfig = {
  id: "rust-analyzer",
  extensions: [".rs"],

  findRoot(workspaceRoot: string): string | null {
    if (
      fileExists(path.join(workspaceRoot, "Cargo.toml")) ||
      fileExists(path.join(workspaceRoot, "Cargo.lock"))
    ) {
      return workspaceRoot;
    }
    return null;
  },

  spawn(root: string): ServerHandle | null {
    const bin = which("rust-analyzer");
    if (!bin) {
      log(
        "rust-analyzer not found. Install it via rustup: rustup component add rust-analyzer"
      );
      return null;
    }

    log(`Spawning rust-analyzer LSP: ${bin} (root: ${root})`);
    const proc = spawnLSP(bin, [], root);
    return { process: proc };
  },
};

// ─── All Servers ──────────────────────────────────────────────────────────────

/** All available server configurations */
export const ALL_SERVERS: ServerConfig[] = [
  TypescriptServer,
  PyrightServer,
  GoplsServer,
  RustAnalyzerServer,
];
