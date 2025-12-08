/**
 * Window type declarations for Electron IPC bridge.
 * Imports types from shared modules to avoid duplication.
 */

// Re-export shared types for convenience
export type {
	TableSchemaColumn,
	TableSchemaForeignKey,
	TableSchema,
	QueryResultColumn,
	QueryResult,
	ColumnStructure,
	TableInfo,
	ConnectionResult,
	DatabaseSchemaResult,
} from "./shared";

// Re-export Redis types
export type {
	RedisConfig,
	RedisKeyValue,
	RedisKeyInfo,
	RedisKeysResult,
	RedisServerInfo,
	RedisClientInfo,
	RedisConnectResult,
	RedisDisconnectResult,
	RedisSelectDbResult,
	RedisDatabaseCountResult,
	RedisCurrentDbResult,
	RedisPopulatedDbsResult,
	RedisCommandResult,
	RedisInputValue,
} from "./redis";

import type {
	TableSchema,
	ColumnStructure,
	QueryResult,
	TableInfo,
	ConnectionResult,
	DatabaseSchemaResult,
	Result,
} from "./shared";

import type {
	RedisConfig,
	RedisKeyValue,
	RedisKeyInfo,
	RedisKeysResult,
	RedisServerInfo,
	RedisClientInfo,
	RedisConnectResult,
	RedisDisconnectResult,
	RedisSelectDbResult,
	RedisDatabaseCountResult,
	RedisCurrentDbResult,
	RedisPopulatedDbsResult,
	RedisCommandResult,
	RedisInputValue,
} from "./redis";

/**
 * Database API exposed through the preload script
 */
interface Database {
	connect: (connectionId: string) => Promise<ConnectionResult>;
	disconnect: (connectionId: string) => Promise<Result>;
	query: (connectionId: string, sql: string) => Promise<QueryResult>;
	stopQuery: (connectionId: string) => Promise<Result>;
	getTables: (connectionId: string) => Promise<TableInfo[]>;
	getPrimaryKey: (connectionId: string, tableName: string) => Promise<string[]>;
	getTableStructure: (
		connectionId: string,
		tableName: string,
	) => Promise<ColumnStructure[]>;
	updateCell: (
		connectionId: string,
		tableName: string,
		primaryKeyColumn: string,
		primaryKeyValue: string | number,
		columnToUpdate: string,
		newValue: unknown,
	) => Promise<Result>;
	isConnected: (connectionId: string) => Promise<boolean>;
	getActiveConnections: () => Promise<string[]>;
	getDatabaseSchema: (
		connectionId: string,
		forceRefresh?: boolean,
	) => Promise<DatabaseSchemaResult>;
	clearSchemaCache: (connectionId: string) => Promise<Result>;
	addRow: (
		connectionId: string,
		tableName: string,
		data: Record<string, unknown>,
	) => Promise<boolean>;
}

/**
 * Redis API exposed through the preload script
 */
interface Redis {
	connect: (
		connectionId: string,
		config: RedisConfig,
	) => Promise<RedisConnectResult>;
	disconnect: (connectionId: string) => Promise<RedisDisconnectResult>;
	getKeys: (
		connectionId: string,
		pattern?: string,
		cursor?: string,
		count?: number,
	) => Promise<RedisKeysResult>;
	getKeyInfo: (connectionId: string, key: string) => Promise<RedisKeyInfo>;
	getKeyValue: (connectionId: string, key: string) => Promise<RedisKeyValue>;
	deleteKey: (connectionId: string, key: string) => Promise<boolean>;
	executeCommand: (
		connectionId: string,
		command: string,
		args: string[],
	) => Promise<RedisCommandResult>;
	getServerInfo: (connectionId: string) => Promise<RedisServerInfo>;
	getClients: (connectionId: string) => Promise<RedisClientInfo[]>;
	setKeyValue: (
		connectionId: string,
		key: string,
		value: RedisInputValue,
		type: string,
	) => Promise<boolean>;
	selectDatabase: (
		connectionId: string,
		dbNumber: number,
	) => Promise<RedisSelectDbResult>;
	getDatabaseCount: (
		connectionId: string,
	) => Promise<RedisDatabaseCountResult>;
	getCurrentDatabase: (
		connectionId: string,
	) => Promise<RedisCurrentDbResult>;
	getPopulatedDatabases: (
		connectionId: string,
	) => Promise<RedisPopulatedDbsResult>;
}

export type { Database, Redis };

// Global Window interface declaration
import type { Connection } from "./connection";
import type { AppSettings, AISettings } from "./settings";

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

interface API {
	onWindowClosed: (callback: (connectionId: string) => void) => void;
	offWindowClosed: () => void;
	getOpenWindows: () => Promise<Record<string, boolean>>;
}

interface ElectronAPI {
	ipcRenderer: {
		on: (...args: unknown[]) => void;
		off: (...args: unknown[]) => void;
		send: (...args: unknown[]) => void;
		invoke: (channel: string, args: unknown) => Promise<unknown>;
	};
}

declare global {
	interface Window {
		database: Database;
		store: Store;
		windowManager: WindowManager;
		api: API;
		redis: Redis;
		electron: ElectronAPI;
	}
}

