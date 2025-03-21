import { ipcRenderer, contextBridge } from 'electron'
import type { Connection } from '../src/types/connection'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    on(...args: Parameters<typeof ipcRenderer.on>) {
      const [channel, listener] = args
      return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
    },
    off(...args: Parameters<typeof ipcRenderer.off>) {
      const [channel, ...omit] = args
      return ipcRenderer.off(channel, ...omit)
    },
    send(...args: Parameters<typeof ipcRenderer.send>) {
      const [channel, ...omit] = args
      return ipcRenderer.send(channel, ...omit)
    },
    invoke: (channel: string, args: any) => {
      const validChannels = [
        'get-app-path',
        'connect-to-db',
        'disconnect-from-db',
        'get-tables',
        'get-table-data',
        'get-primary-key',
        'update-cell',
        'execute-query',
        'save-query',
        'get-saved-queries',
        'delete-query'
      ];

      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, args);
      }

      throw new Error(`Unauthorized IPC channel: ${channel}`);
    }
  }
})

export type ConnectionConfig = {
  host: string
  port: string
  user: string
  password: string
  database: string
  dbType: 'mysql' | 'postgres'
}

contextBridge.exposeInMainWorld('database', {
  connect: (id: string) => {
    console.log("[Preload] connect with ID:", id);
    return ipcRenderer.invoke('db:connect', id);
  },
  disconnect: (id: string) => {
    console.log("[Preload] disconnect with ID:", id);
    return ipcRenderer.invoke('db:disconnect', id);
  },
  query: (id: string, sql: string) => {
    console.log("[Preload] query with ID:", id);
    return ipcRenderer.invoke('db:query', id, sql);
  },
  getTables: (id: string) => {
    console.log("[Preload] getTables called with ID:", id);
    return ipcRenderer.invoke('db:getTables', id);
  },
  getPrimaryKey: (id: string, tableName: string) => {
    console.log("[Preload] getPrimaryKey with ID:", id, "table:", tableName);
    return ipcRenderer.invoke('db:getPrimaryKey', id, tableName);
  },
  updateCell: (
    id: string,
    tableName: string,
    primaryKeyColumn: string,
    primaryKeyValue: string | number,
    columnToUpdate: string,
    newValue: unknown
  ) => {
    console.log("[Preload] updateCell with ID:", id);
    return ipcRenderer.invoke(
      'db:updateCell',
      id,
      tableName,
      primaryKeyColumn,
      primaryKeyValue,
      columnToUpdate,
      newValue
    );
  },
  isConnected: (id: string) => {
    console.log("[Preload] isConnected with ID:", id);
    return ipcRenderer.invoke('db:isConnected', id);
  },
  getActiveConnections: () => {
    return ipcRenderer.invoke('db:getActiveConnections');
  },
  getDatabaseSchema: (id: string) => {
    console.log("[Preload] getDatabaseSchema with ID:", id);
    return ipcRenderer.invoke('db:getDatabaseSchema', id);
  },
})

// Add a new context bridge for window management
contextBridge.exposeInMainWorld('windowManager', {
  openConnectionWindow: (connectionId: string, connectionName: string, urlParams?: string) => {
    console.log("[Preload] opening new window for connection:", connectionId, connectionName, urlParams);
    return ipcRenderer.invoke('window:openConnectionWindow', connectionId, connectionName, urlParams);
  },
  setMainWindowFullscreen: () => {
    console.log("[Preload] setting main window to fullscreen");
    return ipcRenderer.invoke('window:setMainWindowFullscreen');
  },
  focusConnectionWindow: (connectionId: string) => {
    console.log("[Preload] focusing window for connection:", connectionId);
    return ipcRenderer.invoke('window:focusConnectionWindow', connectionId);
  },
  getCurrentWindowId: () => {
    console.log("[Preload] getting current window ID");
    return ipcRenderer.invoke('window:getCurrentWindowId');
  },
  setWindowFullscreen: (windowId: number) => {
    console.log("[Preload] setting window to fullscreen:", windowId);
    return ipcRenderer.invoke('window:setWindowFullscreen', windowId);
  }
});

// Add window tracking API
contextBridge.exposeInMainWorld('api', {
  onWindowClosed: (callback: (connectionId: string) => void) => {
    ipcRenderer.on('window:closed', (_event, connectionId) => {
      callback(connectionId);
    });
  },
  offWindowClosed: () => {
    ipcRenderer.removeAllListeners('window:closed');
  },
  getOpenWindows: () => {
    return ipcRenderer.invoke('window:getOpenWindows');
  }
});

contextBridge.exposeInMainWorld('store', {
  getConnections: () => ipcRenderer.invoke('store:getConnections'),
  addConnection: (connection: Connection) => ipcRenderer.invoke('store:addConnection', connection),
  deleteConnection: (id: string) => ipcRenderer.invoke('store:deleteConnection', id),
})

// Type declarations for TypeScript
declare global {
  interface Window {
    database: {
      connect: (id: string) => Promise<{ success: boolean; message: string }>
      disconnect: (id: string) => Promise<void>
      query: (id: string, sql: string) => Promise<any>
      getTables: (id: string) => Promise<any[]>
      getPrimaryKey: (id: string, tableName: string) => Promise<string[]>
      updateCell: (
        id: string,
        tableName: string,
        primaryKeyColumn: string,
        primaryKeyValue: string | number,
        columnToUpdate: string,
        newValue: unknown
      ) => Promise<boolean>
      isConnected: (id: string) => Promise<boolean>
      getActiveConnections: () => Promise<string[]>
      getDatabaseSchema: (id: string) => Promise<any>
    }
    store: {
      getConnections: () => Promise<Connection[]>
      addConnection: (connection: Connection) => Promise<Connection[]>
      deleteConnection: (id: string) => Promise<Connection[]>
    }
    windowManager: {
      openConnectionWindow: (connectionId: string, connectionName: string, urlParams?: string) => Promise<{
        success: boolean;
        windowId?: number;
        message?: string
      }>
      setMainWindowFullscreen: () => Promise<{ success: boolean; message?: string }>
      focusConnectionWindow: (connectionId: string) => Promise<boolean>
      getCurrentWindowId: () => Promise<{
        success: boolean;
        windowId?: number;
        message?: string
      }>
      setWindowFullscreen: (windowId: number) => Promise<{
        success: boolean;
        windowId?: number;
        message?: string
      }>
    }
    api: {
      onWindowClosed: (callback: (connectionId: string) => void) => void
      offWindowClosed: () => void
      getOpenWindows: () => Promise<Record<string, boolean>>
    }
  }
}
