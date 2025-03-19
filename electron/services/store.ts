import Store from 'electron-store';
import type { Connection } from '../../src/types/connection';
import DatabaseService from './database.service';

interface StoreSchema {
    connections: Connection[];
}

interface SavedQuery {
    name: string;
    sql: string;
    createdAt: string;
    description?: string;
}

interface QueryStoreSchema {
    queries: {
        [connectionId: string]: {
            [queryName: string]: SavedQuery;
        };
    };
}

const store = new Store<StoreSchema>({
    defaults: {
        connections: []
    }
});

// Separate store for queries with proper schema validation
const queryStore = new Store<QueryStoreSchema>({
    name: 'saved-queries',
    schema: {
        queries: {
            type: 'object',
            additionalProperties: {
                type: 'object',
                additionalProperties: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        sql: { type: 'string' },
                        createdAt: { type: 'string' },
                        description: { type: 'string' }
                    },
                    required: ['name', 'sql', 'createdAt']
                }
            }
        }
    },
    defaults: {
        queries: {}
    }
});

// Map to store active database service instances
const activeConnections = new Map<string, DatabaseService>();

export const storeService = {
    getConnections: () => {
        // Get connections from store but DON'T attach service instances
        const connections = store.get('connections');
        return connections.map(conn => ({ ...conn })); // Return plain objects, not service instances
    },

    addConnection: (connection: Connection) => {
        const connections = store.get('connections');
        store.set('connections', [...connections, connection]);
        return store.get('connections').map(conn => ({ ...conn })); // Return plain objects
    },

    deleteConnection: (id: string) => {
        // Disconnect if active
        if (activeConnections.has(id)) {
            activeConnections.get(id)?.disconnect();
            activeConnections.delete(id);
        }

        const connections = store.get('connections');
        store.set('connections', connections.filter(conn => conn.id !== id));
        return store.get('connections').map(conn => ({ ...conn })); // Return plain objects
    },

    updateAllConnections: (connections: Connection[]) => {
        store.set('connections', connections);
        return store.get('connections').map(conn => ({ ...conn })); // Return plain objects
    },

    connectToDb: async (id: string) => {
        const connections = store.get('connections');
        const connection = connections.find(conn => conn.id === id);

        if (connection) {
            // Create a new service instance for this connection
            const dbService = new DatabaseService(connection.dbType);

            // Attempt to connect
            const result = await dbService.connect({
                host: connection.host,
                port: connection.port,
                user: connection.user,
                password: connection.password,
                database: connection.database,
                dbType: connection.dbType
            });

            if (result.success) {
                // Store the active service if successful
                activeConnections.set(id, dbService);

                // Return a plain object (not a service instance)
                return {
                    ...connection,
                    connected: true,
                    success: true,
                    message: result.message
                };
            }

            return {
                ...connection,
                connected: false,
                success: false,
                message: result.message
            };
        }

        return {
            success: false,
            message: 'Connection not found',
            connected: false
        };
    },

    // Database operations by connection ID

    async query(connectionId: string, sql: string) {
        const service = activeConnections.get(connectionId);
        if (!service) {
            throw new Error(`No active connection for ID: ${connectionId}`);
        }

        return await service.query(sql);
    },

    async getTables(connectionId: string) {
        console.log("Store service: getting tables for connection:", connectionId);
        console.log("Store service: type of connectionId:", typeof connectionId);

        if (!connectionId) {
            throw new Error("No connection ID provided");
        }

        if (!activeConnections.has(connectionId)) {
            console.error(`No active connection found for ID: ${connectionId}`);
            console.log("Active connections:", Array.from(activeConnections.keys()));
            throw new Error(`No active connection for ID: ${connectionId}`);
        }

        const service = activeConnections.get(connectionId);
        if (!service) {
            throw new Error(`Database service not found for connection: ${connectionId}`);
        }

        console.log("Service found, executing getTables");
        return await service.getTables();
    },

    async tableExists(connectionId: string, tableName: string) {
        const service = activeConnections.get(connectionId);
        if (!service) {
            throw new Error(`No active connection for ID: ${connectionId}`);
        }

        return await service.tableExists(tableName);
    },

    async getPrimaryKey(connectionId: string, tableName: string) {
        const service = activeConnections.get(connectionId);
        if (!service) {
            throw new Error(`No active connection for ID: ${connectionId}`);
        }

        return await service.getPrimaryKey(tableName);
    },

    async updateCell(
        connectionId: string,
        tableName: string,
        primaryKeyColumn: string,
        primaryKeyValue: string | number,
        columnToUpdate: string,
        newValue: unknown
    ) {
        const service = activeConnections.get(connectionId);
        if (!service) {
            throw new Error(`No active connection for ID: ${connectionId}`);
        }

        return await service.updateCell(
            tableName,
            primaryKeyColumn,
            primaryKeyValue,
            columnToUpdate,
            newValue
        );
    },

    // Get active connection status
    isConnected(connectionId: string) {
        return activeConnections.has(connectionId);
    },

    // Get all active connections
    getActiveConnections() {
        return Array.from(activeConnections.keys());
    },

    // Query management functions
    saveQuery: async (args: {
        connectionId: string;
        name: string;
        sql: string;
        description?: string;
        shouldRefresh?: boolean;
    }) => {
        const { connectionId, name, sql, description, shouldRefresh = true } = args;

        if (!connectionId || !name || !sql) {
            throw new Error('Missing connection ID, name, or SQL query');
        }

        try {
            // Get existing queries for this connection
            const connectionQueries = queryStore.get(`queries.${connectionId}`, {} as Record<string, SavedQuery>);

            // Add new query
            connectionQueries[name] = {
                name,
                sql,
                createdAt: new Date().toISOString(),
                ...(description && { description })
            };

            // Save to store
            queryStore.set(`queries.${connectionId}`, connectionQueries);

            return { success: true, shouldRefresh };
        } catch (error) {
            console.error('Error saving query:', error);
            throw error;
        }
    },

    getSavedQueries: async (connectionId: string) => {
        if (!connectionId) {
            throw new Error('Missing connection ID');
        }

        try {
            // Get queries for this connection
            const connectionQueries = queryStore.get(`queries.${connectionId}`, {} as Record<string, SavedQuery>);

            // Convert from object to array and sort by created date
            const queriesArray = Object.values(connectionQueries) as SavedQuery[];

            // Make sure the "Unsaved Query" is always included
            if (!queriesArray.some(q => q.name === 'Unsaved Query')) {
                // Create an empty unsaved query if none exists
                connectionQueries['Unsaved Query'] = {
                    name: 'Unsaved Query',
                    sql: '',
                    createdAt: new Date().toISOString()
                };
                queryStore.set(`queries.${connectionId}`, connectionQueries);

                // Add to the array
                queriesArray.push(connectionQueries['Unsaved Query']);
            }

            // Sort - but put Unsaved Query at the end
            queriesArray.sort((a, b) => {
                // Always put Unsaved Query at the end
                if (a.name === 'Unsaved Query') return 1;
                if (b.name === 'Unsaved Query') return -1;

                // Sort others by creation date, newest first
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });

            return { queries: queriesArray };
        } catch (error) {
            console.error('Error getting saved queries:', error);
            throw error;
        }
    },

    deleteQuery: async (connectionId: string, name: string) => {
        if (!connectionId || !name) {
            throw new Error('Missing connection ID or query name');
        }

        try {
            // Get existing queries for this connection
            const connectionQueries = queryStore.get(`queries.${connectionId}`, {} as Record<string, SavedQuery>);

            // Remove the query
            delete connectionQueries[name];

            // Save to store
            queryStore.set(`queries.${connectionId}`, connectionQueries);

            return { success: true };
        } catch (error) {
            console.error('Error deleting query:', error);
            throw error;
        }
    },

    // Database operations
    disconnectFromDb: async (connectionId: string) => {
        const service = activeConnections.get(connectionId);
        if (service) {
            await service.disconnect();
            activeConnections.delete(connectionId);
            return { success: true };
        }
        return { success: false, message: 'No active connection found' };
    },

    cancelQuery: async (connectionId: string) => {
        const service = activeConnections.get(connectionId);
        if (!service) {
            throw new Error(`No active connection for ID: ${connectionId}`);
        }
        return await service.cancelQuery();
    },
};