import { ipcRenderer, contextBridge } from "electron";
import type { Connection } from "../src/types/connection";
import type { AppSettings, AISettings } from "../src/types/settings";

// Define types for database query results
type QueryResult = Record<string, unknown>;
type TableStructure = {
	name: string;
	columns: Array<{
		name: string;
		type: string;
		nullable: boolean;
		isPrimary: boolean;
	}>;
};
type DatabaseSchema = {
	tables: Record<string, TableStructure>;
};

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld("electron", {
	ipcRenderer: {
		on(...args: Parameters<typeof ipcRenderer.on>) {
			const [channel, listener] = args;
			return ipcRenderer.on(channel, (event, ...args) =>
				listener(event, ...args),
			);
		},
		off(...args: Parameters<typeof ipcRenderer.off>) {
			const [channel, ...omit] = args;
			return ipcRenderer.off(channel, ...omit);
		},
		send(...args: Parameters<typeof ipcRenderer.send>) {
			const [channel, ...omit] = args;
			return ipcRenderer.send(channel, ...omit);
		},
		invoke: (channel: string, args: unknown) => {
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
				"delete-query",
			];

			if (validChannels.includes(channel)) {
				return ipcRenderer.invoke(channel, args);
			}

			throw new Error(`Unauthorized IPC channel: ${channel}`);
		},
	},
});

export type ConnectionConfig = {
	host: string;
	port: string;
	user: string;
	password: string;
	database: string;
	dbType: "mysql" | "postgres";
};

// Define the Database interface to ensure consistency
interface Database {
	connect: (id: string) => Promise<{ success: boolean; message: string }>;
	disconnect: (id: string) => Promise<void>;
	query: (id: string, sql: string) => Promise<QueryResult>;
	getTables: (id: string) => Promise<string[]>;
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
	getDatabaseSchema: (id: string) => Promise<DatabaseSchema>;
	getTableStructure: (
		connectionId: string,
		tableName: string,
	) => Promise<TableStructure>;
	addRow: (
		connectionId: string,
		tableName: string,
		data: Record<string, unknown>,
	) => Promise<boolean>;
}

// Define the Store interface
interface Store {
	getConnections: () => Promise<Connection[]>;
	addConnection: (connection: Connection) => Promise<Connection[]>;
	deleteConnection: (id: string) => Promise<Connection[]>;
	isConnected: (connectionId: string) => Promise<boolean>;
	getActiveConnections: () => Promise<string[]>;
	getSettings: () => Promise<AppSettings>;
	updateSettings: (settings: AppSettings) => Promise<AppSettings>;
	updateAISettings: (aiSettings: AISettings) => Promise<AISettings>;
}

