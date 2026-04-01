const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  discoverCLIs: () => ipcRenderer.invoke("discover-clis"),
  getMcpServers: () => ipcRenderer.invoke("get-mcp-servers"),
  addMcpServer: (id, config) => ipcRenderer.invoke("add-mcp-server", { id, config }),
  removeMcpServer: (id) => ipcRenderer.invoke("remove-mcp-server", id),
  toggleMcpServer: (id, enabled) => ipcRenderer.invoke("toggle-mcp-server", { id, enabled }),
  installSkill: (skill) => ipcRenderer.invoke("registry:installSkill", skill),
  uninstallSkill: (id) => ipcRenderer.invoke("registry:uninstallSkill", id),
  getInstalledSkills: () => ipcRenderer.invoke("registry:getInstalledSkills"),
  toggleSkill: (id, enabled) => ipcRenderer.invoke("registry:toggleSkill", id, enabled),
  isElectron: true,
  platform: process.platform,
});
