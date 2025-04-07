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
electron.contextBridge.exposeInMainWorld("redis", {
  connect: (connectionId, config) => {
    console.log("[Preload] Redis connect with ID:", connectionId);
    return electron.ipcRenderer.invoke("redis:connect", { connectionId, config });
  },
  disconnect: (connectionId) => {
    console.log("[Preload] Redis disconnect with ID:", connectionId);
    return electron.ipcRenderer.invoke("redis:disconnect", { connectionId });
  },
  getKeys: (connectionId, pattern = "*", cursor = "0", count = 100) => {
    console.log(
      "[Preload] Redis getKeys with ID:",
      connectionId,
      "pattern:",
      pattern
    );
    return electron.ipcRenderer.invoke("redis:getKeys", {
      connectionId,
      pattern,
      cursor,
      count
    });
  },
  getKeyInfo: (connectionId, key) => {
    console.log(
      "[Preload] Redis getKeyInfo with ID:",
      connectionId,
      "key:",
      key
    );
    return electron.ipcRenderer.invoke("redis:getKeyInfo", { connectionId, key });
  },
  getKeyValue: (connectionId, key) => {
    console.log(
      "[Preload] Redis getKeyValue with ID:",
      connectionId,
      "key:",
      key
    );
    return electron.ipcRenderer.invoke("redis:getKeyValue", { connectionId, key });
  },
  deleteKey: (connectionId, key) => {
    console.log(
      "[Preload] Redis deleteKey with ID:",
      connectionId,
      "key:",
      key
    );
    return electron.ipcRenderer.invoke("redis:deleteKey", { connectionId, key });
  },
  executeCommand: (connectionId, command, args) => {
    console.log(
      "[Preload] Redis executeCommand with ID:",
      connectionId,
      "command:",
      command
    );
    return electron.ipcRenderer.invoke("redis:executeCommand", {
      connectionId,
      command,
      args
    });
  },
  getServerInfo: (connectionId) => {
    console.log("[Preload] Redis getServerInfo with ID:", connectionId);
    return electron.ipcRenderer.invoke("redis:getServerInfo", { connectionId });
  },
  getClients: (connectionId) => {
    console.log("[Preload] Redis getClients with ID:", connectionId);
    return electron.ipcRenderer.invoke("redis:getClients", { connectionId });
  },
  setKeyValue: (connectionId, key, value, type) => {
    console.log(
      "[Preload] Redis setKeyValue with ID:",
      connectionId,
      "key:",
      key
    );
    return electron.ipcRenderer.invoke("redis:setKeyValue", {
      connectionId,
      key,
      value,
      type
    });
  },
  selectDatabase: (connectionId, dbNumber) => {
    console.log(
      "[Preload] Redis selectDatabase with ID:",
      connectionId,
      "dbNumber:",
      dbNumber
    );
    return electron.ipcRenderer.invoke("redis:selectDatabase", {
      connectionId,
      dbNumber
    });
  },
  getDatabaseCount: (connectionId) => {
    console.log("[Preload] Redis getDatabaseCount with ID:", connectionId);
    return electron.ipcRenderer.invoke("redis:getDatabaseCount", { connectionId });
  },
  getCurrentDatabase: (connectionId) => {
    console.log("[Preload] Redis getCurrentDatabase with ID:", connectionId);
    return electron.ipcRenderer.invoke("redis:getCurrentDatabase", { connectionId });
  },
  getPopulatedDatabases: (connectionId) => {
    console.log("[Preload] Redis getPopulatedDatabases with ID:", connectionId);
    return electron.ipcRenderer.invoke("redis:getPopulatedDatabases", { connectionId });
  }
});
