const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { discoverCLIs } = require("./cli-discovery");
const mcpManager = require("./mcp-manager");
const registryManager = require("./registry-manager");
const credentialsManager = require("./credentials-manager");

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

// CLI discovery IPC handler
ipcMain.handle("discover-clis", async () => {
  return await discoverCLIs();
});

// MCP management IPC handlers
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
ipcMain.handle("registry:installSkill", async (event, skill) => {
  return await registryManager.installSkill(skill);
});

ipcMain.handle("registry:uninstallSkill", async (event, id) => {
  return await registryManager.uninstallSkill(id);
});

ipcMain.handle("registry:getInstalledSkills", async () => {
  return await registryManager.getInstalledSkills();
});

ipcMain.handle("registry:toggleSkill", async (event, id, enabled) => {
  return await registryManager.toggleSkill(id, enabled);
});

// Credentials IPC handlers
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
}

app.whenReady().then(createWindow);

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
