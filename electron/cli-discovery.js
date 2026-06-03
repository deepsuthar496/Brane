const { exec } = require("child_process");
const { promisify } = require("util");
const path = require("path");
const fs = require("fs");
const execAsync = promisify(exec);

const KNOWN_CLIS = [
  {
    id: "claude",
    name: "Claude Code",
    command: "claude",
    provider: "@anthropic",
    icon: "models-dev:anthropic",
    colorClass: "claude",
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    command: "gemini",
    provider: "@google",
    icon: "models-dev:google",
    colorClass: "gemini",
  },
  {
    id: "codex",
    name: "Codex CLI",
    command: "codex",
    provider: "@openai",
    icon: "models-dev:openai",
    colorClass: "codex",
  },
];

async function findCommandPath(command) {
  // Add common paths to the search if they aren't in PATH
  const additionalPaths = [];
  const home = process.env.USERPROFILE || process.env.HOME || "";

  if (process.platform === "win32") {
    const appData = process.env.APPDATA || "";
    const localAppData = process.env.LOCALAPPDATA || "";
    
    // npm, pnpm, yarn
    additionalPaths.push(path.join(appData, "npm"));
    additionalPaths.push(path.join(localAppData, "pnpm"));
    additionalPaths.push(path.join(appData, "Yarn", "bin"));
    
    // Local bin folders (common for custom scripts)
    additionalPaths.push(path.join(home, ".local", "bin"));
    additionalPaths.push(path.join(home, "bin"));
    additionalPaths.push(path.join(home, "AppData", "Local", "bin"));
  } else {
    // Unix-like common paths
    additionalPaths.push("/usr/local/bin");
    additionalPaths.push("/usr/bin");
    additionalPaths.push(path.join(home, ".local", "bin"));
    additionalPaths.push(path.join(home, "bin"));
    additionalPaths.push(path.join(home, ".npm-global", "bin"));
  }

  const checkCmd = process.platform === "win32" ? `where ${command}` : `which ${command}`;
  
  // Try standard search
  try {
    const { stdout } = await execAsync(checkCmd);
    const lines = stdout.trim().split(/\r?\n/);
    if (lines.length > 0) {
      if (process.platform === "win32") {
        // Prefer standard executable formats on Windows
        const preferred = lines.find(l => {
          const lower = l.toLowerCase();
          return lower.endsWith(".cmd") || lower.endsWith(".exe") || lower.endsWith(".bat") || lower.endsWith(".ps1");
        });
        if (preferred) return preferred.trim();
      }
      return lines[0].trim();
    }
  } catch {
    // If standard search fails, try our additional paths manually
    const fs = require("fs");
    const extensions = process.platform === "win32" ? [".cmd", ".exe", ".bat", ".ps1", ""] : [""];
    
    for (const basePath of additionalPaths) {
      for (const ext of extensions) {
        const fullPath = path.join(basePath, `${command}${ext}`);
        try {
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

const registryManager = require("./registry-manager");

async function discoverCLIs() {
  const discovered = [];
  
  // 1. Get registry-driven CLIs first
  let registryAgents = [];
  try {
    const repo = await configManager.getRegistryRepo();
    const urlPair = {
      cdn: `https://cdn.jsdelivr.net/gh/${repo}@main/agentstore/index.json`,
      fallback: `https://raw.githubusercontent.com/${repo}/main/agentstore/index.json`
    };
    const registry = await registryManager.fetchRegistryData(urlPair);
    if (registry && registry.agents) {
      registryAgents = registry.agents.map(a => ({
        id: a.id,
        name: a.name,
        command: a.command || a.id,
        provider: a.developer || "community",
        icon: a.icon || "lucide:terminal",
        colorClass: a.category || "community"
      }));
    }
  } catch (e) {
    console.warn("[Discovery] Failed to fetch registry index:", e.message);
  }

  // 2. Merge with hardcoded known CLIs (de-duplicate by ID)
  const combinedList = [...KNOWN_CLIS];
  for (const regAgent of registryAgents) {
    if (!combinedList.find(k => k.id === regAgent.id)) {
      combinedList.push(regAgent);
    }
  }

  // 3. Scan for every agent in the combined list
  const ALLOWED_AGENTS = ["claude", "gemini", "codex"];
  
  for (const cli of combinedList) {
    if (!ALLOWED_AGENTS.includes(cli.id)) {
      continue;
    }
    
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
