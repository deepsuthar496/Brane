/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  browseFiles: (options) => ipcRenderer.invoke("browse-files", options),
  
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
  installMcp: (mcp) => ipcRenderer.invoke("registry:installMcp", mcp),
  uninstallMcp: (id) => ipcRenderer.invoke("registry:uninstallMcp", id),
  getInstalledSkills: () => ipcRenderer.invoke("registry:getInstalledSkills"),
  getInstalledMcps: () => ipcRenderer.invoke("registry:getInstalledMcps"),
  toggleSkill: (id, enabled) => ipcRenderer.invoke("registry:toggleSkill", id, enabled),
  getAllCredentials: () => ipcRenderer.invoke("branezo:get-all-credentials"),
  saveCredential: (key, value) => ipcRenderer.invoke("branezo:save-credential", key, value),
  deleteCredential: (key) => ipcRenderer.invoke("branezo:delete-credential", key),
  getModelsRegistry: () => ipcRenderer.invoke("branezo:get-models-registry"),
  getGithubToken: () => ipcRenderer.invoke("credentials:getGithubToken"),
  setGithubToken: (token) => ipcRenderer.invoke("credentials:setGithubToken", token),
  getRegistryRepo: () => ipcRenderer.invoke("credentials:getRegistryRepo"),
  setRegistryRepo: (repo) => ipcRenderer.invoke("credentials:setRegistryRepo", repo),
  installCLI: (payload) => ipcRenderer.invoke("install-cli", payload),
  checkCLIInstalled: (command) => ipcRenderer.invoke("check-cli-installed", command),
  startAgent: (payload) => ipcRenderer.invoke("start-agent", payload),
  stopAgent: (id) => ipcRenderer.invoke("stop-agent", id),
  getAgentStatus: (id) => ipcRenderer.invoke("get-agent-status", id),
  
  // Auto-update
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  restartAndInstall: () => ipcRenderer.send("restart-and-install"),
  
  // BraneZO Agent
  startBraneZOChat: (payload) => ipcRenderer.send("branezo:start-chat", payload),
  abortBraneZOChat: (id) => ipcRenderer.send("branezo:abort-chat", id),
  onBraneZOChunk: (id, callback) => {
    const channel = `branezo:chunk:${id}`;
    const listener = (e, text) => callback(text);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  onBraneZOToolCall: (id, callback) => {
    const channel = `branezo:tool-call:${id}`;
    const listener = (e, call) => callback(call);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  onBraneZOToolResult: (id, callback) => {
    const channel = `branezo:tool-result:${id}`;
    const listener = (e, res) => callback(res);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  onBraneZOFinish: (id, callback) => {
    const channel = `branezo:finish:${id}`;
    const listener = (e, msgs) => callback(msgs);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  onBraneZOError: (id, callback) => {
    const channel = `branezo:error:${id}`;
    const listener = (e, err) => callback(err);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },

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

  // Knowledge Base
  listKnowledgeFiles: () => ipcRenderer.invoke("knowledge:listFiles"),
  addKnowledgeFile: (name, content) => ipcRenderer.invoke("knowledge:addFile", { name, content }),
  addKnowledgeFileFromPath: (path) => ipcRenderer.invoke("knowledge:addFileFromPath", path),
  removeKnowledgeFile: (name) => ipcRenderer.invoke("knowledge:removeFile", name),
  getKnowledgePath: () => ipcRenderer.invoke("knowledge:getPath"),

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
