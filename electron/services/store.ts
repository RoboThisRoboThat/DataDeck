import Store from "electron-store";
import type { Connection } from "../../src/types/connection";
import type { AppSettings, AISettings } from "../../src/types/settings";
import DatabaseService from "./database.service";
import redisService from "./redis.service";

// Define TableSchema interface
interface TableSchemaColumn {
	name: string;
	type: string;
	length?: number;
	precision?: number;
	isPrimary: boolean;
	isNullable: boolean;
	defaultValue?: string;
}

interface TableSchemaForeignKey {
	column: string;
	referencedTable: string;
	referencedColumn: string;
}

interface TableSchema {
	name: string;
	columns: TableSchemaColumn[];
	foreignKeys: TableSchemaForeignKey[];
}

interface StoreSchema {
	connections: Connection[];
}

// Settings store schema
interface SettingsSchema {
	settings: AppSettings;
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

// Schema cache interface
interface SchemaCache {
	schemas: {
		[connectionId: string]: {
			timestamp: number;
			data: TableSchema[];
		};
	};
}

const connectionStore = new Store<StoreSchema>({
	defaults: {
		connections: [],
	},
});

// Separate store for queries with proper schema validation
const queryStore = new Store<QueryStoreSchema>({
	name: "saved-queries",
	schema: {
		queries: {
			type: "object",
			additionalProperties: {
				type: "object",
				additionalProperties: {
					type: "object",
					properties: {
						name: { type: "string" },
						sql: { type: "string" },
						createdAt: { type: "string" },
						description: { type: "string" },
					},
					required: ["name", "sql", "createdAt"],
				},
			},
		},
	},
	defaults: {
		queries: {},
	},
});

// Schema cache store
const schemaStore = new Store<SchemaCache>({
	name: "schema-cache",
	schema: {
		schemas: {
			type: "object",
			additionalProperties: {
				type: "object",
				properties: {
					timestamp: { type: "number" },
					data: { type: "array" },
				},
				required: ["timestamp", "data"],
			},
		},
	},
	defaults: {
		schemas: {},
	},
});

// Add settings store
const settingsStore = new Store<SettingsSchema>({
	name: "app-settings",
	schema: {
		settings: {
			type: "object",
			properties: {
				ai: {
					type: "object",
					properties: {
						openaiApiKey: { type: "string" },
						claudeApiKey: { type: "string" },
					},
					required: ["openaiApiKey", "claudeApiKey"],
				},
			},
			required: ["ai"],
		},
	},
	defaults: {
		settings: {
			ai: {
				openaiApiKey: "",
				claudeApiKey: "",
			},
		},
	},
	// Enable encryption for sensitive data
	encryptionKey: "data-deck-secure-settings-key",
	clearInvalidConfig: true, // Clear and reset if the config becomes invalid
});

// Map to store active database service instances
const activeConnections = new Map<string, DatabaseService>();
// Track Redis connections separately
const activeRedisConnections = new Set<string>();

export const storeService = {
	getConnections: () => {
		// Get connections from store but DON'T attach service instances
		const connections = connectionStore.get("connections");
		return connections.map((conn) => ({ ...conn })); // Return plain objects, not service instances
	},

	addConnection: (connection: Connection) => {
		const connections = connectionStore.get("connections");
		connectionStore.set("connections", [...connections, connection]);
		return connectionStore.get("connections").map((conn) => ({ ...conn })); // Return plain objects
	},

	deleteConnection: (id: string) => {
		// Disconnect if active
		if (activeConnections.has(id)) {
			activeConnections.get(id)?.disconnect();
			activeConnections.delete(id);
		}

		const connections = connectionStore.get("connections");
		connectionStore.set(
			"connections",
			connections.filter((conn) => conn.id !== id),
		);

		// Also clear any cached schema for this connection
		const schemas = schemaStore.get("schemas");
		if (schemas[id]) {
			delete schemas[id];
			schemaStore.set("schemas", schemas);
		}

		return connectionStore.get("connections").map((conn) => ({ ...conn })); // Return plain objects
	},

	updateAllConnections: (connections: Connection[]) => {
		connectionStore.set("connections", connections);
		return connectionStore.get("connections").map((conn) => ({ ...conn })); // Return plain objects
	},

	connectToDb: async (id: string) => {
		const connections = connectionStore.get("connections");
		const connection = connections.find((conn) => conn.id === id);

		if (!connection) {
			return {
				success: false,
				message: "Connection not found",
				connected: false,
			};
		}

		// Create a base result object with consistent properties
		const baseResult = {
			id: connection.id,
			name: connection.name,
			dbType: connection.dbType,
		};

		// Handle Redis connections differently
		if (connection.dbType === "redis") {
			console.log("Print the database type here=====>", connection.dbType);

			try {
				// Use Redis service for Redis connections
				const result = await redisService.connect(id, connection);

				if (result.success) {
					// Track active Redis connections
					activeRedisConnections.add(id);

					return {
						...baseResult,
						connected: true,
						success: true,
						message: result.message,
					};
				}

				return {
					...baseResult,
					connected: false,
					success: false,
					message: result.message,
				};
			} catch (error) {
				console.error("Error connecting to Redis:", error);
				return {
					...baseResult,
					connected: false,
					success: false,
					message:
						error instanceof Error
							? error.message
							: "Unknown Redis connection error",
				};
			}
		}

		if (connection.dbType === "mysql" || connection.dbType === "postgres") {
			// For SQL connections, use the DatabaseService
			const dbService = new DatabaseService(connection.dbType);

			// Safely check for required SQL properties
			const host = "host" in connection ? connection.host : undefined;
			const port = "port" in connection ? connection.port : undefined;
			const user = "user" in connection ? connection.user : undefined;
			const password =
				"password" in connection ? connection.password : undefined;
			const database =
				"database" in connection ? connection.database : undefined;

			// Verify all required properties exist
			if (!host || !port || !user || password === undefined || !database) {
				return {
					...baseResult,
					connected: false,
					success: false,
					message: "Invalid SQL connection configuration",
				};
			}

			// Attempt to connect
			try {
				const result = await dbService.connect({
					host,
					port,
					user,
					password,
					database,
					dbType: connection.dbType,
				});

				if (result.success) {
					// Store the active service if successful
					activeConnections.set(id, dbService);

					// Return a plain object (not a service instance)
					return {
						...baseResult,
						connected: true,
						success: true,
						message: result.message,
					};
				}

				return {
					...baseResult,
					connected: false,
					success: false,
					message: result.message,
				};
			} catch (error) {
				console.error("Error connecting to SQL database:", error);
				return {
					...baseResult,
					connected: false,
					success: false,
					message:
						error instanceof Error
							? error.message
							: "Unknown SQL connection error",
				};
			}
		}

		if (connection.dbType === "mongodb") {
			// MongoDB connections are not yet fully implemented
			return {
				...baseResult,
				connected: false,
				success: false,
				message: "MongoDB connections are not fully implemented yet",
			};
		}

		// Handle unknown connection types
		return {
			...baseResult,
			connected: false,
			success: false,
			message: `Unsupported connection type: ${connection.dbType}`,
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
			throw new Error(
				`Database service not found for connection: ${connectionId}`,
			);
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
		if (!service) throw new Error("No active connection with this ID");

		return await service.getPrimaryKey(tableName);
	},

	async getTableStructure(connectionId: string, tableName: string) {
		const service = activeConnections.get(connectionId);
		if (!service) throw new Error("No active connection with this ID");

		return await service.getTableStructure(tableName);
	},

	async updateCell(
		connectionId: string,
		tableName: string,
		primaryKeyColumn: string,
		primaryKeyValue: string | number,
		columnToUpdate: string,
		newValue: unknown,
	) {
		const service = activeConnections.get(connectionId);
		if (!service) throw new Error("No active connection with this ID");

		return await service.updateCell(
			tableName,
			primaryKeyColumn,
			primaryKeyValue,
			columnToUpdate,
			newValue,
		);
	},

	// Get active connection status
	isConnected(connectionId: string) {
		return (
			activeConnections.has(connectionId) ||
			activeRedisConnections.has(connectionId)
		);
	},

	// Get all active connections
	getActiveConnections() {
		const sqlConnections = Array.from(activeConnections.keys());
		const redisConnections = Array.from(activeRedisConnections);
		return [...sqlConnections, ...redisConnections];
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
			throw new Error("Missing connection ID, name, or SQL query");
		}

		try {
			// Get existing queries for this connection
			const connectionQueries = queryStore.get(
				`queries.${connectionId}`,
				{} as Record<string, SavedQuery>,
			);

			// Add new query
			connectionQueries[name] = {
				name,
				sql,
				createdAt: new Date().toISOString(),
				...(description && { description }),
			};

			// Save to store
			queryStore.set(`queries.${connectionId}`, connectionQueries);

			return { success: true, shouldRefresh };
		} catch (error) {
			console.error("Error saving query:", error);
			throw error;
		}
	},

	getSavedQueries: async (connectionId: string) => {
		if (!connectionId) {
			throw new Error("Missing connection ID");
		}

		try {
			// Get queries for this connection
			const connectionQueries = queryStore.get(
				`queries.${connectionId}`,
				{} as Record<string, SavedQuery>,
			);

			// Convert from object to array and sort by created date
			const queriesArray = Object.values(connectionQueries) as SavedQuery[];

			// Make sure the "Unsaved Query" is always included
			if (!queriesArray.some((q) => q.name === "Unsaved Query")) {
				// Create an empty unsaved query if none exists
				connectionQueries["Unsaved Query"] = {
					name: "Unsaved Query",
					sql: "",
					createdAt: new Date().toISOString(),
				};
				queryStore.set(`queries.${connectionId}`, connectionQueries);

				// Add to the array
				queriesArray.push(connectionQueries["Unsaved Query"]);
			}

			// Sort - but put Unsaved Query at the end
			queriesArray.sort((a, b) => {
				// Always put Unsaved Query at the end
				if (a.name === "Unsaved Query") return 1;
				if (b.name === "Unsaved Query") return -1;

				// Sort others by creation date, newest first
				return (
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				);
			});

			return { queries: queriesArray };
		} catch (error) {
			console.error("Error getting saved queries:", error);
			throw error;
		}
	},

	deleteQuery: async (connectionId: string, name: string) => {
		if (!connectionId || !name) {
			throw new Error("Missing connection ID or query name");
		}

		try {
			// Get existing queries for this connection
			const connectionQueries = queryStore.get(
				`queries.${connectionId}`,
				{} as Record<string, SavedQuery>,
			);

			// Remove the query
			delete connectionQueries[name];

			// Save to store
			queryStore.set(`queries.${connectionId}`, connectionQueries);

			return { success: true };
		} catch (error) {
			console.error("Error deleting query:", error);
			throw error;
		}
	},

	// Database operations
	disconnectFromDb: async (connectionId: string) => {
		// Check if it's a Redis connection
		if (activeRedisConnections.has(connectionId)) {
			try {
				await redisService.disconnect(connectionId);
				activeRedisConnections.delete(connectionId);
				return { success: true };
			} catch (error) {
				console.error("Redis disconnect error:", error);
				return {
					success: false,
					message:
						error instanceof Error
							? error.message
							: "Unknown Redis disconnection error",
				};
			}
		}

		// Handle SQL connections as before
		const service = activeConnections.get(connectionId);
		if (service) {
			await service.disconnect();
			activeConnections.delete(connectionId);
			return { success: true };
		}
		return { success: false, message: "No active connection found" };
	},

	cancelQuery: async (connectionId: string) => {
		const service = activeConnections.get(connectionId);
		if (!service) {
			throw new Error(`No active connection for ID: ${connectionId}`);
		}
		return await service.cancelQuery();
	},

	// Schema cache operations
	cacheSchema: async (connectionId: string, schemaData: TableSchema[]) => {
		console.log(`Caching schema for connection ${connectionId}`);

		try {
			const schemas = schemaStore.get("schemas");

			// Store the schema with a timestamp
			schemas[connectionId] = {
				timestamp: Date.now(),
				data: schemaData,
			};

			schemaStore.set("schemas", schemas);
			return { success: true };
		} catch (error) {
			console.error("Error caching schema:", error);
			throw error;
		}
	},

	getCachedSchema: async (connectionId: string) => {
		console.log(`Getting cached schema for connection ${connectionId}`);

		try {
			const schemas = schemaStore.get("schemas");
			const cachedSchema = schemas[connectionId];

			if (!cachedSchema) {
				console.log(`No cached schema found for connection ${connectionId}`);
				return { success: false, cached: false };
			}

			// Get cache age in minutes
			const cacheAgeMinutes =
				(Date.now() - cachedSchema.timestamp) / (1000 * 60);
			console.log(`Cache age: ${cacheAgeMinutes.toFixed(2)} minutes`);

			return {
				success: true,
				cached: true,
				data: cachedSchema.data,
				timestamp: cachedSchema.timestamp,
				age: cacheAgeMinutes,
			};
		} catch (error) {
			console.error("Error getting cached schema:", error);
			throw error;
		}
	},

	clearCachedSchema: async (connectionId: string) => {
		console.log(`Clearing cached schema for connection ${connectionId}`);

		try {
			const schemas = schemaStore.get("schemas");

			if (schemas[connectionId]) {
				delete schemas[connectionId];
				schemaStore.set("schemas", schemas);
			}

			return { success: true };
		} catch (error) {
			console.error("Error clearing cached schema:", error);
			throw error;
		}
	},

	getDatabaseSchema: async (connectionId: string, forceRefresh = false) => {
		// Check if there's a cached schema first
		const service = activeConnections.get(connectionId);
		if (!forceRefresh) {
			try {
				const cachedResult = await storeService.getCachedSchema(connectionId);
				if (cachedResult.success && cachedResult.cached) {
					console.log(`Using cached schema for connection ${connectionId}`);
					return {
						data: cachedResult.data,
						dbType: service?.dbType,
					};
				}
			} catch (error) {
				console.error("Error checking for cached schema:", error);
				// Continue with live fetch if cache check fails
			}
		}

		// If no cache or force refresh, get fresh data
		console.log(`Fetching fresh schema for connection ${connectionId}`);
		if (!service) {
			throw new Error(`No active connection for ID: ${connectionId}`);
		}

		// Get fresh schema
		const schemaData = await service.getDatabaseSchema();

		// Get database type
		const dbType = service.dbType;

		// Cache the fresh schema
		await storeService.cacheSchema(connectionId, schemaData);

		return {
			data: schemaData,
			dbType: dbType,
		};
	},

	// Settings methods
	getSettings: () => {
		try {
			const settings = settingsStore.get("settings");
			return (
				settings || {
					ai: {
						openaiApiKey: "",
						claudeApiKey: "",
					},
				}
			);
		} catch (error) {
			console.error("Error getting settings:", error);
			// Return default settings if there's an error
			return {
				ai: {
					openaiApiKey: "",
					claudeApiKey: "",
				},
			};
		}
	},

	updateSettings: (settings: AppSettings) => {
		try {
			settingsStore.set("settings", settings);
			return settingsStore.get("settings");
		} catch (error) {
			console.error("Error updating settings:", error);
			throw error;
		}
	},

	updateAISettings: (aiSettings: AISettings) => {
		try {
			settingsStore.set("settings.ai", aiSettings);
			return settingsStore.get("settings.ai");
		} catch (error) {
			console.error("Error updating AI settings:", error);
			throw error;
		}
	},

	async addRow(
		connectionId: string,
		tableName: string,
		data: Record<string, unknown>,
	) {
		const service = activeConnections.get(connectionId);
		if (!service) throw new Error("No active connection with this ID");

		return await service.addRow(tableName, data);
	},
};