// Define the WindowManager interface
interface WindowManager {
	openConnectionWindow: (
		connectionId: string,
		connectionName: string,
		urlParams?: string,
	) => Promise<{
		success: boolean;
		windowId?: number;
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
}

// Define the API interface
interface API {
	onWindowClosed: (callback: (connectionId: string) => void) => void;
	offWindowClosed: () => void;
	getOpenWindows: () => Promise<Record<string, boolean>>;
}

// Define Redis interface
interface Redis {
	connect: (
		connectionId: string,
		config: any,
	) => Promise<{ success: boolean; message: string }>;
	disconnect: (
		connectionId: string,
	) => Promise<{ success: boolean; message?: string }>;
	getKeys: (
		connectionId: string,
		pattern?: string,
		cursor?: string,
		count?: number,
	) => Promise<{ keys: string[]; cursor: string }>;
	getKeyInfo: (
		connectionId: string,
		key: string,
	) => Promise<{ type: string; ttl: number; size: number }>;
	getKeyValue: (
		connectionId: string,
		key: string,
	) => Promise<{ type: string; value: any }>;
	deleteKey: (connectionId: string, key: string) => Promise<boolean>;
	executeCommand: (
		connectionId: string,
		command: string,
		args: string[],
	) => Promise<any>;
	getServerInfo: (connectionId: string) => Promise<any>;
	getClients: (connectionId: string) => Promise<any[]>;
	setKeyValue: (
		connectionId: string,
		key: string,
		value: any,
		type: string,
	) => Promise<boolean>;
	selectDatabase: (
		connectionId: string,
		dbNumber: number,
	) => Promise<{ success: boolean; message: string }>;
	getDatabaseCount: (
		connectionId: string,
	) => Promise<{ success: boolean; count: number; message?: string }>;
	getCurrentDatabase: (
		connectionId: string,
	) => Promise<{ success: boolean; db: number; message?: string }>;
	getPopulatedDatabases: (
		connectionId: string,
	) => Promise<{ success: boolean; databases: number[]; message?: string }>;
}

contextBridge.exposeInMainWorld("database", {
	connect: (id: string) => {
		console.log("[Preload] connect with ID:", id);
		return ipcRenderer.invoke("db:connect", id);
	},
	disconnect: (id: string) => {
		console.log("[Preload] disconnect with ID:", id);
		return ipcRenderer.invoke("db:disconnect", id);
	},
	query: (id: string, sql: string) => {
		console.log("[Preload] query with ID:", id);
		return ipcRenderer.invoke("db:query", id, sql);
	},
	getTables: (id: string) => {
		console.log("[Preload] getTables called with ID:", id);
		return ipcRenderer.invoke("db:getTables", id);
	},
	getPrimaryKey: (id: string, tableName: string) => {
		console.log("[Preload] getPrimaryKey with ID:", id, "table:", tableName);
		return ipcRenderer.invoke("db:getPrimaryKey", id, tableName);
	},
	updateCell: (
		id: string,
		tableName: string,
		primaryKeyColumn: string,
		primaryKeyValue: string | number,
		columnToUpdate: string,
		newValue: unknown,
	) => {
		console.log("[Preload] updateCell with ID:", id);
		return ipcRenderer.invoke(
			"db:updateCell",
			id,
			tableName,
			primaryKeyColumn,
			primaryKeyValue,
			columnToUpdate,
			newValue,
		);
	},
	isConnected: (id: string) => {
		console.log("[Preload] isConnected with ID:", id);
		return ipcRenderer.invoke("db:isConnected", id);
	},
	getActiveConnections: () => {
		return ipcRenderer.invoke("db:getActiveConnections");
	},
	getDatabaseSchema: (id: string) => {
		console.log("[Preload] getDatabaseSchema with ID:", id);
		return ipcRenderer.invoke("db:getDatabaseSchema", id);
	},
	getTableStructure: (connectionId: string, tableName: string) => {
		return ipcRenderer.invoke("db:getTableStructure", connectionId, tableName);
	},
	addRow: (
		connectionId: string,
		tableName: string,
		data: Record<string, unknown>,
	) => {
		return ipcRenderer.invoke("db:addRow", connectionId, tableName, data);
	},
});

// Add a new context bridge for window management
contextBridge.exposeInMainWorld("windowManager", {
	openConnectionWindow: (
		connectionId: string,
		connectionName: string,
		urlParams?: string,
	) => {
		console.log(
			"[Preload] opening new window for connection:",
			connectionId,
			connectionName,
			urlParams,
		);
		return ipcRenderer.invoke(
			"window:openConnectionWindow",
			connectionId,
			connectionName,
			urlParams,
		);
	},
	setMainWindowFullscreen: () => {
		console.log("[Preload] setting main window to fullscreen");
		return ipcRenderer.invoke("window:setMainWindowFullscreen");
	},
	focusConnectionWindow: (connectionId: string) => {
		console.log("[Preload] focusing window for connection:", connectionId);
		return ipcRenderer.invoke("window:focusConnectionWindow", connectionId);
	},
	getCurrentWindowId: () => {
		console.log("[Preload] getting current window ID");
		return ipcRenderer.invoke("window:getCurrentWindowId");
	},
	setWindowFullscreen: (windowId: number) => {
		console.log("[Preload] setting window to fullscreen:", windowId);
		return ipcRenderer.invoke("window:setWindowFullscreen", windowId);
	},
});

// Add window tracking API
contextBridge.exposeInMainWorld("api", {
	onWindowClosed: (callback: (connectionId: string) => void) => {
		ipcRenderer.on("window:closed", (_event, connectionId) => {
			callback(connectionId);
		});
	},
	offWindowClosed: () => {
		ipcRenderer.removeAllListeners("window:closed");
	},
	getOpenWindows: () => {
		return ipcRenderer.invoke("window:getOpenWindows");
	},
});

contextBridge.exposeInMainWorld("store", {
	getConnections: () => ipcRenderer.invoke("store:getConnections"),
	addConnection: (connection: Connection) =>
		ipcRenderer.invoke("store:addConnection", connection),
	deleteConnection: (id: string) =>
		ipcRenderer.invoke("store:deleteConnection", id),
	isConnected: (connectionId: string) =>
		ipcRenderer.invoke("db:isConnected", connectionId),
	getActiveConnections: () => ipcRenderer.invoke("db:getActiveConnections"),
	getSettings: () => ipcRenderer.invoke("store:getSettings"),
	updateSettings: (settings: AppSettings) =>
		ipcRenderer.invoke("store:updateSettings", settings),
	updateAISettings: (aiSettings: AISettings) =>
		ipcRenderer.invoke("store:updateAISettings", aiSettings),
});

// Add Redis API
contextBridge.exposeInMainWorld("redis", {
	connect: (connectionId: string, config: any) => {
		console.log("[Preload] Redis connect with ID:", connectionId);
		return ipcRenderer.invoke("redis:connect", { connectionId, config });
	},
	disconnect: (connectionId: string) => {
		console.log("[Preload] Redis disconnect with ID:", connectionId);
		return ipcRenderer.invoke("redis:disconnect", { connectionId });
	},
	getKeys: (connectionId: string, pattern = "*", cursor = "0", count = 100) => {
		console.log(
			"[Preload] Redis getKeys with ID:",
			connectionId,
			"pattern:",
			pattern,
		);
		return ipcRenderer.invoke("redis:getKeys", {
			connectionId,
			pattern,
			cursor,
			count,
		});
	},
	getKeyInfo: (connectionId: string, key: string) => {
		console.log(
			"[Preload] Redis getKeyInfo with ID:",
			connectionId,
			"key:",
			key,
		);
		return ipcRenderer.invoke("redis:getKeyInfo", { connectionId, key });
	},
	getKeyValue: (connectionId: string, key: string) => {
		console.log(
			"[Preload] Redis getKeyValue with ID:",
			connectionId,
			"key:",
			key,
		);
		return ipcRenderer.invoke("redis:getKeyValue", { connectionId, key });
	},
	deleteKey: (connectionId: string, key: string) => {
		console.log(
			"[Preload] Redis deleteKey with ID:",
			connectionId,
			"key:",
			key,
		);
		return ipcRenderer.invoke("redis:deleteKey", { connectionId, key });
	},
	executeCommand: (connectionId: string, command: string, args: string[]) => {
		console.log(
			"[Preload] Redis executeCommand with ID:",
			connectionId,
			"command:",
			command,
		);
		return ipcRenderer.invoke("redis:executeCommand", {
			connectionId,
			command,
			args,
		});
	},
	getServerInfo: (connectionId: string) => {
		console.log("[Preload] Redis getServerInfo with ID:", connectionId);
		return ipcRenderer.invoke("redis:getServerInfo", { connectionId });
	},
	getClients: (connectionId: string) => {
		console.log("[Preload] Redis getClients with ID:", connectionId);
		return ipcRenderer.invoke("redis:getClients", { connectionId });
	},
	setKeyValue: (
		connectionId: string,
		key: string,
		value: any,
		type: string,
	) => {
		console.log(
			"[Preload] Redis setKeyValue with ID:",
			connectionId,
			"key:",
			key,
		);
		return ipcRenderer.invoke("redis:setKeyValue", {
			connectionId,
			key,
			value,
			type,
		});
	},
	selectDatabase: (connectionId: string, dbNumber: number) => {
		console.log(
			"[Preload] Redis selectDatabase with ID:",
			connectionId,
			"dbNumber:",
			dbNumber,
		);
		return ipcRenderer.invoke("redis:selectDatabase", {
			connectionId,
			dbNumber,
		});
	},
	getDatabaseCount: (connectionId: string) => {
		console.log("[Preload] Redis getDatabaseCount with ID:", connectionId);
		return ipcRenderer.invoke("redis:getDatabaseCount", { connectionId });
	},
	getCurrentDatabase: (connectionId: string) => {
		console.log("[Preload] Redis getCurrentDatabase with ID:", connectionId);
		return ipcRenderer.invoke("redis:getCurrentDatabase", { connectionId });
	},
	getPopulatedDatabases: (connectionId: string) => {
		console.log("[Preload] Redis getPopulatedDatabases with ID:", connectionId);
		return ipcRenderer.invoke("redis:getPopulatedDatabases", { connectionId });
	},
});

// Type declarations for TypeScript
declare global {
	interface Window {
		database: Database;
		store: Store;
		windowManager: WindowManager;
		api: API;
		redis: Redis;
	}
}
