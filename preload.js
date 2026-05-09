const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  chooseDbFolder: () => ipcRenderer.invoke('choose-db-folder'),
  getPort: () => ipcRenderer.invoke('get-port'),
});
