// Define table schema types
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

// Define query result types
interface QueryResultColumn {
    name: string;
    type: string;
}

interface QueryResult {
    columns: QueryResultColumn[];
    rows: Record<string, unknown>[];
    rowCount: number;
    error?: string;
}

interface Database {
    connect: (connectionId: string) => Promise<{ success?: boolean; connected?: boolean; message: string } & Record<string, unknown>>;
    disconnect: (connectionId: string) => Promise<{ success: boolean; message?: string }>;
    query: (connectionId: string, sql: string) => Promise<QueryResult>;
    stopQuery: (connectionId: string) => Promise<{ success: boolean; message?: string }>;
    getTables: (connectionId: string) => Promise<string[]>;
    getPrimaryKey: (connectionId: string, tableName: string) => Promise<string[]>;
    updateCell: (
        connectionId: string,
        tableName: string,
        primaryKeyColumn: string,
        primaryKeyValue: string | number,
        columnToUpdate: string,
        newValue: unknown
    ) => Promise<{ success: boolean; message?: string }>;
    isConnected: (connectionId: string) => Promise<boolean>;
    getActiveConnections: () => Promise<string[]>;
    getDatabaseSchema: (connectionId: string, forceRefresh?: boolean) => Promise<TableSchema[]>;
    clearSchemaCache: (connectionId: string) => Promise<{ success: boolean }>;
}

interface Window {
    database: Database;
} 