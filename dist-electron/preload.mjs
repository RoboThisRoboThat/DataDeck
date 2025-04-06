"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    on(...args) {
      const [channel, listener] = args;
      return electron.ipcRenderer.on(
        channel,
        (event, ...args2) => listener(event, ...args2)
      );
    },
    off(...args) {
      const [channel, ...omit] = args;
      return electron.ipcRenderer.off(channel, ...omit);
    },
    send(...args) {
      const [channel, ...omit] = args;
      return electron.ipcRenderer.send(channel, ...omit);
    },
    invoke: (channel, args) => {
      const validChannels = [
        "get-app-path",
        "connect-to-db",
        "disconnect-from-db",
        "get-tables",
        "get-table-data",
        "get-primary-key",
        "update-cell",
        "execute-query",
        "save-query",
        "get-saved-queries",
        "delete-query"
      ];
      if (validChannels.includes(channel)) {
        return electron.ipcRenderer.invoke(channel, args);
      }
      throw new Error(`Unauthorized IPC channel: ${channel}`);
    }
  }
});
electron.contextBridge.exposeInMainWorld("database", {
  connect: (id) => {
    console.log("[Preload] connect with ID:", id);
    return electron.ipcRenderer.invoke("db:connect", id);
  },
  disconnect: (id) => {
    console.log("[Preload] disconnect with ID:", id);
    return electron.ipcRenderer.invoke("db:disconnect", id);
  },
  query: (id, sql) => {
    console.log("[Preload] query with ID:", id);
    return electron.ipcRenderer.invoke("db:query", id, sql);
  },
  getTables: (id) => {
    console.log("[Preload] getTables called with ID:", id);
    return electron.ipcRenderer.invoke("db:getTables", id);
  },
  getPrimaryKey: (id, tableName) => {
    console.log("[Preload] getPrimaryKey with ID:", id, "table:", tableName);
    return electron.ipcRenderer.invoke("db:getPrimaryKey", id, tableName);
  },
  updateCell: (id, tableName, primaryKeyColumn, primaryKeyValue, columnToUpdate, newValue) => {
    console.log("[Preload] updateCell with ID:", id);
    return electron.ipcRenderer.invoke(
      "db:updateCell",
      id,
      tableName,
      primaryKeyColumn,
      primaryKeyValue,
      columnToUpdate,
      newValue
    );
  },
  isConnected: (id) => {
    console.log("[Preload] isConnected with ID:", id);
    return electron.ipcRenderer.invoke("db:isConnected", id);
  },
  getActiveConnections: () => {
    return electron.ipcRenderer.invoke("db:getActiveConnections");
  },
  getDatabaseSchema: (id) => {
    console.log("[Preload] getDatabaseSchema with ID:", id);
    return electron.ipcRenderer.invoke("db:getDatabaseSchema", id);
  },
  getTableStructure: (connectionId, tableName) => {
    return electron.ipcRenderer.invoke("db:getTableStructure", connectionId, tableName);
  },
  addRow: (connectionId, tableName, data) => {
    return electron.ipcRenderer.invoke("db:addRow", connectionId, tableName, data);
  }
});
electron.contextBridge.exposeInMainWorld("windowManager", {
  openConnectionWindow: (connectionId, connectionName, urlParams) => {
    console.log(
      "[Preload] opening new window for connection:",
      connectionId,
      connectionName,
      urlParams
    );
    return electron.ipcRenderer.invoke(
      "window:openConnectionWindow",
      connectionId,
      connectionName,
      urlParams
    );
  },
  setMainWindowFullscreen: () => {
    console.log("[Preload] setting main window to fullscreen");
    return electron.ipcRenderer.invoke("window:setMainWindowFullscreen");
  },
  focusConnectionWindow: (connectionId) => {
    console.log("[Preload] focusing window for connection:", connectionId);
    return electron.ipcRenderer.invoke("window:focusConnectionWindow", connectionId);
  },
  getCurrentWindowId: () => {
    console.log("[Preload] getting current window ID");
    return electron.ipcRenderer.invoke("window:getCurrentWindowId");
  },
  setWindowFullscreen: (windowId) => {
    console.log("[Preload] setting window to fullscreen:", windowId);
    return electron.ipcRenderer.invoke("window:setWindowFullscreen", windowId);
  }
});
electron.contextBridge.exposeInMainWorld("api", {
  onWindowClosed: (callback) => {
    electron.ipcRenderer.on("window:closed", (_event, connectionId) => {
      callback(connectionId);
    });
  },
  offWindowClosed: () => {
    electron.ipcRenderer.removeAllListeners("window:closed");
  },
  getOpenWindows: () => {
    return electron.ipcRenderer.invoke("window:getOpenWindows");
  }
});
electron.contextBridge.exposeInMainWorld("store", {
  getConnections: () => electron.ipcRenderer.invoke("store:getConnections"),
  addConnection: (connection) => electron.ipcRenderer.invoke("store:addConnection", connection),
  deleteConnection: (id) => electron.ipcRenderer.invoke("store:deleteConnection", id),
  isConnected: (connectionId) => electron.ipcRenderer.invoke("db:isConnected", connectionId),
  getActiveConnections: () => electron.ipcRenderer.invoke("db:getActiveConnections"),
  getSettings: () => electron.ipcRenderer.invoke("store:getSettings"),
  updateSettings: (settings) => electron.ipcRenderer.invoke("store:updateSettings", settings),
  updateAISettings: (aiSettings) => electron.ipcRenderer.invoke("store:updateAISettings", aiSettings)
});
