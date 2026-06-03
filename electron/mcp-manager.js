const fs = require("fs").promises;
const path = require("path");
const os = require("os");

const SETTINGS_PATH = path.join(os.homedir(), ".gemini", "settings.json");

async function readSettings() {
  try {
    const data = await fs.readFile(SETTINGS_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function writeSettings(settings) {
  const tmpPath = `${SETTINGS_PATH}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(settings, null, 2), "utf-8");
  await fs.rename(tmpPath, SETTINGS_PATH);
}

async function getMcpServers() {
  const settings = await readSettings();
  if (!settings.mcpServers) settings.mcpServers = {};
  if (!settings.brane_disabled_mcp_servers) settings.brane_disabled_mcp_servers = {};
  
  let needsSave = false;
  const builtInPath = path.join(__dirname, "knowledge-mcp-server-entry.js");
  
  // Migration: Move legacy 'disabled' key to separate storage
  for (const [id, config] of Object.entries(settings.mcpServers)) {
    if (config && config.disabled === true) {
      delete config.disabled;
      settings.brane_disabled_mcp_servers[id] = config;
      delete settings.mcpServers[id];
      needsSave = true;
    } else if (config && config.disabled === false) {
      delete config.disabled;
      needsSave = true;
    }
  }

  // Ensure built-in is present (either enabled or disabled)
  if (!settings.mcpServers["brane-knowledge"] && !settings.brane_disabled_mcp_servers["brane-knowledge"]) {
    settings.mcpServers["brane-knowledge"] = {
      type: "stdio",
      command: "node",
      args: [builtInPath],
      env: {}
    };
    needsSave = true;
  } else {
    // Check for upgrades in both locations
    for (const location of [settings.mcpServers, settings.brane_disabled_mcp_servers]) {
      const config = location["brane-knowledge"];
      if (config && (config.name || config.isBuiltIn || !config.type)) {
        location["brane-knowledge"] = {
          type: "stdio",
          command: "node",
          args: [builtInPath],
          env: config.env || {}
        };
        needsSave = true;
      }
    }
  }

  if (needsSave) {
    await writeSettings(settings);
  }

  const enabledServers = Object.entries(settings.mcpServers).map(([id, config]) => ({
    id,
    name: config.name || (id === "brane-knowledge" ? "Brane Knowledge MCP" : id),
    enabled: true,
    isBuiltIn: id === "brane-knowledge" || config.isBuiltIn === true,
    description: config.description || (id === "brane-knowledge" ? "Built-in MCP server for the Global Knowledge Base." : ""),
    ...config
  }));

  const disabledServers = Object.entries(settings.brane_disabled_mcp_servers).map(([id, config]) => ({
    id,
    name: config.name || (id === "brane-knowledge" ? "Brane Knowledge MCP" : id),
    enabled: false,
    isBuiltIn: id === "brane-knowledge" || config.isBuiltIn === true,
    description: config.description || (id === "brane-knowledge" ? "Built-in MCP server for the Global Knowledge Base." : ""),
    ...config
  }));

  return [...enabledServers, ...disabledServers];
}

async function addMcpServer(id, config) {
  const settings = await readSettings();
  if (!settings.mcpServers) settings.mcpServers = {};
  if (!settings.brane_disabled_mcp_servers) settings.brane_disabled_mcp_servers = {};
  
  // If it was disabled, remove from disabled list
  delete settings.brane_disabled_mcp_servers[id];
  
  settings.mcpServers[id] = config;
  await writeSettings(settings);
  return { id, enabled: true, ...config };
}

async function removeMcpServer(id) {
  const settings = await readSettings();
  let removed = false;
  
  if (settings.mcpServers && settings.mcpServers[id]) {
    delete settings.mcpServers[id];
    removed = true;
  }
  
  if (settings.brane_disabled_mcp_servers && settings.brane_disabled_mcp_servers[id]) {
    delete settings.brane_disabled_mcp_servers[id];
    removed = true;
  }
  
  if (removed) {
    await writeSettings(settings);
  }
  return removed;
}

// Note: Gemini CLI doesn't natively support disabling a server in settings.json 
// other than removing it. We simulate 'disabled' by moving it to 
// 'brane_disabled_mcp_servers' top-level key.
async function toggleMcpServer(id, enabled) {
    const settings = await readSettings();
    if (!settings.mcpServers) settings.mcpServers = {};
    if (!settings.brane_disabled_mcp_servers) settings.brane_disabled_mcp_servers = {};
    
    if (enabled) {
      // Enable: Move from disabled to enabled
      if (settings.brane_disabled_mcp_servers[id]) {
        settings.mcpServers[id] = settings.brane_disabled_mcp_servers[id];
        delete settings.brane_disabled_mcp_servers[id];
      } else if (!settings.mcpServers[id]) {
        // If not found at all and it's built-in, create it
        if (id === "brane-knowledge") {
          const builtInPath = path.join(__dirname, "knowledge-mcp-server-entry.js");
          settings.mcpServers[id] = {
            type: "stdio",
            command: "node",
            args: [builtInPath],
            env: {}
          };
        } else {
          return false;
        }
      }
    } else {
      // Disable: Move from enabled to disabled
      if (settings.mcpServers[id]) {
        settings.brane_disabled_mcp_servers[id] = settings.mcpServers[id];
        delete settings.mcpServers[id];
      } else if (settings.brane_disabled_mcp_servers[id]) {
        // Already disabled
      } else {
        return false;
      }
    }
    
    await writeSettings(settings);
    return true;
}

module.exports = {
  getMcpServers,
  addMcpServer,
  removeMcpServer,
  toggleMcpServer
};
