const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('mapperDesktop', {
  platform: process.platform,
  isDesktop: true,
  exportAndCommitGraph: (graph, message) => ipcRenderer.invoke('graph:export-and-commit', { graph, message }),
})
