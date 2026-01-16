// Empty for now — optional preload
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  exportFile: async (data) => {
    return await ipcRenderer.invoke("export-worklog", data);
  },
  getHistory: async () => {
    return await ipcRenderer.invoke("get-history");
  },
  readWorklog: async (path) => {
    return await ipcRenderer.invoke("read-worklog", path);
  }
});
