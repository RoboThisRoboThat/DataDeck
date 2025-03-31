import mysql from "mysql2/promise";

class MySQLService {
	connection: mysql.Connection | null = null;

	async connect(config: {
		host: string;
		port: string;
		user: string;
		password: string;
		database: string;
	}) {
		try {
			this.connection = await mysql.createConnection({
				host: config.host,
				port: Number.parseInt(config.port),
				user: config.user,
				password: config.password,
				database: config.database,
			});

			// Test the connection
			await this.connection.connect();
			return { success: true, message: "Connected successfully" };
		} catch (error) {
			console.error("Error connecting to MySQL:", error);
			return {
				success: false,
				message: error instanceof Error ? error.message : "Failed to connect",
			};
		}
	}

	async disconnect() {
		try {
			if (this.connection) {
				await this.connection.end();
				this.connection = null;
			}
		} catch (error) {
			console.error("Error disconnecting from MySQL:", error);
		}
	}

	async query(sql: string) {
		try {
			if (!this.connection) {
				throw new Error("No database connection");
			}

			const [results] = await this.connection.execute(sql);
			console.log("MySQL query results:", results[0]);
			return results;
		} catch (error) {
			console.error("Error in query method:", error);

			// Check if the error message includes "closed"
			if (
				error instanceof Error &&
				error.message.toLowerCase().includes("closed")
			) {
				console.log("Connection closed, attempting to reconnect...");
				try {
					// Get the current connection config and reconnect
					if (this.connection) {
						const config = this.connection.config;
						await this.disconnect();
						await this.connect({
							host: config.host as string,
							port: String(config.port),
							user: config.user as string,
							password: config.password as string,
							database: config.database as string,
						});

						// Try the query again
						if (this.connection) {
							const [results] = await this.connection.execute(sql);
							return results;
						}
					}
				} catch (reconnectError) {
					console.error("Failed to reconnect and retry query:", reconnectError);
					throw reconnectError;
				}
			}

			throw error;
		}
	}

	async getTables() {
		try {
			if (!this.connection) {
				throw new Error("No MySQL connection");
			}
			// Use INFORMATION_SCHEMA instead of SHOW TABLES to get the exact case
			const [rows] = await this.connection.execute(
				"SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()",
			);
			return rows;
		} catch (error) {
			console.error("Error in getTables method:", error);
			throw error;
		}
	}

	async tableExists(tableName: string): Promise<boolean> {
		if (!this.connection) return false;
		try {
			const [rows] = await this.connection.execute(
				"SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
				[tableName],
			);
			return (rows as Array<{ count: number }>)[0].count > 0;
		} catch (error) {
			console.error("Error checking if MySQL table exists:", error);
			return false;
		}
	}

	async getPrimaryKey(tableName: string): Promise<string[]> {
		if (!this.connection) throw new Error("No MySQL connection");
		try {
			console.log("Executing MySQL primary key query");
			const [rows] = await this.connection.execute(
				`SELECT COLUMN_NAME 
                 FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                 WHERE TABLE_SCHEMA = DATABASE() 
                 AND TABLE_NAME = ? 
                 AND CONSTRAINT_NAME = 'PRIMARY'`,
				[tableName],
			);
			const primaryKeys = (rows as Array<{ COLUMN_NAME: string }>).map(
				(row) => row.COLUMN_NAME,
			);
			console.log("MySQL primary keys found:", primaryKeys);
			return primaryKeys;
		} catch (error) {
			console.error("Error getting MySQL primary key:", error);
			return [];
		}
	}

	async updateCell(
		tableName: string,
		primaryKeyColumn: string,
		primaryKeyValue: string | number,
		columnToUpdate: string,
		newValue: unknown,
	): Promise<boolean> {
		if (!this.connection) throw new Error("No MySQL connection");
		try {
			const sql = `UPDATE ${tableName} SET ${columnToUpdate} = ? WHERE ${primaryKeyColumn} = ?`;
			console.log("MySQL update SQL:", sql);
			await this.connection.execute(sql, [newValue, primaryKeyValue]);
			console.log("Cell update successful");
			return true;
		} catch (error) {
			console.error("Error updating cell:", error);
			throw error;
		}
	}

