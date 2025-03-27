import type { Connection } from './connection';
import type { AppSettings, AISettings } from './settings';

declare global {
    interface Window {
        database: {
            connect: (connectionId: string) => Promise<{ success?: boolean; connected?: boolean; message: string } & Partial<Connection>>;
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
        };
        store: {
            getConnections: () => Promise<Connection[]>;
            addConnection: (connection: Connection) => Promise<Connection[]>;
            deleteConnection: (id: string) => Promise<Connection[]>;
            isConnected: (connectionId: string) => Promise<boolean>;
            getActiveConnections: () => Promise<string[]>;
            getSettings: () => Promise<AppSettings>;
            updateSettings: (settings: AppSettings) => Promise<AppSettings>;
            updateAISettings: (aiSettings: AISettings) => Promise<AISettings>;
        };
        windowManager: {
            openConnectionWindow: (connectionId: string, connectionName: string, urlParams?: string) => Promise<{
                success: boolean;
                windowId?: number;
                message?: string
            }>;
            setMainWindowFullscreen: () => Promise<{
                success: boolean;
                message?: string;
            }>;
            focusConnectionWindow: (connectionId: string) => Promise<boolean>;
            getCurrentWindowId: () => Promise<{
                success: boolean;
                windowId?: number;
                message?: string;
            }>;
            setWindowFullscreen: (windowId: number) => Promise<{
                success: boolean;
                windowId?: number;
                message?: string;
            }>;
        };
        electron: {
            ipcRenderer: {
                on: (channel: string, func: (...args: any[]) => void) => void;
                off: (channel: string, func: (...args: any[]) => void) => void;
                send: (channel: string, ...args: any[]) => void;
                invoke: (channel: string, args: any) => Promise<any>;
            }
        };
        api: {
            onWindowClosed: (callback: (connectionId: string) => void) => void;
            offWindowClosed: () => void;
            getOpenWindows: () => Promise<Record<string, boolean>>;
        };
    }
}

export { }; 