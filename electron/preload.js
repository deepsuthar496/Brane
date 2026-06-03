/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require("electron");
const Sentry = require("@sentry/electron/renderer");

Sentry.init({
  dsn: "https://16018e156076eb0a324e6c8b8bc67075@o4509508323311616.ingest.us.sentry.io/4511473603903489",
  sendDefaultPii: false,
});

contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  browseFiles: (options) => ipcRenderer.invoke("browse-files", options),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  
  // Logs
  getLogs: () => ipcRenderer.invoke("get-logs"),
  clearLogs: () => ipcRenderer.invoke("clear-logs"),
  addLog: (level, source, message, details) => ipcRenderer.invoke("add-log", { level, source, message, details }),
  
  discoverCLIs: () => ipcRenderer.invoke("discover-clis"),
  getMcpServers: () => ipcRenderer.invoke("get-mcp-servers"),
  addMcpServer: (id, config) => ipcRenderer.invoke("add-mcp-server", { id, config }),
  removeMcpServer: (id) => ipcRenderer.invoke("remove-mcp-server", id),
  toggleMcpServer: (id, enabled) => ipcRenderer.invoke("toggle-mcp-server", { id, enabled }),
  fetchRegistryData: (urlPair) => ipcRenderer.invoke("registry:fetchData", urlPair),
  installSkill: (skill) => ipcRenderer.invoke("registry:installSkill", skill),
  uninstallSkill: (id) => ipcRenderer.invoke("registry:uninstallSkill", id),
  installMcp: (mcp, targets) => ipcRenderer.invoke("registry:installMcp", mcp, targets),
  uninstallMcp: (id) => ipcRenderer.invoke("registry:uninstallMcp", id),
  getInstalledSkills: () => ipcRenderer.invoke("registry:getInstalledSkills"),
  getInstalledMcps: () => ipcRenderer.invoke("registry:getInstalledMcps"),
  toggleSkill: (id, enabled) => ipcRenderer.invoke("registry:toggleSkill", id, enabled),
  getGithubToken: () => ipcRenderer.invoke("config:getGithubToken"),
  setGithubToken: (token) => ipcRenderer.invoke("config:setGithubToken", token),
  setCrashReportsEnabled: (enabled) => ipcRenderer.invoke("config:setCrashReportsEnabled", enabled),
  testSentryMainError: () => ipcRenderer.invoke("sentry:test-main-error"),
  installCLI: (payload) => ipcRenderer.invoke("install-cli", payload),
  abortInstall: (id) => ipcRenderer.invoke("abort-install", id),
  checkCLIInstalled: (command) => ipcRenderer.invoke("check-cli-installed", command),
  startAgent: (payload) => ipcRenderer.invoke("start-agent", payload),
  sendAgentInput: (payload) => ipcRenderer.invoke("send-agent-input", payload),
  resizeAgent: (payload) => ipcRenderer.invoke("resize-agent", payload),
  stopAgent: (id) => ipcRenderer.invoke("stop-agent", id),
  getAgentStatus: (id) => ipcRenderer.invoke("get-agent-status", id),
  
  // Auto-update
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  restartAndInstall: () => ipcRenderer.send("restart-and-install"),
  
  // CLI Flags
  getCliFlags: (agentName) => ipcRenderer.invoke('cli-flags:get-available', agentName),
  getEnabledCliFlags: (agentName) => ipcRenderer.invoke('cli-flags:get-enabled', agentName),
  setEnabledCliFlag: (agentName, flagName, value) => ipcRenderer.invoke('cli-flags:set-enabled', agentName, flagName, value),
  fetchUrl: (url) => ipcRenderer.invoke("fetch-url", url),
  
  onUpdateAvailable: (callback) => {
    const listener = (event, info) => callback(info);
    ipcRenderer.on("update-available", listener);
    return () => ipcRenderer.removeListener("update-available", listener);
  },
  onUpdateNotAvailable: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("update-not-available", listener);
    return () => ipcRenderer.removeListener("update-not-available", listener);
  },
  onUpdateDownloadProgress: (callback) => {
    const listener = (event, progress) => callback(progress);
    ipcRenderer.on("update-download-progress", listener);
    return () => ipcRenderer.removeListener("update-download-progress", listener);
  },
  onUpdateDownloaded: (callback) => {
    const listener = (event, info) => callback(info);
    ipcRenderer.on("update-downloaded", listener);
    return () => ipcRenderer.removeListener("update-downloaded", listener);
  },
  onUpdateError: (callback) => {
    const listener = (event, message) => callback(message);
    ipcRenderer.on("update-error", listener);
    return () => ipcRenderer.removeListener("update-error", listener);
  },
  onUpdateWarning: (callback) => {
    const listener = (event, message) => callback(message);
    ipcRenderer.on("update-warning", listener);
    return () => ipcRenderer.removeListener("update-warning", listener);
  },

  // Knowledge Base
  listKnowledgeFiles: () => ipcRenderer.invoke("knowledge:listFiles"),
  addKnowledgeFile: (name, content, collection) => ipcRenderer.invoke("knowledge:addFile", { name, content, collection }),
  addKnowledgeFileFromPath: (path, collection) => ipcRenderer.invoke("knowledge:addFileFromPath", { path, collection }),
  removeKnowledgeFile: (name, collection) => ipcRenderer.invoke("knowledge:removeFile", name, collection),
  updateKnowledgeDescription: (id, description) => ipcRenderer.invoke("knowledge:updateDescription", { id, description }),
  moveKnowledgeFileToCollection: (payload) => ipcRenderer.invoke("knowledge:moveFileToCollection", payload),
  revealKnowledgeInExplorer: (name, collection) => ipcRenderer.invoke("knowledge:revealInExplorer", name, collection),
  getKnowledgePath: (name) => ipcRenderer.invoke("knowledge:getPath", name),

  onInstallProgress: (id, callback) => {
    const channel = `install-progress:${id}`;
    const listener = (event, data) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  onAgentLog: (id, callback) => {
    const channel = `agent-log:${id}`;
    const listener = (event, data) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  onAgentStatus: (id, callback) => {
    const channel = `agent-status:${id}`;
    const listener = (event, data) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  isElectron: true,
  platform: process.platform,
});
