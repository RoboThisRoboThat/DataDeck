import {
	createSlice,
	createAsyncThunk,
	type PayloadAction,
} from "@reduxjs/toolkit";
import type { TablesState, TableState } from "../types";
import type {
	FilterCondition,
	SortConfig,
	PaginationState,
	TableDataRow,
} from "../../features/SQLTables/types";

// Initial state
const initialState: TablesState = {
	tables: {},
	activeTable: null,
};

// Default table state
const defaultTableState: TableState = {
	data: [],
	columns: [],
	totalRows: 0,
	loading: false,
	error: null,
	filters: {},
	sortConfig: { column: "", direction: null },
	pagination: { page: 0, rowsPerPage: 100 },
	primaryKeys: [],
	structure: [],
	editingCell: null,
	selectedRow: null,
};

// Helper function to build SQL filter condition
const buildFilterCondition = (
	column: string,
	operator: string,
	value: string,
): string => {
	// Handle special operators that don't need values
	if (operator === "IS NULL") {
		return `${column} IS NULL`;
	}
	if (operator === "IS NOT NULL") {
		return `${column} IS NOT NULL`;
	}

	// Handle IN and NOT IN operators
	if (operator === "IN" || operator === "NOT IN") {
		// Split by comma, trim each value, and wrap in quotes
		const values = value
			.split(",")
			.map((v) => `'${v.trim().replace(/'/g, "''")}'`) // Escape single quotes
			.join(", ");
		return `${column} ${operator} (${values})`;
	}

	// Handle LIKE and NOT LIKE operators
	if (operator === "LIKE" || operator === "NOT LIKE") {
		// If user didn't add wildcards, we'll add them for "contains" behavior
		const formattedValue = value.includes("%") ? value : `%${value}%`;
		// Escape single quotes in the value
		const escapedValue = formattedValue.replace(/'/g, "''");
		return `${column} ${operator} '${escapedValue}'`;
	}

	// Handle standard comparison operators (=, >, >=, <, <=)
	// Escape single quotes in the value
	const escapedValue = value.replace(/'/g, "''");
	return `${column} ${operator} '${escapedValue}'`;
};

// Async thunk for fetching table data
export const fetchTableData = createAsyncThunk(
	"tables/fetchTableData",
	async (
		{
			tableName,
			connectionId,
			filters,
			sortConfig,
			pagination,
		}: {
			tableName: string;
			connectionId: string;
			filters: Record<string, FilterCondition>;
			sortConfig: SortConfig;
			pagination: PaginationState;
		},
		{ rejectWithValue },
	) => {
		try {
			let totalRows = 0;
			if (Object.keys(filters).length > 0) {
				const filterConditions = Object.entries(filters)
					.map(([column, filter]) =>
						buildFilterCondition(column, filter.operator, filter.value),
					)
					.join(" AND ");

				const countQuery = `SELECT COUNT(*) as total FROM ${tableName}${filterConditions ? ` WHERE ${filterConditions}` : ""}`;
				const countResult = await window.database.query(
					connectionId,
					countQuery,
				);
				totalRows = Number.parseInt(countResult[0].total);
			} else {
				const countResult = await window.database.query(
					connectionId,
					`SELECT COUNT(*) as total FROM ${tableName}`,
				);
				totalRows = Number.parseInt(countResult[0].total);
			}

			// Then get paginated and filtered data
			let query = `SELECT * FROM ${tableName}`;

			// Add filters if any
			if (Object.keys(filters).length > 0) {
				const filterConditions = Object.entries(filters)
					.map(([column, filter]) =>
						buildFilterCondition(column, filter.operator, filter.value),
					)
					.join(" AND ");

				if (filterConditions) {
					query += ` WHERE ${filterConditions}`;
				}
			}

			// Add sorting if any
			if (sortConfig.column && sortConfig.direction) {
				query += ` ORDER BY ${sortConfig.column} ${sortConfig.direction.toUpperCase()}`;
			}

			// Add pagination
			const offset = pagination.page * pagination.rowsPerPage;
			query += ` LIMIT ${pagination.rowsPerPage} OFFSET ${offset}`;
			const result = await window.database.query(connectionId, query);

			if (result && result.length > 0) {
				return {
					tableName,
					data: result,
					columns: Object.keys(result[0]),
					totalRows,
				};
			}

			return {
				tableName,
				data: [],
				columns: [],
				totalRows: 0,
			};
		} catch (error) {
			return rejectWithValue(
				error instanceof Error ? error.message : String(error),
			);
		}
	},
);

// Add a new thunk for fetching primary key information
export const fetchPrimaryKeys = createAsyncThunk(
	"tables/fetchPrimaryKeys",
	async (
		{
			tableName,
			connectionId,
		}: {
			tableName: string;
			connectionId: string;
		},
		{ rejectWithValue },
	) => {
		try {
			if (typeof window.database.getPrimaryKey !== "function") {
				console.error(
					"window.database.getPrimaryKey is not a function!",
					window.database,
				);
				return { tableName, primaryKeys: [] };
			}

			const primaryKeys = await window.database.getPrimaryKey(
				connectionId,
				tableName,
			);
			return { tableName, primaryKeys };
		} catch (error) {
			return rejectWithValue(
				error instanceof Error ? error.message : String(error),
			);
		}
	},
);

// Add a new thunk for fetching table structure information
export const fetchTableStructure = createAsyncThunk(
	"tables/fetchTableStructure",
	async (
		{
			tableName,
			connectionId,
		}: {
			tableName: string;
			connectionId: string;
		},
		{ rejectWithValue },
	) => {
		try {
			if (typeof window.database.getTableStructure !== "function") {
				console.error(
					"window.database.getTableStructure is not a function!",
					window.database,
				);
				return { tableName, structure: [] };
			}

			const structure = await window.database.getTableStructure(
				connectionId,
				tableName,
			);
			return { tableName, structure };
		} catch (error) {
			return rejectWithValue(
				error instanceof Error ? error.message : String(error),
			);
		}
	},
);

// Update the updateCellValue action to not store errors in Redux state
export const updateCellValue = createAsyncThunk(
	"tables/updateCellValue",
	async (params: UpdateCellValueParams) => {
		const response = await window.database.updateCell(params);
		return response;
	},
);

// Create the tables slice
const tablesSlice = createSlice({
	name: "tables",
	initialState,
	reducers: {
		setActiveTable: (state, action: PayloadAction<string>) => {
			state.activeTable = action.payload;

			// Initialize table state if it doesn't exist
			if (!state.tables[action.payload]) {
				state.tables[action.payload] = { ...defaultTableState };
			}
		},

		setFilters: (
			state,
			action: PayloadAction<{
				tableName: string;
				filters: Record<string, FilterCondition>;
			}>,
		) => {
			const { tableName, filters } = action.payload;

			// Initialize table state if it doesn't exist
			if (!state.tables[tableName]) {
				state.tables[tableName] = { ...defaultTableState };
			}

			state.tables[tableName].filters = filters;
			// Reset pagination when filters change
			state.tables[tableName].pagination.page = 0;
		},

		setSortConfig: (
			state,
			action: PayloadAction<{ tableName: string; sortConfig: SortConfig }>,
		) => {
			const { tableName, sortConfig } = action.payload;

			// Initialize table state if it doesn't exist
			if (!state.tables[tableName]) {
				state.tables[tableName] = { ...defaultTableState };
			}

			state.tables[tableName].sortConfig = sortConfig;
			// Reset pagination when sort changes
			state.tables[tableName].pagination.page = 0;
		},

		setPagination: (
			state,
			action: PayloadAction<{ tableName: string; pagination: PaginationState }>,
		) => {
			const { tableName, pagination } = action.payload;

			// Initialize table state if it doesn't exist
			if (!state.tables[tableName]) {
				state.tables[tableName] = { ...defaultTableState };
			}

			state.tables[tableName].pagination = pagination;
		},

		clearTableState: (state, action: PayloadAction<string>) => {
			const tableName = action.payload;
			delete state.tables[tableName];

			if (state.activeTable === tableName) {
				state.activeTable = null;
			}
		},

		// Add a new reducer for setting editing cell
		setEditingCell: (
			state,
			action: PayloadAction<{
				tableName: string;
				editingCell: {
					rowIndex: number;
					columnName: string;
					value: unknown;
					primaryKeyColumn: string;
					primaryKeyValue: string | number;
				} | null;
			}>,
		) => {
			const { tableName, editingCell } = action.payload;

			// Initialize table state if it doesn't exist
			if (!state.tables[tableName]) {
				state.tables[tableName] = { ...defaultTableState };
			}

			state.tables[tableName].editingCell = editingCell;
		},

		// Add new reducer for setting selected row
		setSelectedRow: (
			state,
			action: PayloadAction<{
				tableName: string;
				selectedRow: TableDataRow | null;
			}>,
		) => {
			const { tableName, selectedRow } = action.payload;

			// Initialize table state if it doesn't exist
			if (!state.tables[tableName]) {
				state.tables[tableName] = { ...defaultTableState };
			}

			state.tables[tableName].selectedRow = selectedRow;
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchTableData.pending, (state, action) => {
				const tableName = action.meta.arg.tableName;

				// Initialize table state if it doesn't exist
				if (!state.tables[tableName]) {
					state.tables[tableName] = { ...defaultTableState };
				}

				state.tables[tableName].loading = true;
				state.tables[tableName].error = null;
			})
			.addCase(fetchTableData.fulfilled, (state, action) => {
				const { tableName, data, columns, totalRows } = action.payload;

				state.tables[tableName].loading = false;
				state.tables[tableName].data = data;
				state.tables[tableName].columns = columns;
				state.tables[tableName].totalRows = totalRows;
			})
			.addCase(fetchTableData.rejected, (state, action) => {
				const tableName = action.meta.arg.tableName;

				state.tables[tableName].loading = false;
				state.tables[tableName].error = action.payload as string;
			})

			// Add cases for fetchPrimaryKeys
			.addCase(fetchPrimaryKeys.pending, (state, action) => {
				const tableName = action.meta.arg;

				// Initialize table state if it doesn't exist
				if (!state.tables[tableName]) {
					state.tables[tableName] = { ...defaultTableState };
				}
			})
			.addCase(fetchPrimaryKeys.fulfilled, (state, action) => {
				const { tableName, primaryKeys } = action.payload;

				if (state.tables[tableName]) {
					state.tables[tableName].primaryKeys = primaryKeys;
				}
			})
			.addCase(fetchPrimaryKeys.rejected, (state, action) => {
				const tableName = action.meta.arg;

				if (state.tables[tableName]) {
					state.tables[tableName].primaryKeys = [];
				}
			})

			// Add cases for fetchTableStructure
			.addCase(fetchTableStructure.pending, (state, action) => {
				const tableName = action.meta.arg.tableName;

				// Initialize table state if it doesn't exist
				if (!state.tables[tableName]) {
					state.tables[tableName] = { ...defaultTableState };
				}
			})
			.addCase(fetchTableStructure.fulfilled, (state, action) => {
				const { tableName, structure } = action.payload;

				if (state.tables[tableName]) {
					state.tables[tableName].structure = structure;
				}
			})
			.addCase(fetchTableStructure.rejected, (state, action) => {
				const tableName = action.meta.arg.tableName;

				if (state.tables[tableName]) {
					state.tables[tableName].structure = [];
				}
			})

			// Add cases for updateCellValue
			.addCase(updateCellValue.pending, (state, action) => {
				const tableName = action.meta.arg.tableName;

				if (state.tables[tableName]) {
					state.tables[tableName].loading = true;
				}
			})
			.addCase(updateCellValue.fulfilled, (state, action) => {
				// Handle success case
			})
			.addCase(updateCellValue.rejected, (state, action) => {
				// Don't store error in Redux state
			});
	},
});

// Export actions
export const {
	setActiveTable,
	setFilters,
	setSortConfig,
	setPagination,
	clearTableState,
	setEditingCell,
	setSelectedRow,
} = tablesSlice.actions;

// Export reducer
export default tablesSlice.reducer;
