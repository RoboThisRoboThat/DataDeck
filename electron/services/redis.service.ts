import Redis, { type RedisOptions } from "ioredis";
import { EventEmitter } from "node:events";

interface RedisConnection {
	id: string;
	client: Redis;
	type: "standalone" | "cluster" | "sentinel";
}

class RedisService extends EventEmitter {
	private connections: Map<string, RedisConnection> = new Map();

	/**
	 * Connect to a Redis server
	 */
	async connect(
		connectionId: string,
		config: any,
	): Promise<{ success: boolean; message: string }> {
		try {
			// Disconnect if already connected
			if (this.connections.has(connectionId)) {
				await this.disconnect(connectionId);
			}

			const options: RedisOptions = {
				host: config.host || "localhost",
				port: Number.parseInt(config.port || "6379", 10),
				username: config.username || undefined,
				password: config.password || undefined,
				db: Number.parseInt(config.database || "0", 10),
				connectTimeout: 10000,
				lazyConnect: true,
			};

			// Handle connection string if provided
			if (config.connectionString) {
				const client = new Redis(config.connectionString);
				this.connections.set(connectionId, {
					id: connectionId,
					client,
					type: "standalone",
				});
			} else {
				// Create a new Redis client
				const client = new Redis(options);
				this.connections.set(connectionId, {
					id: connectionId,
					client,
					type: "standalone",
				});
			}

			// Test the connection
			const connection = this.connections.get(connectionId);
			if (!connection) {
				throw new Error("Failed to create Redis connection");
			}

			const ping = await connection.client.ping();
			console.log("Here is ping", ping);

			return { success: true, message: "Connected to Redis server" };
		} catch (error) {
			console.error("Redis connection error:", error);
			// Clean up failed connection
			this.connections.delete(connectionId);
			return {
				success: false,
				message:
					error instanceof Error
						? error.message
						: "Unknown Redis connection error",
			};
		}
	}

