import { ipcRenderer } from 'electron';

export const databaseApi = {
    connect: async (connectionId: string) => {
        try {
            return await ipcRenderer.invoke('db:connect', connectionId);
        } catch (error) {
            console.error('Error in connect:', error);
            return { success: false, message: String(error) };
        }
    },

    disconnect: async (connectionId: string) => {
        try {
            return await ipcRenderer.invoke('db:disconnect', connectionId);
        } catch (error) {
            console.error('Error in disconnect:', error);
            return { success: false, message: String(error) };
        }
    },

    query: async (connectionId: string, sql: string) => {
        try {
            return await ipcRenderer.invoke('db:query', connectionId, sql);
        } catch (error) {
            console.error('Error in query:', error);
            return { error: String(error) };
        }
    },

    stopQuery: async (connectionId: string) => {
        try {
            return await ipcRenderer.invoke('stop-query', { connectionId });
        } catch (error) {
            console.error('Error stopping query:', error);
            return { success: false, message: String(error) };
        }
    },

    getTables: async (connectionId: string) => {
        try {
            return await ipcRenderer.invoke('db:getTables', connectionId);
        } catch (error) {
            console.error('Error in getTables:', error);
            return { error: String(error) };
        }
    },

    getPrimaryKey: async (connectionId: string, tableName: string) => {
        try {
            return await ipcRenderer.invoke('db:getPrimaryKey', connectionId, tableName);
        } catch (error) {
            console.error('Error in getPrimaryKey:', error);
            return { error: String(error) };
        }
    },

    updateCell: async (
        connectionId: string,
        tableName: string,
        primaryKeyColumn: string,
        primaryKeyValue: string | number,
        columnToUpdate: string,
        newValue: unknown
    ) => {
        try {
            return await ipcRenderer.invoke(
                'db:updateCell',
                connectionId,
                tableName,
                primaryKeyColumn,
                primaryKeyValue,
                columnToUpdate,
                newValue
            );
        } catch (error) {
            console.error('Error in updateCell:', error);
            return { error: String(error) };
        }
    },

    isConnected: async (connectionId: string) => {
        try {
            return await ipcRenderer.invoke('db:isConnected', connectionId);
        } catch (error) {
            console.error('Error checking connection status:', error);
            return false;
        }
    },

    getActiveConnections: async () => {
        try {
            return await ipcRenderer.invoke('db:getActiveConnections');
        } catch (error) {
            console.error('Error getting active connections:', error);
            return [];
        }
    },

    getDatabaseSchema: async (connectionId: string, forceRefresh = false) => {
        try {
            return await ipcRenderer.invoke('db:getDatabaseSchema', connectionId, forceRefresh);
        } catch (error) {
            console.error('Error getting database schema:', error);
            throw error;
        }
    },

    clearSchemaCache: async (connectionId: string) => {
        try {
            return await ipcRenderer.invoke('db:clearSchemaCache', connectionId);
        } catch (error) {
            console.error('Error clearing schema cache:', error);
            throw error;
        }
    }
}; 