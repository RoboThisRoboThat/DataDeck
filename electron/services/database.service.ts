import MySQLService from "./mysql.service";
import PostgresService from "./postgres.service";

class DatabaseService {
	private dbType: "mysql" | "postgres" = "mysql";
	private service: MySQLService | PostgresService = new MySQLService();

	constructor(dbType: "mysql" | "postgres") {
		this.dbType = dbType;
		if (dbType === "mysql") {
			this.service = new MySQLService();
		}
		if (dbType === "postgres") {
			this.service = new PostgresService();
		}
	}

	async connect(config: {
		host: string;
		port: string;
		user: string;
		password: string;
		database: string;
		dbType: "mysql" | "postgres";
	}) {
		try {
			// Disconnect any existing connections
			await this.disconnect();

			let result: { success: boolean; message: string } = {
				success: false,
				message: "Invalid database type",
			};

			result = await this.service.connect({
				host: config.host,
				port: config.port,
				user: config.user,
				password: config.password,
				database: config.database,
			});

			if (result.success) {
				this.dbType = config.dbType;
			}

			return result;
		} catch (error) {
			console.error("Error in connect method:", error);
			return {
				success: false,
				message: error instanceof Error ? error.message : "Failed to connect",
			};
		}
	}

	async disconnect() {
		try {
			await this.service.disconnect();
		} catch (error) {
			console.error("Error in disconnect method:", error);
			throw error;
		}
	}

	async query(sql: string) {
		try {
			if (!this.dbType) {
				throw new Error("No database connection");
			}

			return await this.service.query(sql);
		} catch (error) {
			console.error("Error in query method:", error);
			throw error;
		}
	}

	async getTables() {
		try {
			if (!this.dbType) {
				throw new Error("No database connection");
			}

			return await this.service.getTables();
		} catch (error) {
			console.error("Error in getTables method:", error);
			throw error;
		}
	}

	// Check if a table exists
	async tableExists(tableName: string): Promise<boolean> {
		if (!this.dbType) {
			return false;
		}

		return await this.service.tableExists(tableName);
	}

	// Get primary key information for a table
	async getPrimaryKey(tableName: string): Promise<string[]> {
		if (!this.dbType) {
			throw new Error("No database connection");
		}

		console.log(`Attempting to get primary keys for table: ${tableName}`);

		return await this.service.getPrimaryKey(tableName);
	}

	// Update a single cell value
	async updateCell(
		tableName: string,
		primaryKeyColumn: string,
		primaryKeyValue: string | number,
		columnToUpdate: string,
		newValue: unknown,
	): Promise<boolean> {
		if (!this.dbType) {
			throw new Error("No database connection");
		}

		try {
			return await this.service?.updateCell(
				tableName,
				primaryKeyColumn,
				primaryKeyValue,
				columnToUpdate,
				newValue,
			);
		} catch (error) {
			console.error("Error updating cell:", error);
			throw error;
		}
	}

	async cancelQuery(): Promise<boolean> {
		if (!this.dbType) {
			throw new Error("No database connection");
		}

		try {
			return await this.service.cancelQuery();
		} catch (error) {
			console.error("Error canceling query:", error);
			throw error;
		}
	}
	async getDatabaseSchema() {
		if (!this.dbType) {
			throw new Error("No database connection");
		}

		return await this.service.getDatabaseSchema();
	}

	// Get table structure (column names and types)
	async getTableStructure(tableName: string) {
		if (!this.dbType) {
			throw new Error("No database connection");
		}

		return await this.service.getTableStructure(tableName);
	}
}

export default DatabaseService;
