/* eslint-disable @typescript-eslint/no-require-imports */
const Sentry = require("@sentry/electron/main");

let crashReportsEnabled = true;

Sentry.init({
  dsn: "https://16018e156076eb0a324e6c8b8bc67075@o4509508323311616.ingest.us.sentry.io/4511473603903489",
  sendDefaultPii: false,
  beforeSend(event) {
    if (!crashReportsEnabled) return null; // Drop event if disabled by user
    
    if (event.exception && event.exception.values) {
      const os = require('os');
      const homedir = os.homedir();
      // Escape backslashes for Windows paths in regex
      const escapedHomedir = homedir.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const homeRegex = new RegExp(escapedHomedir, 'g');
      
      event.exception.values.forEach(value => {
        if (value.value) {
          value.value = value.value.replace(homeRegex, "[USER_PATH]");
        }
      });
    }
    return event;
  },
});

require("dotenv").config();
const { app, BrowserWindow, ipcMain, dialog, shell, nativeImage, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

// GitHub Token configuration is loaded dynamically for agents and APIs to avoid polluting process.env, which prevents electron-updater from crashing on public repos.


const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

// Configure logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";
autoUpdater.forceDevUpdateConfig = true;
autoUpdater.allowPrerelease = true;
log.info("App starting...");

const { discoverCLIs, findCommandPath } = require("./cli-discovery");
const mcpManager = require("./mcp-manager");
const configManager = require("./config-manager");
const registryManager = require("./registry-manager");
const logsManager = require("./logs-manager");
const knowledgeManager = require("./knowledge-manager");
const filesManager = require("./files-manager");
const oauthManager = require("./oauth-manager");
const { installCLI, abortInstall, startAgent, stopAgent, sendAgentInput, resizeAgent, getAgentStatus } = require("./execution-manager");
const { setupCliFlagsManager } = require("./cli-flags-manager");

const isDev = !app.isPackaged;

// CRITICAL: Set App ID for Windows taskbar grouping BEFORE window creation
if (process.platform === "win32") {
  app.setAppUserModelId(isDev ? process.execPath : "com.agenthub.app");
}

setupCliFlagsManager(ipcMain, configManager);

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

ipcMain.handle("browse-files", async (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return await dialog.showOpenDialog(win, options || {
    properties: ["openFile", "multiSelections"]
  });
});
ipcMain.handle("open-external", async (event, url) => {
  return await shell.openExternal(url);
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

ipcMain.handle("abort-install", async (event, id) => {
  return await abortInstall(event, id);
});

ipcMain.handle("start-agent", async (event, payload) => {
  let { id, command, cols, rows } = payload;
  
  // Fetch enabled flags for this agent
  try {
    const allFlags = await configManager.get('agentFlags') || {};
    const enabledFlags = allFlags[id] || {};
    const flagsString = Object.entries(enabledFlags)
      .filter(([_, enabled]) => enabled)
      .map(([name, _]) => name)
      .join(' ');
      
    if (flagsString) {
      command = `${command} ${flagsString}`;
    }
  } catch (err) {
    console.error(`Main: Failed to append flags to agent ${id}:`, err.message);
  }

  return await startAgent(event, { id, command, cwd: payload.cwd, cols, rows });
});

ipcMain.handle("send-agent-input", async (event, payload) => {
  return await sendAgentInput(event, payload);
});

ipcMain.handle("resize-agent", async (event, payload) => {
  return await resizeAgent(event, payload);
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

// Config IPC handlers
ipcMain.handle("config:getGithubToken", async () => {
  return await configManager.getGithubToken();
});

ipcMain.handle("config:setGithubToken", async (event, token) => {
  return await configManager.setGithubToken(token);
});

ipcMain.handle("config:setCrashReportsEnabled", async (event, enabled) => {
  crashReportsEnabled = enabled;
  return await configManager.set("crashReportsEnabled", enabled);
});

ipcMain.handle("sentry:test-main-error", async () => {
  const Sentry = require("@sentry/electron/main");
  Sentry.captureMessage("Sentry Integration Test: Main Process", "info");
  return true;
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

ipcMain.handle("registry:installMcp", async (event, mcp, targets) => {
  return await registryManager.installMcp(mcp, targets);
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

ipcMain.handle("registry:toggleSkill", async (event, { id, enabled }) => {
  return await registryManager.toggleSkill(id, enabled);
});

// Generic Fetch to bypass CORS
ipcMain.handle("fetch-url", async (event, url) => {
  try {
    const token = await configManager.getGithubToken();
    const isGithubRaw = url.includes('raw.githubusercontent.com');
    
    const options = {
      headers: {
        'User-Agent': 'Brane-Desktop-App',
        'Accept': 'application/json, text/plain, */*'
      }
    };
    
    let fetchUrl = url;

    if (token) {
      options.headers['Authorization'] = `Bearer ${token.trim()}`;
      
      if (isGithubRaw) {
        // Convert https://raw.githubusercontent.com/user/repo/main/path/to/file
        // to https://api.github.com/repos/user/repo/contents/path/to/file?ref=main
        const match = url.match(/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)$/);
        if (match) {
          const [, owner, repo, branch, filePath] = match;
          fetchUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
          options.headers['Accept'] = 'application/vnd.github.v3.raw';
        }
      }
    }

    const response = await fetch(fetchUrl, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${fetchUrl}`);
    const data = await response.text();
    return data;
  } catch (err) {
    console.error(`Main: Failed to fetch ${url}:`, err.message);
    throw err;
  }
});

// Knowledge Base IPC handlers
ipcMain.handle("knowledge:listFiles", async () => {
  return await knowledgeManager.listFiles();
});

ipcMain.handle("knowledge:addFile", async (event, { name, content, collection }) => {
  return await knowledgeManager.addFile(name, content, collection);
});

ipcMain.handle("knowledge:addFileFromPath", async (event, { path, collection }) => {
  return await knowledgeManager.addFileFromPath(path, collection);
});

ipcMain.handle("knowledge:removeFile", async (event, name, collection) => {
  return await knowledgeManager.removeFile(name, collection);
});

ipcMain.handle("knowledge:updateDescription", async (event, { id, description }) => {
  return await knowledgeManager.updateFileDescription(id, description);
});

ipcMain.handle("knowledge:moveFileToCollection", async (event, { fileName, currentCollection, targetCollection }) => {
  return await knowledgeManager.moveFileToCollection(fileName, currentCollection, targetCollection);
});

ipcMain.handle("knowledge:revealInExplorer", async (event, fileName, collection) => {
  const path = require("path");
  const relPath = collection && collection !== "General" ? path.join(collection, fileName || "") : (fileName || "");
  const fullPath = path.join(knowledgeManager.KNOWLEDGE_DIR, relPath);
  
  if (fileName) {
    shell.showItemInFolder(fullPath);
  } else {
    shell.openPath(knowledgeManager.KNOWLEDGE_DIR);
  }
});

ipcMain.handle("knowledge:getPath", async (event, fileName) => {
  return path.join(knowledgeManager.KNOWLEDGE_DIR, fileName || "");
});

// Auto-update IPC handlers
ipcMain.handle("check-for-updates", async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return result;
  } catch (err) {
    log.error("Error in check-for-updates handler:", err);
    throw err;
  }
});

ipcMain.on("restart-and-install", () => {
  autoUpdater.quitAndInstall(false, true);
});

// Global Auto-Updater Event Listeners
autoUpdater.on("update-available", (info) => {
  BrowserWindow.getAllWindows().forEach(win => win.webContents.send("update-available", info));
});

autoUpdater.on("update-not-available", () => {
  BrowserWindow.getAllWindows().forEach(win => win.webContents.send("update-not-available"));
});

autoUpdater.on("download-progress", (progress) => {
  BrowserWindow.getAllWindows().forEach(win => win.webContents.send("update-download-progress", progress.percent));
});

autoUpdater.on("update-downloaded", (info) => {
  BrowserWindow.getAllWindows().forEach(win => win.webContents.send("update-downloaded", info));
});

autoUpdater.on("error", (err) => {
  BrowserWindow.getAllWindows().forEach(win => win.webContents.send("update-error", err.message));
});

const { createServer } = require("http");
const next = require("next");

function createWindow() {
  const iconPath = process.platform === "win32"
    ? path.join(app.getAppPath(), "public/logo.ico")
    : path.join(app.getAppPath(), "public/icon.png");

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#0f0f0f",
    icon: fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      devTools: isDev, // Hard-disable DevTools in production
    },
  });

  // CRITICAL: Disable the default Electron menu in production to hide "View -> Toggle Developer Tools"
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    // mainWindow.webContents.openDevTools();
  } else {
    // Start Next.js server in production
    const nextApp = next({ dev: false, dir: path.join(__dirname, "..") });
    const handle = nextApp.getRequestHandler();
    
    nextApp.prepare().then(() => {
      const server = createServer((req, res) => {
        handle(req, res);
      });
      
      server.listen(0, () => {
        const port = server.address().port;
        log.info(`Next.js server listening on port ${port}`);
        mainWindow.loadURL(`http://localhost:${port}`);
      });
      
      server.on('error', (err) => {
        log.error("Next.js Server error:", err);
      });
    }).catch(err => {
      log.error("Failed to start Next.js server:", err);
    });
  }
}

app.whenReady().then(() => {
  if (process.platform === "win32") {
    app.setAppUserModelId("com.branehub.desktop");
  }
  
  createWindow();
  
  // Check for updates on startup
  setTimeout(async () => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 5000);
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
