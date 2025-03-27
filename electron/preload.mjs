import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('database', {
    connect: (connectionId) => {
        console.log("[Preload] connect with ID:", connectionId);
        return ipcRenderer.invoke('db:connect', connectionId);
    },
    disconnect: (connectionId) => {
        console.log("[Preload] disconnect with ID:", connectionId);
        return ipcRenderer.invoke('db:disconnect', connectionId);
    },
    query: (connectionId, sql) => {
        console.log("[Preload] query with ID:", connectionId);
        return ipcRenderer.invoke('db:query', connectionId, sql);
    },
    getTables: (connectionId) => {
        console.log("[Preload] getTables called with ID:", connectionId);
        return ipcRenderer.invoke('db:getTables', connectionId);
    },
    getPrimaryKey: (connectionId, tableName) => {
        console.log("[Preload] getPrimaryKey with ID:", connectionId, "table:", tableName);
        return ipcRenderer.invoke('db:getPrimaryKey', connectionId, tableName);
    },
    updateCell: (connectionId, tableName, primaryKeyColumn, primaryKeyValue, columnToUpdate, newValue) => {
        console.log("[Preload] updateCell with ID:", connectionId);
        return ipcRenderer.invoke('db:updateCell', connectionId, tableName, primaryKeyColumn, primaryKeyValue, columnToUpdate, newValue);
    },
    isConnected: (connectionId) => {
        console.log("[Preload] isConnected with ID:", connectionId);
        return ipcRenderer.invoke('db:isConnected', connectionId);
    },
    getActiveConnections: () => {
        return ipcRenderer.invoke('db:getActiveConnections');
    }
})

// Expose store methods
contextBridge.exposeInMainWorld('store', {
    getConnections: () => ipcRenderer.invoke('store:getConnections'),
    addConnection: (connection) => ipcRenderer.invoke('store:addConnection', connection),
    deleteConnection: (id) => ipcRenderer.invoke('store:deleteConnection', id),
    getSettings: () => ipcRenderer.invoke('store:getSettings'),
    updateSettings: (settings) => ipcRenderer.invoke('store:updateSettings', settings),
    updateAISettings: (aiSettings) => ipcRenderer.invoke('store:updateAISettings', aiSettings),
})

// Expose ipcRenderer.on
contextBridge.exposeInMainWorld('ipcRenderer', {
    on: (channel, callback) => ipcRenderer.on(channel, (event, ...args) => callback(...args)),
}) 