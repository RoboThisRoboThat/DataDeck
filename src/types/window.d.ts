import type { Connection } from "./connection";

declare global {
	interface Window {
		database: {
			connect: (id: string) => Promise<{ success: boolean; message: string }>;
			disconnect: (id: string) => Promise<void>;
			query: (id: string, sql: string) => Promise<Record<string, unknown>>;
			getTables: (id: string) => Promise<Array<{ name: string; type: string }>>;
			getPrimaryKey: (id: string, tableName: string) => Promise<string[]>;
			updateCell: (
				id: string,
				tableName: string,
				primaryKeyColumn: string,
				primaryKeyValue: string | number,
				columnToUpdate: string,
				newValue: unknown,
			) => Promise<boolean>;
			isConnected: (id: string) => Promise<boolean>;
			getActiveConnections: () => Promise<string[]>;
			addRow: (
				connectionId: string,
				tableName: string,
				data: Record<string, unknown>,
			) => Promise<boolean>;
		};
		store: {
			getConnections: () => Promise<Connection[]>;
			addConnection: (connection: Connection) => Promise<Connection[]>;
			deleteConnection: (id: string) => Promise<Connection[]>;
		};
		windowManager: {
			openConnectionWindow: (
				connectionId: string,
				connectionName: string,
				urlParams?: string,
			) => Promise<{
				success: boolean;
				message?: string;
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
		api: {
			onWindowClosed: (callback: (connectionId: string) => void) => void;
			offWindowClosed: () => void;
			getOpenWindows: () => Promise<Record<string, boolean>>;
		};
	}
}
