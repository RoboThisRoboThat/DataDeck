import postgres from 'postgres';

class PostgresService {
    private pgClient: postgres.Sql<Record<string, unknown>> | null = null;

    async connect(config: {
        host: string
        port: string
        user: string
        password: string
        database: string
    }) {
        try {
            // Using postgres library
            this.pgClient = postgres({
                host: config.host,
                port: Number.parseInt(config.port),
                user: config.user,
                password: config.password,
                database: config.database,
            })

            // Test the connection with a simple query
            await this.pgClient`SELECT 1`
            return { success: true, message: 'Connected successfully' }
        } catch (error) {
            console.error('Error connecting to PostgreSQL:', error)
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to connect'
            }
        }
    }

    async disconnect() {
        try {
            if (this.pgClient) {
                // The postgres library has an end method to close connections
                await this.pgClient.end()
                this.pgClient = null
            }
        } catch (error) {
            console.error('Error in disconnect method:', error)
            throw error
        }
    }

    async query(sql: string) {
        try {
            if (!this.pgClient) {
                throw new Error('No PostgreSQL connection')
            }

            // For PostgreSQL, we need to properly quote identifiers to preserve case
            let modifiedSql = sql;

            // Complex regex to find table names and add double quotes if not already quoted
            // This handles FROM clauses, JOIN clauses, and other common places where table names appear
            modifiedSql = sql.replace(/\b(FROM|JOIN|UPDATE|INTO|TABLE)\s+([A-Za-z0-9_.]+)(?!\s*\()/gi, (match, clause, identifier) => {
                // Don't add quotes if already quoted
                if (identifier.startsWith('"') && identifier.endsWith('"')) {
                    return `${clause} ${identifier}`;
                }
                return `${clause} "${identifier}"`;
            });

            // Also handle column names in ORDER BY, GROUP BY, etc.
            modifiedSql = modifiedSql.replace(/\b(ORDER BY|GROUP BY)\s+([A-Za-z0-9_.]+)/gi, (match, clause, identifier) => {
                if (identifier.startsWith('"') && identifier.endsWith('"')) {
                    return `${clause} ${identifier}`;
                }
                return `${clause} "${identifier}"`;
            });

            try {
                const rows = await this.pgClient.unsafe(modifiedSql);
                return rows
            } catch (pgError) {
                // Add more helpful error messages for common PostgreSQL errors
                if (pgError instanceof Error && pgError.message?.includes('relation') && pgError.message?.includes('does not exist')) {
                    const tableName = pgError.message.match(/relation "([^"]+)" does not exist/)?.[1] || 'unknown';
                    throw new Error(`Table "${tableName}" does not exist in the database. Please check the table name and ensure it exists.`);
                }
                // Re-throw the original error if it's not one we're specifically handling
                throw pgError;
            }
        } catch (error) {
            console.error('Error in query method:', error)
            throw error
        }
    }

    async getTables() {
        try {
            if (!this.pgClient) {
                throw new Error('No PostgreSQL connection')
            }

            // PostgreSQL query that includes both the table name and its case-sensitive form
            const rows = await this.pgClient`
                SELECT 
                    table_name,
                    -- This gets the actual name including case sensitivity
                    pg_class.relname as exact_name
                FROM 
                    information_schema.tables
                JOIN 
                    pg_catalog.pg_class ON tables.table_name = pg_class.relname
                JOIN 
                    pg_catalog.pg_namespace ON pg_class.relnamespace = pg_namespace.oid 
                    AND pg_namespace.nspname = tables.table_schema
                WHERE 
                    table_schema = 'public'
                ORDER BY 
                    table_name
            `
            return rows
        } catch (error) {
            console.error('Error in getTables method:', error)
            throw error
        }
    }

    async tableExists(tableName: string): Promise<boolean> {
        if (!this.pgClient) {
            return false
        }

        try {
            const result = await this.pgClient`
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = ${tableName.toLowerCase()}
            `
            return Number.parseInt(result[0].count.toString()) > 0
        } catch (error) {
            console.error('Error checking if PostgreSQL table exists:', error)
            return false
        }
    }

    async getPrimaryKey(tableName: string): Promise<string[]> {
        if (!this.pgClient) {
            console.log('No PostgreSQL client available');
            return [];
        }

        try {
            console.log('Executing PostgreSQL primary key query for table:', tableName);

            // Get the correct table name with proper casing
            const correctTableName = await this.getCorrectTableNameForPostgres(tableName);
            console.log('Correct table name from PostgreSQL:', correctTableName);

            if (!correctTableName) {
                console.log(`Table ${tableName} not found in PostgreSQL database`);

                // Try to get a list of all tables to see what's available
                const allTables = await this.pgClient`
                    SELECT table_name FROM information_schema.tables 
                    WHERE table_schema = 'public'
                `;
                console.log('Available tables in public schema:', allTables.map(t => t.table_name));
                return [];
            }

            // Use the corrected table name for primary key queries
            const tableNameForQueries = correctTableName.toLowerCase();
            console.log('Using table name for queries:', tableNameForQueries);

            // Use only the pg_index approach
            console.log('Using pg_index approach to get primary keys');
            const primaryKeys = await this.pgClient.unsafe(`
                SELECT a.attname as column_name
                FROM pg_index i
                JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                JOIN pg_class t ON i.indrelid = t.oid
                JOIN pg_namespace n ON t.relnamespace = n.oid
                WHERE n.nspname = 'public'
                AND t.relname = '${correctTableName}'
                AND i.indisprimary
            `);
            console.log('pg_index query result:', primaryKeys);

            if (primaryKeys && primaryKeys.length > 0) {
                const result = primaryKeys.map(row => row.column_name);
                console.log('Primary keys from pg_index query:', result);
                return result;
            }

            console.log(`No primary keys found for table ${tableName} using pg_index method`);
            return [];
        } catch (error) {
            console.error('Error getting PostgreSQL primary key:', error);
            return [];
        }
    }

    async updateCell(
        tableName: string,
        primaryKeyColumn: string,
        primaryKeyValue: string | number,
        columnToUpdate: string,
        newValue: unknown
    ): Promise<boolean> {
        if (!this.pgClient) throw new Error('No PostgreSQL connection')
        try {
            // Get the correct table name with proper casing
            const correctTableName = await this.getCorrectTableNameForPostgres(tableName);
            console.log('Correct table name from PostgreSQL:', correctTableName);

            if (!correctTableName) {
                throw new Error(`Table ${tableName} not found in PostgreSQL database`);
            }

            // Quote all identifiers properly
            const quotedTableName = this.quotePostgresIdentifier(correctTableName);
            const quotedColumnToUpdate = this.quotePostgresIdentifier(columnToUpdate);
            const quotedPrimaryKeyColumn = this.quotePostgresIdentifier(primaryKeyColumn);

            // For PostgreSQL, use quoted identifiers and parameterized queries for safety
            const sql = `UPDATE ${quotedTableName} SET ${quotedColumnToUpdate} = $1 WHERE ${quotedPrimaryKeyColumn} = $2`;
            console.log('PostgreSQL update SQL:', sql);
            console.log('With parameters:', [newValue, primaryKeyValue]);
            await this.pgClient.unsafe(sql, [newValue, primaryKeyValue])

            console.log('Cell update successful');
            return true
        } catch (error) {
            console.error('Error updating cell:', error)
            throw error
        }
    }

    // Helper method to ensure proper quoting of PostgreSQL identifiers
    private quotePostgresIdentifier(identifier: string): string {
        // If already quoted, return as is
        if (identifier.startsWith('"') && identifier.endsWith('"')) {
            return identifier;
        }
        // Otherwise, quote it
        return `"${identifier}"`;
    }

    // Helper function to check if a table exists and get its correct casing
    private async getCorrectTableNameForPostgres(tableName: string): Promise<string | null> {
        if (!this.pgClient) return null;

        try {
            // First try with the exact name
            const exactResult = await this.pgClient`
                SELECT table_name FROM information_schema.tables 
                WHERE table_name = ${tableName}
            `;

            if (exactResult.length > 0) {
                return exactResult[0].table_name;
            }

            // Then try with lowercase
            const lowercaseResult = await this.pgClient`
                SELECT table_name FROM information_schema.tables 
                WHERE table_name = ${tableName.toLowerCase()}
            `;

            if (lowercaseResult.length > 0) {
                return lowercaseResult[0].table_name;
            }

            // If neither worked, try to find a case-insensitive match
            const similarResult = await this.pgClient`
                SELECT table_name FROM information_schema.tables 
                WHERE LOWER(table_name) = ${tableName.toLowerCase()}
            `;

            if (similarResult.length > 0) {
                return similarResult[0].table_name;
            }

            return null;
        } catch (error) {
            console.error('Error in getCorrectTableNameForPostgres:', error);
            return null;
        }
    }

    async cancelQuery(): Promise<boolean> {
        if (!this.pgClient) {
            throw new Error('No database connection');
        }

        try {
            // PostgreSQL supports canceling queries through the client
            await this.pgClient.cancel();
            return true;
        } catch (error) {
            console.error('Error canceling query:', error);
            return false;
        }
    }

    async getDatabaseSchema() {
        if (!this.pgClient) {
            throw new Error('No PostgreSQL connection');
        }

        try {
            // Get all tables in the public schema
            const tables = await this.pgClient`
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name
            `;

            const result = [];

            for (const table of tables) {
                const tableName = table.table_name;

                // Get columns with their properties
                const columns = await this.pgClient`
                    SELECT 
                        column_name, 
                        data_type,
                        is_nullable,
                        column_default,
                        character_maximum_length,
                        numeric_precision
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                    AND table_name = ${tableName}
                    ORDER BY ordinal_position
                `;

                // Get primary key columns
                const primaryKeys = await this.pgClient`
                    SELECT kcu.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                      ON tc.constraint_name = kcu.constraint_name
                      AND tc.table_schema = kcu.table_schema
                    WHERE tc.constraint_type = 'PRIMARY KEY'
                      AND tc.table_schema = 'public'
                      AND tc.table_name = ${tableName}
                `;

                const primaryKeyColumns = primaryKeys.map(pk => pk.column_name);

                // Get foreign keys
                const foreignKeys = await this.pgClient`
                    SELECT
                        kcu.column_name,
                        ccu.table_name AS referenced_table_name,
                        ccu.column_name AS referenced_column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                      ON tc.constraint_name = kcu.constraint_name
                    JOIN information_schema.constraint_column_usage ccu
                      ON ccu.constraint_name = tc.constraint_name
                    WHERE tc.constraint_type = 'FOREIGN KEY'
                      AND tc.table_schema = 'public'
                      AND tc.table_name = ${tableName}
                `;

                const tableInfo = {
                    name: tableName,
                    columns: columns.map(col => ({
                        name: col.column_name,
                        type: col.data_type,
                        length: col.character_maximum_length,
                        precision: col.numeric_precision,
                        isPrimary: primaryKeyColumns.includes(col.column_name),
                        isNullable: col.is_nullable === 'YES',
                        defaultValue: col.column_default
                    })),
                    foreignKeys: foreignKeys.map(fk => ({
                        column: fk.column_name,
                        referencedTable: fk.referenced_table_name,
                        referencedColumn: fk.referenced_column_name
                    }))
                };

                result.push(tableInfo);
            }

            return result;
        } catch (error) {
            console.error('Error extracting PostgreSQL database schema:', error);
            throw error;
        }
    }
}

export default PostgresService; 