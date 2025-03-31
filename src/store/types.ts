import type {
	TableDataRow,
	SortConfig,
	FilterCondition,
	PaginationState,
} from "../features/SQLTables/types";

// Column structure interface
export interface ColumnStructure {
	column: string;
	type: "json" | "string" | "number" | "boolean";
}

// Table state interface
export interface TableState {
	data: TableDataRow[];
	columns: string[];
	totalRows: number;
	loading: boolean;
	error: string | null;
	filters: Record<string, FilterCondition>;
	sortConfig: SortConfig;
	pagination: PaginationState;
	primaryKeys: string[];
	structure: ColumnStructure[];
	editingCell: {
		rowIndex: number;
		columnName: string;
		value: unknown;
		primaryKeyColumn: string;
		primaryKeyValue: string | number;
	} | null;
	selectedRow: TableDataRow | null;
}

// Root state interface for tables
export interface TablesState {
	tables: Record<string, TableState>;
	activeTable: string | null;
}

// Root state interface for the entire app
export interface RootState {
	tables: TablesState;
	// Add other state slices here as needed
}