	/**
	 * Disconnect from a Redis server
	 */
	async disconnect(
		connectionId: string,
	): Promise<{ success: boolean; message?: string }> {
		try {
			const connection = this.connections.get(connectionId);
			if (!connection) {
				return { success: true, message: "Connection not found" };
			}

			await connection.client.quit();
			this.connections.delete(connectionId);
			return { success: true, message: "Disconnected from Redis server" };
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

	/**
	 * Check if a connection is active
	 */
	isConnected(connectionId: string): boolean {
		const connection = this.connections.get(connectionId);
		if (!connection) return false;
		return connection.client.status === "ready";
	}

	/**
	 * Get all keys matching a pattern
	 */
	async getKeys(
		connectionId: string,
		pattern = "*",
		cursor = "0",
		count = 100,
	): Promise<{ keys: string[]; cursor: string }> {
		try {
			const connection = this.connections.get(connectionId);
			if (!connection) {
				throw new Error("Redis connection not found");
			}

			// Use SCAN for better performance with large datasets
			const [nextCursor, keys] = await connection.client.scan(
				cursor,
				"MATCH",
				pattern,
				"COUNT",
				count,
			);
			console.log("Here is next Cursor", nextCursor);
			console.log("Here is keys", keys);
			return {
				keys,
				cursor: nextCursor,
			};
		} catch (error) {
			console.error("Redis getKeys error:", error);
			throw error;
		}
	}

	/**
	 * Get information about a key
	 */
	async getKeyInfo(
		connectionId: string,
		key: string,
	): Promise<{ type: string; ttl: number; size: number }> {
		try {
			const connection = this.connections.get(connectionId);
			if (!connection) {
				throw new Error("Redis connection not found");
			}

			// Get the type of the key
			const type = await connection.client.type(key);

			// Get the TTL
			const ttl = await connection.client.ttl(key);

			// Get memory usage (if available)
			let size = 0;
			try {
				size = await connection.client.call("MEMORY", "USAGE", key);
			} catch (err) {
				// MEMORY USAGE may not be available in older Redis versions
				console.warn("MEMORY USAGE command failed, may not be supported:", err);
				// Try to estimate size based on the key type
				try {
					if (type.toLowerCase() === "string") {
						const value = await connection.client.get(key);
						size = value ? Buffer.byteLength(value) : 0;
					}
					// For other types we'll just keep it as 0
				} catch (estimateErr) {
					// If estimation fails, keep size as 0
					console.warn("Failed to estimate key size:", estimateErr);
				}
			}

			return { type, ttl, size };
		} catch (error) {
			console.error("Redis getKeyInfo error:", error);
			throw error;
		}
	}

	/**
	 * Get the value of a key based on its type
	 */
	async getKeyValue(
		connectionId: string,
		key: string,
	): Promise<{ type: string; value: any }> {
		try {
			const connection = this.connections.get(connectionId);
			if (!connection) {
				throw new Error("Redis connection not found");
			}

			const type = await connection.client.type(key);
			let value;

			switch (type.toLowerCase()) {
				case "string":
					value = await connection.client.get(key);
					break;
				case "list":
					value = await connection.client.lrange(key, 0, -1);
					break;
				case "set":
					value = await connection.client.smembers(key);
					break;
				case "zset":
					value = await connection.client.zrange(key, 0, -1, "WITHSCORES");
					// Convert array to object for better display
					const zsetObj: Record<string, string> = {};
					for (let i = 0; i < value.length; i += 2) {
						zsetObj[value[i]] = value[i + 1];
					}
					value = zsetObj;
					break;
				case "hash":
					value = await connection.client.hgetall(key);
					break;
				case "stream":
					// Basic stream support - get the latest 10 entries
					value = await connection.client.xrange(key, "-", "+", "COUNT", 10);
					break;
				case "none":
					throw new Error(`Key '${key}' does not exist`);
				default:
					throw new Error(`Unsupported Redis data type: ${type}`);
			}

			return { type, value };
		} catch (error) {
			console.error("Redis getKeyValue error:", error);
			throw error;
		}
	}

	/**
	 * Execute a raw Redis command
	 */
	async executeCommand(
		connectionId: string,
		command: string,
		args: string[],
	): Promise<any> {
		try {
			const connection = this.connections.get(connectionId);
			if (!connection) {
				throw new Error("Redis connection not found");
			}

			return await connection.client.call(command, ...args);
		} catch (error) {
			console.error("Redis executeCommand error:", error);
			throw error;
		}
	}

	/**
	 * Set a key's value
	 */
	async setKeyValue(
		connectionId: string,
		key: string,
		value: any,
		type: string,
	): Promise<boolean> {
		try {
			const connection = this.connections.get(connectionId);
			if (!connection) {
				throw new Error("Redis connection not found");
			}

			switch (type.toLowerCase()) {
				case "string":
					await connection.client.set(key, value);
					break;
				case "list":
					// Assume value is an array
					if (!Array.isArray(value)) {
						throw new Error("Value must be an array for list type");
					}
					// Delete the key first to ensure we start with a fresh list
					await connection.client.del(key);
					if (value.length > 0) {
						await connection.client.rpush(key, ...value);
					}
					break;
				case "set":
					// Assume value is an array
					if (!Array.isArray(value)) {
						throw new Error("Value must be an array for set type");
					}
					// Delete the key first to ensure we start with a fresh set
					await connection.client.del(key);
					if (value.length > 0) {
						await connection.client.sadd(key, ...value);
					}
					break;
				case "hash":
					// Assume value is an object
					if (typeof value !== "object" || value === null) {
						throw new Error("Value must be an object for hash type");
					}
					// Delete the key first to ensure we start with a fresh hash
					await connection.client.del(key);
					// Convert object to array of field-value pairs
					const fieldValues = Object.entries(value).flat();
					if (fieldValues.length > 0) {
						await connection.client.hset(key, ...fieldValues);
					}
					break;
				default:
					throw new Error(`Unsupported Redis data type for writing: ${type}`);
			}

			return true;
		} catch (error) {
			console.error("Redis setKeyValue error:", error);
			throw error;
		}
	}

	/**
	 * Delete a key
	 */
	async deleteKey(connectionId: string, key: string): Promise<boolean> {
		try {
			const connection = this.connections.get(connectionId);
			if (!connection) {
				throw new Error("Redis connection not found");
			}

			const result = await connection.client.del(key);
			return result > 0;
		} catch (error) {
			console.error("Redis deleteKey error:", error);
			throw error;
		}
	}

	/**
	 * Get server info
	 */
	async getServerInfo(connectionId: string): Promise<any> {
		try {
			const connection = this.connections.get(connectionId);
			if (!connection) {
				throw new Error("Redis connection not found");
			}

			const info = await connection.client.info();

			// Parse the INFO response into a structured object
			const result: Record<string, any> = {};
			const sections = info.split("#");

			for (const section of sections) {
				if (!section.trim()) continue;

				const lines = section.split("\n").filter(Boolean);
				const sectionName = lines[0]
					.trim()
					.toLowerCase()
					.replace(/[^a-z0-9]/g, "_");

				if (sectionName && lines.length > 1) {
					result[sectionName] = {};

					for (let i = 1; i < lines.length; i++) {
						const line = lines[i].trim();
						if (!line) continue;

						const [key, value] = line.split(":");
						if (key && value !== undefined) {
							result[sectionName][key] = value;
						}
					}
				}
			}

			return result;
		} catch (error) {
			console.error("Redis getServerInfo error:", error);
			throw error;
		}
	}

	/**
	 * Get client list
	 */
	async getClients(connectionId: string): Promise<any[]> {
		try {
			const connection = this.connections.get(connectionId);
			if (!connection) {
				throw new Error("Redis connection not found");
			}

			const clientListStr = await connection.client.client("LIST");
			const clientList = clientListStr.split("\n").filter(Boolean);

			return clientList.map((client) => {
				const clientObj: Record<string, string> = {};
				const properties = client.split(" ");

				for (const prop of properties) {
					const [key, value] = prop.split("=");
					if (key && value !== undefined) {
						clientObj[key] = value;
					}
				}

				return clientObj;
			});
		} catch (error) {
			console.error("Redis getClients error:", error);
			throw error;
		}
	}

	/**
	 * Select a different Redis database
	 */
	async selectDatabase(
		connectionId: string,
		dbNumber: number,
	): Promise<{ success: boolean; message: string }> {
		try {
			const connection = this.connections.get(connectionId);
			if (!connection) {
				throw new Error("Redis connection not found");
			}

			// Execute SELECT command to change database
			await connection.client.select(dbNumber);

			return { success: true, message: `Switched to database ${dbNumber}` };
		} catch (error) {
			console.error("Redis selectDatabase error:", error);
			return {
				success: false,
				message:
					error instanceof Error
						? error.message
						: "Unknown error selecting database",
			};
		}
	}

	/**
	 * Get available database count (typically 16 in default Redis config)
	 */
	async getDatabaseCount(
		connectionId: string,
	): Promise<{ success: boolean; count: number; message?: string }> {
		try {
			const connection = this.connections.get(connectionId);
			if (!connection) {
				throw new Error("Redis connection not found");
			}

			// Get server config to check database count
			const configValue = await connection.client.config("GET", "databases");
			let dbCount = 16; // Default Redis has 16 databases (0-15)

			if (Array.isArray(configValue) && configValue.length >= 2) {
				dbCount = parseInt(configValue[1], 10) || 16;
			}

			return { success: true, count: dbCount };
		} catch (error) {
			console.error("Redis getDatabaseCount error:", error);
			// Default to 16 databases if we can't determine the actual count
			return {
				success: false,
				count: 16,
				message: "Using default database count of 16",
			};
		}
	}

	/**
	 * Get the currently selected database number
	 */
	async getCurrentDatabase(
		connectionId: string,
	): Promise<{ success: boolean; db: number; message?: string }> {
		try {
			const connection = this.connections.get(connectionId);
			if (!connection) {
				throw new Error("Redis connection not found");
			}

			// Using INFO to get the current database number
			const info = await connection.client.info("keyspace");
			const match = info.match(/db(\d+):/);
			let currentDb = 0;

			if (match && match[1]) {
				currentDb = parseInt(match[1], 10);
			}

			return { success: true, db: currentDb };
		} catch (error) {
			console.error("Redis getCurrentDatabase error:", error);
			return { success: false, db: 0, message: "Assuming database 0" };
		}
	}

	/**
	 * Get a list of databases that contain keys
	 */
	async getPopulatedDatabases(
		connectionId: string,
	): Promise<{ success: boolean; databases: number[]; message?: string }> {
		try {
			const connection = this.connections.get(connectionId);
			if (!connection) {
				throw new Error("Redis connection not found");
			}

			// Use INFO KEYSPACE to get databases with keys
			const info = await connection.client.info("keyspace");
			const regex = /db(\d+):keys=(\d+)/g;
			const populatedDbs: number[] = [];

			let match;
			while ((match = regex.exec(info)) !== null) {
				const dbNumber = Number.parseInt(match[1], 10);
				const keyCount = Number.parseInt(match[2], 10);

				if (keyCount > 0) {
					populatedDbs.push(dbNumber);
				}
			}

			// Make sure we include the currently selected database even if empty
			const currentDbResult = await this.getCurrentDatabase(connectionId);
			const currentDb = currentDbResult.db;

			if (!populatedDbs.includes(currentDb)) {
				populatedDbs.push(currentDb);
			}

			// Sort the array numerically
			populatedDbs.sort((a, b) => a - b);

			return { success: true, databases: populatedDbs };
		} catch (error) {
			console.error("Redis getPopulatedDatabases error:", error);
			return {
				success: false,
				databases: [0],
				message: "Could not get database list",
			};
		}
	}
}

// Create a singleton instance
const redisService = new RedisService();
export default redisService;
