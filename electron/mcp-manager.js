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
  const servers = settings.mcpServers || {};
  // Transform into a frontend-friendly array
  return Object.entries(servers).map(([id, config]) => ({
    id,
    name: id,
    enabled: true, // Gemini CLI doesn't have an 'enabled' flag per server yet, but we'll manage it
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
    if (!settings.mcpServers || !settings.mcpServers[id]) return false;
    
    // For now, let's use a custom property and hope the CLI ignores it.
    // If the CLI crashes, we will have to move it to a different key.
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
