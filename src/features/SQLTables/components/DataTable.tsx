import { useRef, useState, useEffect, useCallback } from "react";
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
	FiEdit2,
	FiCopy,
} from "react-icons/fi";
import type { MouseEvent } from "react";
import type { TableDataRow } from "../types";
import JsonCell from "./JsonCell";
import FilterModal from "./FilterModal";
import EditCellModal from "./EditCellModal";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
	fetchTableData,
	setFilters,
	setSortConfig,
	setPagination,
	setActiveTable,
	fetchPrimaryKeys,
	setEditingCell,
	fetchTableStructure,
} from "../../../store/slices/tablesSlice";
import { cn } from "@/lib/utils";

// Create a custom event for filter clicks
const FILTER_CLICK_EVENT = "dataTableFilterClick";

interface DataTableProps {
	tableName: string;
	connectionId: string;
}

const DataTable = ({ tableName, connectionId }: DataTableProps) => {
	const dispatch = useAppDispatch();
	const tableRef = useRef<HTMLDivElement>(null);
	const [hoveredRow, setHoveredRow] = useState<number | null>(null);
	const [hoveredCell, setHoveredCell] = useState<{
		rowIndex: number;
		columnName: string;
	} | null>(null);

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
		editingCell,
	} = tableState;

	// Filter modal state
	const [filterModalOpen, setFilterModalOpen] = useState(false);
	const [filterColumn, setFilterColumn] = useState("");

	// Track previous values to detect changes
	const prevTableNameRef = useRef(tableName);

	// Add keyboard shortcut event listener
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Check for Cmd+F (Mac) or Ctrl+F (Windows)
			if ((e.metaKey || e.ctrlKey) && e.key === "f") {
				e.preventDefault(); // Prevent browser's default find behavior

				// Only open the modal if it's not already open
				if (!filterModalOpen) {
					openGlobalFilterModal();
				}
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [filterModalOpen]); // Add filterModalOpen as a dependency

	// Function to open filter modal without pre-selecting a column
	const openGlobalFilterModal = () => {
		setFilterColumn(""); // Clear any pre-selected column
		setFilterModalOpen(true);
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

	// Log when primary keys change
	useEffect(() => {
		console.log(`Primary keys for table ${tableName}:`, primaryKeys);
	}, [primaryKeys, tableName]);

	// Handle column menu close
	const handleColumnMenuClose = () => {
		// No longer using anchorEl so this is simplified
	};

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

		// Close the column menu
		handleColumnMenuClose();
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
		handleColumnMenuClose();
	};

	// Handle cell edit
	const handleCellEdit = (rowIndex: number, columnName: string) => {
		console.log(
			"Attempting to edit cell, primary keys available:",
			primaryKeys,
		);
		if (primaryKeys.length === 0) {
			console.log("No primary keys found, editing not allowed");
			return; // No primary key, editing not allowed
		}

		const row = data[rowIndex];
		const primaryKeyColumn = primaryKeys[0]; // Using the first primary key
		const primaryKeyValue = row[primaryKeyColumn];

		console.log(
			`Using primary key column: ${primaryKeyColumn}, value: ${primaryKeyValue}`,
		);

		dispatch(
			setEditingCell({
				tableName,
				editingCell: {
					rowIndex,
					columnName,
					value: row[columnName],
					primaryKeyColumn,
					primaryKeyValue,
				},
			}),
		);
	};

	// Handle closing the edit modal
	const handleCloseEditModal = () => {
		dispatch(
			setEditingCell({
				tableName,
				editingCell: null,
			}),
		);
	};

	// Copy cell content to clipboard
	const handleCopyCellContent = (value: unknown) => {
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
	};

	// Format cell value for display
	const formatCellValue = (value: unknown): string => {
		if (value === null || value === undefined) {
			return "";
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

	// Render the table header
	const renderTableHeader = () => (
		<div className="sticky top-0 z-10 flex border-b border-gray-200 bg-gray-100 shadow-sm">
			{columns.map((column) => {
				const width = getCellWidth(column);
				const isPrimaryKey = primaryKeys.includes(column);
				const isColumnSorted = sortConfig.column === column;

				return (
					<div
						key={`header-${column}`}
						className={`flex items-center justify-between px-3 py-3 font-medium relative ${
							isPrimaryKey ? "bg-blue-50/70 text-blue-800" : "text-gray-700"
						} ${isColumnSorted ? "bg-purple-50/80" : ""}`}
						style={{
							width,
							minWidth: width,
							maxWidth: width,
							borderRight: "1px solid rgba(224, 224, 224, 0.6)",
						}}
					>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<span className="max-w-[200px] truncate font-medium">
										{column}
										{isPrimaryKey && (
											<span className="ml-1 text-xs bg-blue-200 text-blue-800 px-1 py-0.5 rounded">
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
							<div className="mx-1 text-purple-700">
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
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 p-0 ml-1 text-gray-500 hover:text-gray-800 hover:bg-gray-200/60 rounded-sm"
									onClick={(e: MouseEvent<HTMLButtonElement>) =>
										e.stopPropagation()
									}
								>
									<FiFilter size={14} />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
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

	// Render a table row
	const renderTableRow = (row: TableDataRow, rowIndex: number) => (
		<div
			key={`row-${rowIndex}`}
			className={`flex border-b border-gray-100 transition-colors duration-150 ${
				hoveredRow === rowIndex
					? "bg-blue-50/80"
					: rowIndex % 2 === 0
						? "bg-white"
						: "bg-gray-50/60"
			}`}
			onMouseEnter={() => setHoveredRow(rowIndex)}
			onMouseLeave={() => setHoveredRow(null)}
		>
			{columns.map((column) => {
				const cellValue = row[column];
				const isJson =
					typeof cellValue === "object" &&
					cellValue !== null &&
					!(cellValue instanceof Date);

				const isPrimaryKey = primaryKeys.includes(column);
				const isEditableCell = !isPrimaryKey; // Don't allow editing primary key
				const isCellHovered =
					hoveredCell?.rowIndex === rowIndex &&
					hoveredCell?.columnName === column;
				const width = getCellWidth(column);

				// Special styling based on value type
				const isNull = cellValue === null || cellValue === undefined;

				return (
					<div
						key={`cell-${rowIndex}-${column}`}
						className={`overflow-hidden relative transition-colors duration-150 ${
							isCellHovered ? "bg-blue-50/80" : ""
						}`}
						style={{
							width,
							minWidth: width,
							maxWidth: width,
							borderRight: "1px solid rgba(224, 224, 224, 0.4)",
						}}
						onMouseEnter={() =>
							setHoveredCell({ rowIndex, columnName: column })
						}
						onMouseLeave={() => setHoveredCell(null)}
					>
						<div className={`px-3 py-2.5 ${isPrimaryKey ? "font-medium" : ""}`}>
							{isJson ? (
								<JsonCell value={cellValue} />
							) : (
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="ghost"
												className={`p-0 h-auto w-full justify-start font-normal truncate text-left ${
													isNull
														? "text-gray-400 italic"
														: isPrimaryKey
															? "font-medium"
															: ""
												}`}
												onClick={() => handleCopyCellContent(cellValue)}
												aria-label={`Copy value: ${formatCellValue(cellValue)}`}
											>
												{isNull ? (
													<span className="text-gray-400">NULL</span>
												) : (
													formatCellValue(cellValue)
												)}
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>Click to copy</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							)}
						</div>

						{/* Cell action buttons */}
						{isCellHovered && (
							<div
								className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/95 rounded-md shadow-md flex items-center p-0.5 border border-gray-100"
								style={{ zIndex: 2 }}
							>
								{/* Copy button */}
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7 rounded-sm text-gray-500 hover:text-blue-600 hover:bg-blue-50"
												onClick={() => handleCopyCellContent(cellValue)}
											>
												<FiCopy size={14} />
											</Button>
										</TooltipTrigger>
										<TooltipContent side="bottom">
											<p>Copy to clipboard</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>

								{/* Edit button */}
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												className={cn(
													"h-7 w-7 rounded-sm text-gray-500 hover:text-blue-600 hover:bg-blue-50",
													(!primaryKeys.length || !isEditableCell) &&
														"opacity-50 cursor-not-allowed",
												)}
												onClick={() =>
													isEditableCell && handleCellEdit(rowIndex, column)
												}
												disabled={!primaryKeys.length || !isEditableCell}
											>
												<FiEdit2 size={14} />
											</Button>
										</TooltipTrigger>
										<TooltipContent side="bottom">
											<p>
												{!primaryKeys.length
													? "Editing not available: Table has no primary key"
													: isEditableCell
														? "Edit cell value"
														: "Primary key cannot be edited"}
											</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
						)}
					</div>
				);
			})}
		</div>
	);

	// Render empty state
	const renderEmptyState = () => (
		<div className="flex flex-col items-center justify-center p-4 h-[300px] w-full">
			<p className="text-lg font-semibold text-gray-500 mb-2">No data found</p>
			<p className="text-sm text-gray-500">
				{Object.keys(filters).length > 0
					? "Try adjusting your filters to see more results"
					: "This table appears to be empty"}
			</p>
		</div>
	);

	// Render loading state
	const renderLoadingState = () => (
		<div className="flex flex-col items-center justify-center p-4 h-[300px] w-full">
			<p className="text-lg font-semibold text-gray-500 mb-2">
				Loading data...
			</p>
		</div>
	);

	// Render error state
	const renderErrorState = () => (
		<div className="flex flex-col items-center justify-center p-4 h-[300px] w-full text-red-500">
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
					className="flex items-center text-sm rounded-full mr-2 mb-2 border border-blue-200 bg-blue-50 text-blue-700 px-3 py-1 gap-1"
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
						<svg
							className="w-3 h-3"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>
			));

			const sortChip = sortConfig.column && sortConfig.direction && (
				<div
					key="sort-chip"
					className="flex items-center text-sm rounded-full mr-2 mb-2 border border-purple-200 bg-purple-50 text-purple-700 px-3 py-1 gap-1"
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
						<svg
							className="w-3 h-3"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>
			);

			return [...activeFilters, sortChip];
		};

		return (
			<div className="p-4 border-b border-gray-200">
				{/* Pagination Controls */}
				<div className="flex items-center justify-between mb-3">
					<div className="flex items-center">
						<h2 className="text-lg font-semibold text-gray-800">{tableName}</h2>
					</div>

					<div className="flex items-center space-x-6">
						{/* Filter button */}
						<div className="flex items-center">
							<Button
								variant="outline"
								size="sm"
								className="flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
								onClick={openGlobalFilterModal}
							>
								<FiFilter size={14} />
								<span>Filter</span>
								<span className="ml-1 text-xs text-gray-500 opacity-75">
									⌘+F
								</span>
							</Button>
						</div>

						{/* Rows per page selector */}
						<div className="flex items-center space-x-2">
							<span className="text-sm text-gray-600">Rows per page:</span>
							<select
								value={pagination.rowsPerPage}
								onChange={(e) =>
									handleRowsPerPageChange(Number(e.target.value))
								}
								className="border rounded px-2 py-1 text-sm"
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
							<span className="text-sm text-gray-600">
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
									className="h-8 w-8"
								>
									<svg
										className="w-5 h-5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										xmlns="http://www.w3.org/2000/svg"
										aria-hidden="true"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M15 19l-7-7 7-7"
										/>
									</svg>
								</Button>
								<Button
									variant="outline"
									size="icon"
									onClick={() => handlePageChange(pagination.page + 1)}
									disabled={
										(pagination.page + 1) * pagination.rowsPerPage >= totalRows
									}
									aria-label="Next page"
									className="h-8 w-8"
								>
									<svg
										className="w-5 h-5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										xmlns="http://www.w3.org/2000/svg"
										aria-hidden="true"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9 5l7 7-7 7"
										/>
									</svg>
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
		<>
			<div
				style={{ width: "calc(100vw - 256px)" }}
				className="h-full flex flex-col overflow-hidden border border-gray-200 rounded-md relative"
			>
				{/* Show loading indicator at the top when loading */}
				{loading && (
					<div className="absolute top-0 left-0 right-0 z-10 h-1 bg-blue-200">
						<div className="h-full bg-blue-600 animate-progress-indeterminate" />
					</div>
				)}

				{/* Table header with pagination and filters */}
				{columns.length > 0 && renderTableHeaderControls()}

				{/* Table container with fixed height and horizontal scroll */}
				<div ref={tableRef} className="relative max-h-screen overflow-auto">
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
						<div className="h-full">
							{data.map((row, index) => renderTableRow(row, index))}
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

			{/* Edit Cell Modal */}
			{editingCell && (
				<EditCellModal
					open={!!editingCell}
					onClose={handleCloseEditModal}
					tableName={tableName}
					columnName={editingCell.columnName}
					value={editingCell.value}
					primaryKeyColumn={editingCell.primaryKeyColumn}
					primaryKeyValue={editingCell.primaryKeyValue}
					filters={filters}
					sortConfig={sortConfig}
					pagination={pagination}
					connectionId={connectionId}
				/>
			)}
		</>
	);
};

// Export the filter click event name for external use
export { FILTER_CLICK_EVENT };

export default DataTable;
