import mysql from 'mysql2/promise';

class MySQLService {
    private connection: mysql.Connection | null = null;

    async connect(config: {
        host: string
        port: string
        user: string
        password: string
        database: string
    }) {
        try {
            this.connection = await mysql.createConnection({
                host: config.host,
                port: Number.parseInt(config.port),
                user: config.user,
                password: config.password,
                database: config.database
            })

            // Test the connection
            await this.connection.connect()
            return { success: true, message: 'Connected successfully' }
        } catch (error) {
            console.error('Error connecting to MySQL:', error)
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to connect'
            }
        }
    }

    async disconnect() {
        if (this.connection) {
            await this.connection.end()
            this.connection = null
        }
    }

    async query(sql: string) {
        try {
            if (!this.connection) {
                throw new Error('No database connection')
            }

            const [results] = await this.connection.execute(sql)
            return results
        } catch (error) {
            console.error('Error in query method:', error)
            throw error
        }
    }

    async getTables() {
        try {
            if (!this.connection) {
                throw new Error('No MySQL connection')
            }
            // Use INFORMATION_SCHEMA instead of SHOW TABLES to get the exact case
            const [rows] = await this.connection.execute(
                'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()'
            )
            return rows
        } catch (error) {
            console.error('Error in getTables method:', error)
            throw error
        }
    }

    async tableExists(tableName: string): Promise<boolean> {
        if (!this.connection) return false
        try {
            const [rows] = await this.connection.execute(
                'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
                [tableName]
            )
            return (rows as Array<{ count: number }>)[0].count > 0
        } catch (error) {
            console.error('Error checking if MySQL table exists:', error)
            return false
        }
    }

    async getPrimaryKey(tableName: string): Promise<string[]> {
        if (!this.connection) throw new Error('No MySQL connection')
        try {
            console.log('Executing MySQL primary key query');
            const [rows] = await this.connection.execute(
                `SELECT COLUMN_NAME 
                 FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                 WHERE TABLE_SCHEMA = DATABASE() 
                 AND TABLE_NAME = ? 
                 AND CONSTRAINT_NAME = 'PRIMARY'`,
                [tableName]
            )
            const primaryKeys = (rows as Array<{ COLUMN_NAME: string }>).map(row => row.COLUMN_NAME);
            console.log('MySQL primary keys found:', primaryKeys);
            return primaryKeys;
        } catch (error) {
            console.error('Error getting MySQL primary key:', error)
            return []
        }
    }

    async updateCell(
        tableName: string,
        primaryKeyColumn: string,
        primaryKeyValue: string | number,
        columnToUpdate: string,
        newValue: unknown
    ): Promise<boolean> {
        if (!this.connection) throw new Error('No MySQL connection')
        try {
            const sql = `UPDATE ${tableName} SET ${columnToUpdate} = ? WHERE ${primaryKeyColumn} = ?`
            console.log('MySQL update SQL:', sql);
            await this.connection.execute(sql, [newValue, primaryKeyValue])
            console.log('Cell update successful');
            return true
        } catch (error) {
            console.error('Error updating cell:', error)
            throw error
        }
    }

    async cancelQuery(): Promise<boolean> {
        if (!this.connection) {
            throw new Error('No database connection');
        }

        try {
            // MySQL doesn't have a direct way to cancel queries
            // The best we can do is kill the current connection and reconnect
            await this.connection.end();
            this.connection = null;
            return true;
        } catch (error) {
            console.error('Error canceling query:', error);
            return false;
        }
    }
}

export default MySQLService;
