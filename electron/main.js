/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config();
const { app, BrowserWindow, ipcMain, dialog } = require("electron");

// ... (previous code)

ipcMain.handle("browse-files", async (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return await dialog.showOpenDialog(win, options || {
    properties: ["openFile", "multiSelections"]
  });
});
const path = require("path");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

// Configure logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";
log.info("App starting...");

const { discoverCLIs, findCommandPath } = require("./cli-discovery");
const mcpManager = require("./mcp-manager");
const registryManager = require("./registry-manager");
const credentialsManager = require("./credentials-manager");
const logsManager = require("./logs-manager");
const knowledgeManager = require("./knowledge-manager");
const { installCLI, startAgent, stopAgent, getAgentStatus } = require("./execution-manager");
const agentSession = require("./agent/session");
const modelsRegistry = require("./models-registry");

const isDev = !app.isPackaged;

// Window control IPC handlers
ipcMain.on("window-minimize", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});
ipcMain.on("window-maximize", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});
ipcMain.on("window-close", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

// Logs IPC handlers
ipcMain.handle("get-logs", async () => {
  return await logsManager.getLogs();
});

ipcMain.handle("clear-logs", async () => {
  return await logsManager.clearLogs();
});

ipcMain.handle("add-log", async (event, { level, source, message, details }) => {
  return await logsManager.addLog(level, source, message, details);
});

// CLI discovery IPC handler
ipcMain.handle("discover-clis", async () => {
  return await discoverCLIs();
});

ipcMain.handle("check-cli-installed", async (event, command) => {
  const path = await findCommandPath(command);
  return !!path;
});

// Execution IPC handlers
ipcMain.handle("install-cli", async (event, payload) => {
  return await installCLI(event, payload);
});

ipcMain.handle("start-agent", async (event, payload) => {
  return await startAgent(event, payload);
});

ipcMain.handle("stop-agent", async (event, id) => {
  return await stopAgent(event, id);
});

ipcMain.handle("get-agent-status", async (event, id) => {
  return await getAgentStatus(id);
});
ipcMain.handle("get-mcp-servers", async () => {
  return await mcpManager.getMcpServers();
});

ipcMain.handle("add-mcp-server", async (event, { id, config }) => {
  return await mcpManager.addMcpServer(id, config);
});

ipcMain.handle("remove-mcp-server", async (event, id) => {
  return await mcpManager.removeMcpServer(id);
});

ipcMain.handle("toggle-mcp-server", async (event, { id, enabled }) => {
  return await mcpManager.toggleMcpServer(id, enabled);
});

// Registry IPC handlers
ipcMain.handle("registry:fetchData", async (event, urlPair) => {
  return await registryManager.fetchRegistryData(urlPair);
});

ipcMain.handle("registry:installSkill", async (event, skill) => {
  return await registryManager.installSkill(skill);
});

ipcMain.handle("registry:uninstallSkill", async (event, id) => {
  return await registryManager.uninstallSkill(id);
});

ipcMain.handle("registry:installMcp", async (event, mcp) => {
  return await registryManager.installMcp(mcp);
});

ipcMain.handle("registry:uninstallMcp", async (event, id) => {
  return await registryManager.uninstallMcp(id);
});

ipcMain.handle("registry:getInstalledSkills", async () => {
  return await registryManager.getInstalledSkills();
});

ipcMain.handle("registry:getInstalledMcps", async () => {
  return await registryManager.getInstalledMcps();
});

ipcMain.handle("registry:toggleSkill", async (event, id, enabled) => {
  return await registryManager.toggleSkill(id, enabled);
});

// Credentials IPC handlers
ipcMain.handle("credentials:getAll", async () => {
  return await credentialsManager.getAllCredentials();
});

ipcMain.handle("credentials:save", async (event, { key, value }) => {
  return await credentialsManager.saveCredential(key, value);
});

ipcMain.handle("credentials:delete", async (event, key) => {
  return await credentialsManager.deleteCredential(key);
});

ipcMain.handle("branezo:get-all-credentials", async () => {
  return await credentialsManager.getAllCredentials();
});

ipcMain.handle("branezo:save-credential", async (event, key, value) => {
  return await credentialsManager.saveCredential(key, value);
});

ipcMain.handle("branezo:delete-credential", async (event, key) => {
  return await credentialsManager.deleteCredential(key);
});

ipcMain.handle("branezo:get-models-registry", async () => {
  return await modelsRegistry.getRegistry();
});

ipcMain.handle("credentials:getGithubToken", async () => {
  return await credentialsManager.getGithubToken();
});

ipcMain.handle("credentials:setGithubToken", async (event, token) => {
  return await credentialsManager.setGithubToken(token);
});

ipcMain.handle("credentials:getRegistryRepo", async () => {
  return await credentialsManager.getRegistryRepo();
});

ipcMain.handle("credentials:setRegistryRepo", async (event, repo) => {
  return await credentialsManager.setRegistryRepo(repo);
});

// Knowledge Base IPC handlers
ipcMain.handle("knowledge:listFiles", async () => {
  return await knowledgeManager.listFiles();
});

ipcMain.handle("knowledge:addFile", async (event, { name, content }) => {
  return await knowledgeManager.addFile(name, content);
});

ipcMain.handle("knowledge:addFileFromPath", async (event, sourcePath) => {
  return await knowledgeManager.addFileFromPath(sourcePath);
});

ipcMain.handle("knowledge:removeFile", async (event, name) => {
  return await knowledgeManager.removeFile(name);
});

ipcMain.handle("knowledge:getPath", () => {
  return knowledgeManager.KNOWLEDGE_DIR;
});

// BraneZO AI Agent IPC handlers
ipcMain.on("branezo:start-chat", async (event, payload) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  
  const onChunk = (text) => win.webContents.send(`branezo:chunk:${payload.id}`, text);
  const onToolCall = (call) => win.webContents.send(`branezo:tool-call:${payload.id}`, call);
  const onToolResult = (res) => win.webContents.send(`branezo:tool-result:${payload.id}`, res);
  const onFinish = (messages) => win.webContents.send(`branezo:finish:${payload.id}`, messages);
  const onError = (err) => win.webContents.send(`branezo:error:${payload.id}`, err.message || String(err));
  
  await agentSession.startChat(
    payload,
    onChunk,
    onToolCall,
    onToolResult,
    onFinish,
    onError
  );
});

ipcMain.on("branezo:abort-chat", (event, id) => {
  agentSession.abortChat(id);
});

// Auto-update IPC handlers
ipcMain.handle("check-for-updates", async () => {
  if (isDev) {
    return { status: "no-update", message: "Updates not available in development" };
  }
  return await autoUpdater.checkForUpdates();
});

ipcMain.on("restart-and-install", () => {
  autoUpdater.quitAndInstall(false, true);
});

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#0f0f0f",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../out/index.html"));
  }

  // Update event listeners
  autoUpdater.on("update-available", (info) => {
    mainWindow.webContents.send("update-available", info);
  });

  autoUpdater.on("update-not-available", () => {
    mainWindow.webContents.send("update-not-available");
  });

  autoUpdater.on("download-progress", (progress) => {
    mainWindow.webContents.send("update-download-progress", progress.percent);
  });

  autoUpdater.on("update-downloaded", (info) => {
    mainWindow.webContents.send("update-downloaded", info);
  });

  autoUpdater.on("error", (err) => {
    mainWindow.webContents.send("update-error", err.message);
  });
}

app.whenReady().then(() => {
  createWindow();
  
  // Check for updates on startup
  if (!isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 5000);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
