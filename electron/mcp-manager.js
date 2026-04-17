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
  
  let needsSave = false;
  const builtInPath = path.join(__dirname, "knowledge-mcp-server-entry.js");
  
  if (!settings.mcpServers["brane-knowledge"]) {
    settings.mcpServers["brane-knowledge"] = {
      type: "stdio",
      command: "node",
      args: [builtInPath],
      env: {}
    };
    needsSave = true;
  } else if (settings.mcpServers["brane-knowledge"].name || settings.mcpServers["brane-knowledge"].isBuiltIn || !settings.mcpServers["brane-knowledge"].type) {
    // Upgrade existing config to new standard
    settings.mcpServers["brane-knowledge"] = {
      type: "stdio",
      command: "node",
      args: [builtInPath],
      env: settings.mcpServers["brane-knowledge"].env || {}
    };
    needsSave = true;
  }

  if (needsSave) {
    await writeSettings(settings);
  }

  const servers = settings.mcpServers;
  // Transform into a frontend-friendly array
  return Object.entries(servers).map(([id, config]) => ({
    id,
    name: config.name || (id === "brane-knowledge" ? "Brane Knowledge MCP" : id),
    enabled: config.disabled !== true,
    isBuiltIn: id === "brane-knowledge" || config.isBuiltIn === true,
    description: config.description || (id === "brane-knowledge" ? "Built-in MCP server for the Global Knowledge Base." : ""),
    ...config
  }));
}

async function addMcpServer(id, config) {
  const settings = await readSettings();
  if (!settings.mcpServers) {
    settings.mcpServers = {};
  }
  settings.mcpServers[id] = config;
  await writeSettings(settings);
  return { id, ...config };
}

async function removeMcpServer(id) {
  const settings = await readSettings();
  if (settings.mcpServers && settings.mcpServers[id]) {
    delete settings.mcpServers[id];
    await writeSettings(settings);
    return true;
  }
  return false;
}

// Note: Gemini CLI doesn't natively support disabling a server in settings.json 
// other than removing it. We could simulate 'disabled' by moving it to 
// an 'mcpServers_disabled' key or adding a custom 'disabled' property 
// if the CLI ignores unknown properties.
async function toggleMcpServer(id, enabled) {
    const settings = await readSettings();
    if (!settings.mcpServers) settings.mcpServers = {};
    
    if (!settings.mcpServers[id]) {
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
    
    settings.mcpServers[id].disabled = !enabled;
    await writeSettings(settings);
    return true;
}

module.exports = {
  getMcpServers,
  addMcpServer,
  removeMcpServer,
  toggleMcpServer
};
