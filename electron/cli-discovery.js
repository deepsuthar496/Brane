const { exec } = require("child_process");
const { promisify } = require("util");
const path = require("path");
const execAsync = promisify(exec);

const KNOWN_CLIS = [
  {
    id: "claude",
    name: "Claude Code",
    command: "claude",
    provider: "@anthropic",
    icon: "🤖",
    colorClass: "claude",
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    command: "gemini",
    provider: "@google",
    icon: "✨",
    colorClass: "gemini",
  },
  {
    id: "cursor",
    name: "Cursor",
    command: "cursor",
    provider: "@cursor",
    icon: "🖱️",
    colorClass: "cursor",
  },
  {
    id: "codex",
    name: "Codex CLI",
    command: "codex",
    provider: "@openai",
    icon: "📦",
    colorClass: "codex",
  },
  {
    id: "aider",
    name: "Aider",
    command: "aider",
    provider: "aider.chat",
    icon: "🚀",
    colorClass: "aider",
  },
  {
    id: "ollama",
    name: "Ollama",
    command: "ollama",
    provider: "ollama.ai",
    icon: "🦙",
    colorClass: "ollama",
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    command: "openclaw",
    provider: "community",
    icon: "🦀",
    colorClass: "openclaw",
  },
];

async function findCommandPath(command) {
  // Add common Windows npm paths to the search if they aren't in PATH
  const additionalPaths = [];
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || "";
    const localAppData = process.env.LOCALAPPDATA || "";
    
    // npm global
    additionalPaths.push(path.join(appData, "npm"));
    // pnpm global
    additionalPaths.push(path.join(localAppData, "pnpm"));
    // yarn global
    additionalPaths.push(path.join(appData, "Yarn", "bin"));
  }

  const checkCmd = process.platform === "win32" ? `where ${command}` : `which ${command}`;
  
  // Try standard search
  try {
    const { stdout } = await execAsync(checkCmd);
    const lines = stdout.trim().split(/\r?\n/);
    if (lines.length > 0) {
      if (process.platform === "win32") {
        const preferred = lines.find(l => l.toLowerCase().endsWith(".cmd") || l.toLowerCase().endsWith(".exe"));
        if (preferred) return preferred.trim();
      }
      return lines[0].trim();
    }
  } catch {
    // If standard search fails, try our additional paths manually
    if (process.platform === "win32") {
      for (const basePath of additionalPaths) {
        const fullPath = path.join(basePath, `${command}.cmd`);
        try {
          const fs = require("fs");
          if (fs.existsSync(fullPath)) {
            return fullPath;
          }
        } catch {}
      }
    }
  }
  return null;
}

async function getCommandVersion(fullPath) {
  try {
    // Use quotes around path to handle spaces
    const { stdout } = await execAsync(`"${fullPath}" --version`);
    return stdout.trim().split(/\r?\n/)[0];
  } catch {
    try {
        const { stdout } = await execAsync(`"${fullPath}" -v`);
        return stdout.trim().split(/\r?\n/)[0];
    } catch {
        return "v?.?.?"; // Return a placeholder instead of failing discovery
    }
  }
}

async function discoverCLIs() {
  const discovered = [];
  for (const cli of KNOWN_CLIS) {
    try {
      const fullPath = await findCommandPath(cli.command);
      if (fullPath) {
        const version = await getCommandVersion(fullPath);
        discovered.push({
          ...cli,
          version,
          status: "stopped",
          mcps: 0,
          skills: 0,
          flags: 0,
          tags: [],
          fullPath,
          discovered: true,
        });
      }
    } catch (e) {
      console.error(`Error discovering ${cli.command}:`, e);
    }
  }
  return discovered;
}

module.exports = { discoverCLIs, findCommandPath };
