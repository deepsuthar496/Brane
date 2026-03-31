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
  isElectron: true,
  platform: process.platform,
});
