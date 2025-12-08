/**
 * Shared types used across the entire DataDeck application.
 * These types are designed to be imported by both Electron (main/preload) and React (renderer).
 */

// ============================================
// Generic Result Types
// ============================================

/**
 * Generic result type for operations that can succeed or fail.
 */
export interface Result<T = void> {
    success: boolean;
    message?: string;
    data?: T;
}

/**
 * Result type with explicit connected status (for connection operations)
 */
export interface ConnectionResult extends Result {
    connected?: boolean;
    id?: string;
    name?: string;
    dbType?: string;
}

// ============================================
// Database Schema Types
// ============================================

/**
 * Column metadata in a table schema
 */
export interface TableSchemaColumn {
    name: string;
    type: string;
    length?: number;
    precision?: number;
    isPrimary: boolean;
    isNullable: boolean;
    defaultValue?: string;
}

/**
 * Foreign key relationship in a table schema
 */
export interface TableSchemaForeignKey {
    column: string;
    referencedTable: string;
    referencedColumn: string;
}

/**
 * Complete table schema with columns and foreign keys
 */
export interface TableSchema {
    name: string;
    columns: TableSchemaColumn[];
    foreignKeys: TableSchemaForeignKey[];
}

/**
 * Column structure for determining data types in tables
 */
export interface ColumnStructure {
    column: string;
    type: "json" | "string" | "number" | "boolean";
}

// ============================================
// Query Types
// ============================================

/**
 * Column metadata from query results
 */
export interface QueryResultColumn {
    name: string;
    type: string;
}

/**
 * Query execution result
 */
export interface QueryResult {
    columns: QueryResultColumn[];
    rows: Record<string, unknown>[];
    rowCount: number;
    error?: string;
}

// ============================================
// Table Info Types
// ============================================

/**
 * Basic table information
 */
export interface TableInfo {
    name: string;
    type: string;
}

// ============================================
// Database Schema Result
// ============================================

/**
 * Result from getDatabaseSchema operation
 */
export interface DatabaseSchemaResult {
    data: TableSchema[];
    dbType?: string;
}
