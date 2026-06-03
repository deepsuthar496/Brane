const fs = require("fs").promises;
const path = require("path");
const os = require("os");

const CLAUDE_CONFIG_PATH = path.join(os.homedir(), ".claude.json");
const CLAUDE_ALT_CONFIG_PATH = path.join(os.homedir(), ".claude", "mcp.json");

/**
 * Reads the Claude configuration file.
 * Returns an empty object if the file doesn't exist.
 */
async function readClaudeConfig(configPath = CLAUDE_CONFIG_PATH) {
  try {
    const data = await fs.readFile(configPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

/**
 * Writes the Claude configuration file.
 */
async function writeClaudeConfig(config, configPath = CLAUDE_CONFIG_PATH) {
  try {
    // Ensure directory exists for alt path
    if (configPath === CLAUDE_ALT_CONFIG_PATH) {
        await fs.mkdir(path.dirname(configPath), { recursive: true });
    }
    
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
  } catch (error) {
    console.error(`Claude Manager: Failed to write to ${configPath}:`, error.message);
  }
}

/**
 * Adds an MCP server to Claude's configuration.
 */
async function addMcpServer(id, config) {
  const paths = [CLAUDE_CONFIG_PATH, CLAUDE_ALT_CONFIG_PATH];
  let success = false;

  for (const configPath of paths) {
    try {
      const data = await readClaudeConfig(configPath);
      if (!data.mcpServers) data.mcpServers = {};
      
      data.mcpServers[id] = {
        command: config.command || (config.url ? "npx" : undefined),
        args: config.args || (config.url ? ["-y", config.url] : []),
        env: config.env || {}
      };

      await writeClaudeConfig(data, configPath);
      success = true;
    } catch (err) {
      console.error(`Claude Manager: Error adding server to ${configPath}:`, err.message);
    }
  }
  return success;
}

/**
 * Removes an MCP server from Claude's configuration.
 */
async function removeMcpServer(id) {
  const paths = [CLAUDE_CONFIG_PATH, CLAUDE_ALT_CONFIG_PATH];
  let removed = false;

  for (const configPath of paths) {
    try {
      const data = await readClaudeConfig(configPath);
      if (data.mcpServers && data.mcpServers[id]) {
        delete data.mcpServers[id];
        await writeClaudeConfig(data, configPath);
        removed = true;
      }
    } catch (err) {
      console.error(`Claude Manager: Error removing server from ${configPath}:`, err.message);
    }
  }
  return removed;
}

module.exports = {
  addMcpServer,
  removeMcpServer,
  CLAUDE_CONFIG_PATH,
  CLAUDE_ALT_CONFIG_PATH
};
