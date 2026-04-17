const fs = require("fs").promises;
const path = require("path");
const os = require("os");
const { listFiles } = require("./knowledge-manager");

/**
 * Handles automatic injection of the Brane Knowledge MCP server
 * into various agent configuration files.
 */

const CLAUDE_CONFIG_PATH = path.join(os.homedir(), ".claude.json");
// Some versions use this path
const CLAUDE_ALT_CONFIG_PATH = path.join(os.homedir(), ".claude", "mcp.json");

async function injectKnowledgeMcp() {
  const files = await listFiles();
  if (files.length === 0) return; // Don't inject if no files exist

  const serverEntry = path.join(__dirname, "knowledge-mcp-server-entry.js");
  const nodePath = process.execPath; // Use the same node version as Electron

  const mcpConfig = {
    command: nodePath,
    args: [serverEntry],
    env: {
      BRANE_KNOWLEDGE_BASE: "active"
    }
  };

  // 1. Inject into Claude Code
  await updateConfig(CLAUDE_CONFIG_PATH, "brane-knowledge", mcpConfig);
  await updateConfig(CLAUDE_ALT_CONFIG_PATH, "brane-knowledge", mcpConfig);
  
  // Note: For Gemini CLI, it typically reads from ~/.gemini/settings.json 
  // but it's often better to pass --mcp flag during startAgent.
}

async function updateConfig(configPath, id, config) {
  try {
    let data = {};
    try {
      const content = await fs.readFile(configPath, "utf-8");
      data = JSON.parse(content);
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }

    if (!data.mcpServers) data.mcpServers = {};
    
    // Only update if changed or missing to avoid unnecessary writes
    const current = JSON.stringify(data.mcpServers[id]);
    const next = JSON.stringify(config);
    
    if (current !== next) {
      data.mcpServers[id] = config;
      await fs.writeFile(configPath, JSON.stringify(data, null, 2), "utf-8");
      console.log(`Auto-injected MCP server into ${configPath}`);
    }
  } catch (err) {
    console.error(`Failed to update config at ${configPath}:`, err.message);
  }
}

module.exports = {
  injectKnowledgeMcp
};
