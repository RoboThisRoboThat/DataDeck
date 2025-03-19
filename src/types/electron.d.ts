// Define interfaces for our Electron IPC API

declare global {
    interface Window {
        database: {
            connect: (connectionId: string) => Promise<{ success?: boolean; connected?: boolean; message: string } & Record<string, unknown>>;
            disconnect: (connectionId: string) => Promise<{ success: boolean; message: string }>;
            query: (connectionId: string, sql: string) => Promise<any[]>;
            getTables: (connectionId: string) => Promise<any[]>;
            getPrimaryKey: (connectionId: string, tableName: string) => Promise<string[]>;
            updateCell: (
                connectionId: string,
                tableName: string,
                primaryKeyColumn: string,
                primaryKeyValue: string | number,
                columnToUpdate: string,
                newValue: unknown
            ) => Promise<boolean>;
            isConnected: (connectionId: string) => Promise<boolean>;
            getActiveConnections: () => Promise<string[]>;
        };

        store: {
            getConnections: () => Promise<Connection[]>;
            addConnection: (connection: Connection) => Promise<Connection[]>;
            deleteConnection: (id: string) => Promise<Connection[]>;
            isConnected: (connectionId: string) => Promise<boolean>;
            getActiveConnections: () => Promise<string[]>;
        };

        windowManager: {
            openConnectionWindow: (connectionId: string, connectionName: string, urlParams?: string) => Promise<{ success: boolean; message?: string }>;
            setMainWindowFullscreen: () => Promise<{ success: boolean; message?: string }>;
            focusConnectionWindow: (connectionId: string) => Promise<boolean>;
        };

        api: {
            onWindowClosed: (callback: (connectionId: string) => void) => void;
            offWindowClosed: () => void;
            getOpenWindows: () => Promise<Record<string, boolean>>;
        };
    }
}

export { }; 