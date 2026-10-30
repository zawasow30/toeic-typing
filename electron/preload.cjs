const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openWordsFolder: () => ipcRenderer.invoke('open-words-folder'),
  getWordsPath: () => ipcRenderer.invoke('get-words-path'),
  readWordFile: (fileName) => ipcRenderer.invoke('read-word-file', fileName),
  listWordFiles: () => ipcRenderer.invoke('list-word-files')
});