	async cancelQuery(): Promise<boolean> {
		if (!this.connection) {
			throw new Error("No database connection");
		}

		try {
			// MySQL doesn't have a direct way to cancel queries
			// The best we can do is kill the current connection and reconnect
			await this.connection.end();
			this.connection = null;
			return true;
		} catch (error) {
			console.error("Error canceling query:", error);
			return false;
		}
	}

	async getDatabaseSchema() {
		if (!this.connection) {
			throw new Error("No MySQL connection");
		}

		try {
			// Get all tables
			const [tables] = await this.connection.execute(`
                SELECT TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = DATABASE()
            `);

			const result = [];

			for (const table of tables as Array<{ TABLE_NAME: string }>) {
				const tableName = table.TABLE_NAME;

				// Get columns with their properties
				const [columns] = await this.connection.execute(
					`
                    SELECT 
                        COLUMN_NAME, 
                        DATA_TYPE,
                        IS_NULLABLE,
                        COLUMN_KEY,
                        COLUMN_DEFAULT,
                        CHARACTER_MAXIMUM_LENGTH,
                        NUMERIC_PRECISION
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = ?
                `,
					[tableName],
				);

				// Get foreign keys
				const [foreignKeys] = await this.connection.execute(
					`
                    SELECT
                        COLUMN_NAME,
                        REFERENCED_TABLE_NAME,
                        REFERENCED_COLUMN_NAME
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = ?
                    AND REFERENCED_TABLE_NAME IS NOT NULL
                `,
					[tableName],
				);

				const tableInfo = {
					name: tableName,
					columns: (
						columns as Array<{
							COLUMN_NAME: string;
							DATA_TYPE: string;
							CHARACTER_MAXIMUM_LENGTH: number | null;
							NUMERIC_PRECISION: number | null;
							COLUMN_KEY: string;
							IS_NULLABLE: string;
							COLUMN_DEFAULT: string | null;
						}>
					).map((col) => ({
						name: col.COLUMN_NAME,
						type: col.DATA_TYPE,
						length: col.CHARACTER_MAXIMUM_LENGTH,
						precision: col.NUMERIC_PRECISION,
						isPrimary: col.COLUMN_KEY === "PRI",
						isNullable: col.IS_NULLABLE === "YES",
						defaultValue: col.COLUMN_DEFAULT,
					})),
					foreignKeys: (
						foreignKeys as Array<{
							COLUMN_NAME: string;
							REFERENCED_TABLE_NAME: string;
							REFERENCED_COLUMN_NAME: string;
						}>
					).map((fk) => ({
						column: fk.COLUMN_NAME,
						referencedTable: fk.REFERENCED_TABLE_NAME,
						referencedColumn: fk.REFERENCED_COLUMN_NAME,
					})),
				};

				result.push(tableInfo);
			}

			return result;
		} catch (error) {
			console.error("Error extracting MySQL database schema:", error);
			throw error;
		}
	}

	async getTableStructure(tableName: string) {
		if (!this.connection) {
			throw new Error("No MySQL connection");
		}

		try {
			// Get columns with their data types
			const [columns] = await this.connection.execute(
				`
                SELECT 
                    COLUMN_NAME, 
                    DATA_TYPE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = ?
                ORDER BY ORDINAL_POSITION
            `,
				[tableName],
			);

			// Map MySQL data types to the simplified types required
			return (columns as Array<{ COLUMN_NAME: string; DATA_TYPE: string }>).map(
				(col) => ({
					column: col.COLUMN_NAME,
					type: col.DATA_TYPE.toLowerCase(),
				}),
			);
		} catch (error) {
			console.error("Error getting MySQL table structure:", error);
			throw error;
		}
	}

	async addRow(
		tableName: string,
		data: Record<string, unknown>,
	): Promise<boolean> {
		if (!this.connection) throw new Error("No MySQL connection");
		try {
			// Extract column names and values
			const columns = Object.keys(data);
			const values = Object.values(data);

			// Build the SQL query
			const placeholders = columns.map(() => "?").join(", ");
			const columnsList = columns.join(", ");

			const sql = `INSERT INTO ${tableName} (${columnsList}) VALUES (${placeholders})`;
			console.log("MySQL add row SQL:", sql);

			await this.connection.execute(sql, values);
			console.log("Row addition successful");
			return true;
		} catch (error) {
			console.error("Error adding row:", error);
			throw error;
		}
	}
}

export default MySQLService;
