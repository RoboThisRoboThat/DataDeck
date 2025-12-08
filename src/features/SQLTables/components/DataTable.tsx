import { useRef, useState, useEffect, useCallback, useMemo, memo } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	FiFilter,
	FiArrowUp,
	FiArrowDown,
	FiX,
	FiChevronLeft,
	FiChevronRight,
} from "react-icons/fi";
import type { TableDataRow } from "../types";
import FilterModal from "./FilterModal";
import TableRow from "./TableRow";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import dayjs from "dayjs";
import {
	fetchTableData,
	setFilters,
	setSortConfig,
	setPagination,
	setActiveTable,
	fetchPrimaryKeys,
	fetchTableStructure,
	setSelectedRow,
} from "../../../store/slices/tablesSlice";

// Create a custom event for filter clicks
const FILTER_CLICK_EVENT = "dataTableFilterClick";

interface DataTableProps {
	tableName: string;
	connectionId: string;
}

const DataTable = ({ tableName, connectionId }: DataTableProps) => {
	const dispatch = useAppDispatch();
	const tableRef = useRef<HTMLDivElement>(null);

	// Get table state from Redux
	const tableState = useAppSelector(
		(state) =>
			state.tables.tables[tableName] || {
				data: [],
				columns: [],
				totalRows: 0,
				loading: false,
				error: null,
				filters: {},
				sortConfig: { column: "", direction: null },
				pagination: { page: 0, rowsPerPage: 100 },
				primaryKeys: [],
				editingCell: null,
				selectedRow: null,
			},
	);

	const {
		data,
		columns,
		totalRows,
		loading,
		error,
		filters,
		sortConfig,
		pagination,
		primaryKeys,
		selectedRow,
	} = tableState;

	// Filter modal state
	const [filterModalOpen, setFilterModalOpen] = useState(false);
	const [filterColumn, setFilterColumn] = useState("");
	const filterModalOpenRef = useRef(false); // Add ref to track modal open state

	// Track previous values to detect changes
	const prevTableNameRef = useRef(tableName);

	// Update ref when state changes
	useEffect(() => {
		filterModalOpenRef.current = filterModalOpen;
	}, [filterModalOpen]);

	// Add new hotkey using react-hotkeys-hook
	useHotkeys(
		"mod+f",
		(event) => {
			event.preventDefault(); // Prevent browser find
			if (!filterModalOpen) {
				// Open the global filter modal (no specific column)
				setFilterColumn("");
				setFilterModalOpen(true);
			}
		},
		{ enableOnFormTags: true }, // Allow shortcut even if focus is inside table/input
	);

	// Re-add the function for the button click
	const openGlobalFilterModal = () => {
		// Check if modal is already open before opening
		if (!filterModalOpen) {
			setFilterColumn(""); // Clear any pre-selected column
			setFilterModalOpen(true);
		}
	};

	// Set active table when component mounts
	useEffect(() => {
		dispatch(setActiveTable(tableName));
	}, [dispatch, tableName]);

	// Fetch data when table name changes or when filters/sort/pagination change
	useEffect(() => {
		if (!tableName) return;

		// Check if this is a table name change
		const isTableNameChange = prevTableNameRef.current !== tableName;
		prevTableNameRef.current = tableName;

		// If it's a table name change and we already have data, don't fetch
		if (isTableNameChange && data.length > 0) {
			return;
		}

		// Otherwise, fetch the data
		dispatch(
			fetchTableData({
				tableName,
				connectionId,
				filters,
				sortConfig,
				pagination,
			}),
		);
		dispatch(
			fetchPrimaryKeys({
				tableName,
				connectionId,
			}),
		);
		// Also fetch table structure
		dispatch(
			fetchTableStructure({
				tableName,
				connectionId,
			}),
		);
	}, [
		tableName,
		dispatch,
		filters,
		sortConfig,
		pagination,
		data.length,
		connectionId,
	]);

	// Listen for filter click events from the column menu
	useEffect(() => {
		// This function will be called when the custom event is dispatched
		const handleFilterClickEvent = (event: CustomEvent) => {
			if (event.detail?.column) {
				setFilterColumn(event.detail.column);
				setFilterModalOpen(true);
			}
		};

		// Add event listener
		document.addEventListener(
			FILTER_CLICK_EVENT,
			handleFilterClickEvent as EventListener,
		);

		// Clean up
		return () => {
			document.removeEventListener(
				FILTER_CLICK_EVENT,
				handleFilterClickEvent as EventListener,
			);
		};
	}, []);

	// Handle filter apply
	const handleFilterApply = (
		column: string,
		operator: string,
		value: string,
	) => {
		// Create new filters object
		const newFilters = { ...filters };

		if (!operator) {
			// Remove filter if operator is empty
			delete newFilters[column];
		} else {
			// Add or update filter
			newFilters[column] = { operator, value };
		}

		// Update Redux state
		dispatch(setFilters({ tableName, filters: newFilters }));

		// Close the filter modal
		setFilterModalOpen(false);
	};

	// Handle sort change
	const handleSortChange = (
		column: string,
		direction: "asc" | "desc" | null,
	) => {
		dispatch(
			setSortConfig({
				tableName,
				sortConfig: { column, direction },
			}),
		);
	};

	// Handle remove sort
	const handleRemoveSort = () => {
		dispatch(
			setSortConfig({
				tableName,
				sortConfig: { column: "", direction: null },
			}),
		);
	};

	// Handle remove filter
	const handleRemoveFilter = (column: string) => {
		const newFilters = { ...filters };
		delete newFilters[column];

		dispatch(
			setFilters({
				tableName,
				filters: newFilters,
			}),
		);
	};

	// Handle page change
	const handlePageChange = (newPage: number) => {
		dispatch(
			setPagination({
				tableName,
				pagination: { ...pagination, page: newPage },
			}),
		);
	};

	// Handle rows per page change
	const handleRowsPerPageChange = (newRowsPerPage: number) => {
		dispatch(
			setPagination({
				tableName,
				pagination: { page: 0, rowsPerPage: newRowsPerPage },
			}),
		);
	};

	// Handle filter click from column menu
	const handleFilterClick = (column: string) => {
		setFilterColumn(column);
		setFilterModalOpen(true);
	};

	// Copy cell content to clipboard - memoized to prevent unnecessary re-renders
	const handleCopyCellContent = useCallback((value: unknown) => {
		const textToCopy = formatCellValue(value);
		navigator.clipboard
			.writeText(textToCopy)
			.then(() => {
				// You could add a toast notification here
				console.log("Copied to clipboard:", textToCopy);
			})
			.catch((err) => {
				console.error("Failed to copy text: ", err);
			});
	}, []);

	// Format cell value for display
	const formatCellValue = (value: unknown): string => {
		if (value === null || value === undefined) {
			return "";
		}

		if (value instanceof Date) {
			return dayjs(value).format("YYYY-MM-DD HH:mm:ss");
		}
		if (typeof value === "object") {
			return JSON.stringify(value);
		}

		// Handle other types
		return String(value);
	};

	// Determine if we have data to show
	const hasData = data.length > 0 && columns.length > 0;

	// State for column resizing
	const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
	const [resizingColumn, setResizingColumn] = useState<string | null>(null);
	const [startX, setStartX] = useState(0);
	const [startWidth, setStartWidth] = useState(0);

	// Handle column resize start
	const handleResizeStart = (e: React.MouseEvent, column: string) => {
		e.preventDefault();
		setResizingColumn(column);
		setStartX(e.clientX);
		setStartWidth(columnWidths[column] || getDefaultColumnWidth(column));

		// Add event listeners to track mouse movement and release
		document.addEventListener("mousemove", handleResizeMove);
		document.addEventListener("mouseup", handleResizeEnd);
	};

	// Handle column resize movement
	const handleResizeMove = useCallback(
		(e: globalThis.MouseEvent) => {
			if (!resizingColumn) return;

			const diff = e.clientX - startX;
			const newWidth = Math.max(100, startWidth + diff); // Minimum width of 100px

			setColumnWidths((prev) => ({
				...prev,
				[resizingColumn]: newWidth,
			}));
		},
		[resizingColumn, startX, startWidth],
	);

	// Handle column resize end
	const handleResizeEnd = useCallback(() => {
		setResizingColumn(null);

		// Remove event listeners
		document.removeEventListener("mousemove", handleResizeMove);
		document.removeEventListener("mouseup", handleResizeEnd);
	}, [handleResizeMove]);

	// Clean up event listeners on unmount
	useEffect(() => {
		return () => {
			document.removeEventListener("mousemove", handleResizeMove);
			document.removeEventListener("mouseup", handleResizeEnd);
		};
	}, [handleResizeMove, handleResizeEnd]);

	// Get column width from state or default
	const getColumnWidth = (column: string): number => {
		return columnWidths[column] || getDefaultColumnWidth(column);
	};

	// Get default column width based on column name length
	const getDefaultColumnWidth = (column: string): number => {
		if (column.length > 30) return 300;
		if (column.length > 20) return 250;
		if (column.length > 10) return 200;
		return 150;
	};

	// Replace the getCellWidth function
	const getCellWidth = (column: string): string => {
		return `${getColumnWidth(column)}px`;
	};

	// Handle row selection - memoized to prevent unnecessary re-renders
	const handleRowSelect = useCallback(
		(row: TableDataRow) => {
			dispatch(
				setSelectedRow({
					tableName,
					selectedRow: row,
				}),
			);
		},
		[dispatch, tableName],
	);

	// Render the table header
	const renderTableHeader = () => (
		<div className="sticky top-0 z-10 flex border-b border-border/60 bg-card/80 shadow-sm w-fit backdrop-blur supports-[backdrop-filter]:backdrop-blur-sm">
			{columns.map((column) => {
				const width = getCellWidth(column);
				const isPrimaryKey = primaryKeys.includes(column);
				const isColumnSorted = sortConfig.column === column;

				return (
					<div
						key={`header-${column}`}
						className={`flex items-center justify-between px-3 py-3 font-medium relative ${
							isPrimaryKey
								? "bg-primary/5 text-primary"
								: "text-foreground"
						} ${isColumnSorted ? "bg-primary/10" : ""}`}
						style={{
							width,
							minWidth: width,
							maxWidth: width,
							borderRight: "1px solid var(--border)",
						}}
					>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<span className="max-w-[200px] truncate font-medium">
										{column}
										{isPrimaryKey && (
											<span className="ml-1 text-[11px] bg-primary/15 text-primary px-1 py-0.5 rounded">
												PK
											</span>
										)}
									</span>
								</TooltipTrigger>
								<TooltipContent>
									<p>{column}</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>

						{/* Sort indicator */}
						{isColumnSorted && (
							<div className="mx-1 text-primary">
								{sortConfig.direction === "asc" ? (
									<FiArrowUp size={14} />
								) : (
									<FiArrowDown size={14} />
								)}
							</div>
						)}

						{/* Filter icon for each column */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<div
									className="relative"
									onClick={(e) => e.stopPropagation()}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.stopPropagation();
										}
									}}
								>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 p-0 ml-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm"
									>
										<FiFilter size={14} />
									</Button>
								</div>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="end"
								className="z-[100]"
								side="bottom"
								sideOffset={5}
								onClick={(e) => e.stopPropagation()}
								onKeyDown={(e) => e.stopPropagation()}
							>
								<DropdownMenuItem
									onClick={() => handleSortChange(column, "asc")}
								>
									<FiArrowUp className="mr-2 h-4 w-4" />
									<span>Sort Ascending</span>
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => handleSortChange(column, "desc")}
								>
									<FiArrowDown className="mr-2 h-4 w-4" />
									<span>Sort Descending</span>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={() => handleFilterClick(column)}>
									<FiFilter className="mr-2 h-4 w-4" />
									<span>Filter</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

						{/* Column resize handle */}
						<div
							className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-blue-300/50 active:bg-blue-400/50 z-20"
							onMouseDown={(e) => handleResizeStart(e, column)}
						/>
					</div>
				);
			})}
		</div>
	);

	// Compute selected row key for efficient comparison
	const selectedRowKey = useMemo(() => {
		if (!selectedRow || primaryKeys.length === 0) return null;
		return primaryKeys.map((key) => selectedRow[key]).join("-");
	}, [selectedRow, primaryKeys]);

	// Check if a row is selected
	const isRowSelected = useCallback(
		(row: TableDataRow) => {
			if (!selectedRowKey || primaryKeys.length === 0) return false;
			const rowKey = primaryKeys.map((key) => row[key]).join("-");
			return rowKey === selectedRowKey;
		},
		[selectedRowKey, primaryKeys],
	);

	// Render empty state
	const renderEmptyState = () => (
		<div className="flex flex-col items-center justify-center p-4 h-[300px] w-full">
			<p className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-2">
				No data found
			</p>
			<p className="text-sm text-gray-500 dark:text-gray-400">
				{Object.keys(filters).length > 0
					? "Try adjusting your filters to see more results"
					: "This table appears to be empty"}
			</p>
		</div>
	);

	// Render loading state
	const renderLoadingState = () => (
		<div className="flex flex-col items-center justify-center p-4 h-[300px] w-full">
			<p className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-2">
				Loading data...
			</p>
		</div>
	);

	// Render error state
	const renderErrorState = () => (
		<div className="flex flex-col items-center justify-center p-4 h-[300px] w-full text-red-500 dark:text-red-400">
			<p className="text-lg font-semibold mb-2">Error Loading Data</p>
			<p className="text-sm">{error}</p>
		</div>
	);

	// Render table header with pagination and active filters/sort
	const renderTableHeaderControls = () => {
		// Format filter display value
		const formatFilterDisplay = (operator: string, value: string): string => {
			if (operator === "IS NULL") return "is empty";
			if (operator === "IS NOT NULL") return "is not empty";
			if (operator === "LIKE") return `contains "${value.replace(/%/g, "")}"`;
			if (operator === "NOT LIKE")
				return `doesn't contain "${value.replace(/%/g, "")}"`;

			return `${operator} ${value}`;
		};

		const renderActiveFiltersAndSort = () => {
			const activeFilters = Object.entries(filters).map(([column, filter]) => (
				<div
					key={`filter-${column}`}
					className="flex items-center text-sm rounded-full mr-2 mb-2 border border-primary/30 bg-primary/10 text-primary px-3 py-1 gap-1"
				>
					<span className="font-medium mr-1">{column}</span>
					<span className="mr-2">
						{formatFilterDisplay(filter.operator, filter.value)}
					</span>
					<button
						type="button"
						onClick={() => handleRemoveFilter(column)}
						className="hover:bg-blue-100 rounded-full p-1 flex items-center justify-center"
						aria-label={`Remove filter for ${column}`}
					>
						<FiX className="w-3 h-3" />
					</button>
				</div>
			));

			const sortChip = sortConfig.column && sortConfig.direction && (
				<div
					key="sort-chip"
					className="flex items-center text-sm rounded-full mr-2 mb-2 border border-primary/30 bg-primary/10 text-primary px-3 py-1 gap-1"
				>
					<span className="font-medium mr-1">{sortConfig.column}</span>
					<span className="mr-2 flex items-center">
						{sortConfig.direction === "asc" ? (
							<FiArrowUp className="mr-1" size={12} />
						) : (
							<FiArrowDown className="mr-1" size={12} />
						)}
						{sortConfig.direction === "asc" ? "ascending" : "descending"}
					</span>
					<button
						type="button"
						onClick={handleRemoveSort}
						className="hover:bg-purple-100 rounded-full p-1 flex items-center justify-center"
						aria-label="Remove sort"
					>
						<FiX className="w-3 h-3" />
					</button>
				</div>
			);

			return [...activeFilters, sortChip];
		};

		return (
			<div className="p-4 border-b border-border/60 bg-card">
				{/* Pagination Controls */}
				<div className="flex items-center justify-between mb-3">
					<div className="flex items-center">
						<h2 className="text-lg font-semibold text-foreground">
							{tableName}
						</h2>
					</div>

					<div className="flex items-center space-x-6">
						{/* Filter button */}
						<div className="flex items-center">
							<Button
								variant="outline"
								size="sm"
								className="flex items-center gap-1 text-primary border border-primary/30 hover:bg-primary/10"
								onClick={openGlobalFilterModal}
							>
								<FiFilter size={14} />
								<span>Filter</span>
								<span className="ml-1 text-xs text-muted-foreground opacity-75">
									⌘+F
								</span>
							</Button>
						</div>

						{/* Rows per page selector */}
						<div className="flex items-center space-x-2">
							<span className="text-sm text-muted-foreground">
								Rows per page:
							</span>
							<select
								value={pagination.rowsPerPage}
								onChange={(e) =>
									handleRowsPerPageChange(Number(e.target.value))
								}
								className="border rounded px-2 py-1 text-sm bg-card text-foreground border-border focus:outline-none focus:ring-2 focus:ring-primary/60"
								aria-label="Rows per page"
							>
								<option value={50}>50</option>
								<option value={100}>100</option>
								<option value={250}>250</option>
								<option value={500}>500</option>
							</select>
						</div>

						{/* Page navigation */}
						<div className="flex items-center space-x-4">
							<span className="text-sm text-muted-foreground">
								{pagination.page * pagination.rowsPerPage + 1}-
								{Math.min(
									(pagination.page + 1) * pagination.rowsPerPage,
									totalRows,
								)}{" "}
								of {totalRows.toLocaleString()} rows
							</span>
							<div className="flex space-x-1">
								<Button
									variant="outline"
									size="icon"
									onClick={() => handlePageChange(pagination.page - 1)}
									disabled={pagination.page === 0}
									aria-label="Previous page"
									className="h-8 w-8 border-border text-foreground hover:bg-muted"
								>
									<FiChevronLeft className="w-5 h-5" />
								</Button>
								<Button
									variant="outline"
									size="icon"
									onClick={() => handlePageChange(pagination.page + 1)}
									disabled={
										(pagination.page + 1) * pagination.rowsPerPage >= totalRows
									}
									aria-label="Next page"
									className="h-8 w-8 border-border text-foreground hover:bg-muted"
								>
									<FiChevronRight className="w-5 h-5" />
								</Button>
							</div>
						</div>
					</div>
				</div>

				{/* Active Filters and Sort Chips */}
				<div className="flex flex-wrap items-center">
					{renderActiveFiltersAndSort()}
				</div>
			</div>
		);
	};

	return (
		<div>
			<div
				className="flex flex-col overflow-hidden border border-border/60 rounded-lg relative bg-panel shadow-sm"
				style={{ height: "calc(100vh - 50px)" }}
			>
				{/* Show loading indicator at the top when loading */}
				{loading && (
					<div className="absolute top-0 left-0 right-0 z-10 h-1 bg-primary/15">
						<div className="h-full bg-primary animate-progress-indeterminate" />
					</div>
				)}

				{/* Table header with pagination and filters */}
				{columns.length > 0 && renderTableHeaderControls()}

				{/* Table container with fixed height and horizontal scroll */}
				<div
					ref={tableRef}
					className="relative overflow-auto bg-card"
					style={{ maxHeight: "calc(100vh - 50px)" }}
				>
					{/* Table header (sticky) */}
					{columns.length > 0 && (
						<div className="sticky top-0 z-10">{renderTableHeader()}</div>
					)}

					{/* Table body (scrollable) */}
					{error ? (
						renderErrorState()
					) : loading && !hasData ? (
						renderLoadingState()
					) : hasData ? (
						<div style={{ height: "calc(100% - 50px)" }}>
							{data.map((row, index) => (
								<TableRow
									key={`row-${index}`}
									row={row}
									rowIndex={index}
									columns={columns}
									primaryKeys={primaryKeys}
									isSelected={isRowSelected(row)}
									columnWidths={columnWidths}
									onRowSelect={handleRowSelect}
									onCopyCellContent={handleCopyCellContent}
								/>
							))}
						</div>
					) : (
						renderEmptyState()
					)}
				</div>
			</div>

			{/* Filter Modal */}
			<FilterModal
				open={filterModalOpen}
				onClose={() => setFilterModalOpen(false)}
				columns={columns}
				selectedColumn={filterColumn}
				currentFilter={filters[filterColumn]}
				onApply={handleFilterApply}
			/>
		</div>
	);
};

// Export the filter click event name for external use
export { FILTER_CLICK_EVENT };

export default memo(DataTable);
