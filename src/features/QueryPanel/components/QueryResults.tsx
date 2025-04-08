import { type FC, useState, useRef, useMemo, useCallback } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	FiFilter,
	FiArrowUp,
	FiArrowDown,
	FiDownload,
	FiSearch,
} from "react-icons/fi";
import FilterModal from "./FilterModal";
import { Badge } from "lucide-react";

interface QueryResultsProps {
	data: Record<string, unknown>[];
	columns: string[];
	loading: boolean;
}

type SortDirection = "asc" | "desc" | null;

interface SortConfig {
	column: string;
	direction: SortDirection;
}

interface FilterCondition {
	operator: string;
	value: string;
}

const QueryResults: FC<QueryResultsProps> = ({ data, columns, loading }) => {
	const tableRef = useRef<HTMLDivElement>(null);

	// Debug logs to check incoming data
	console.log("QueryResults received props:", {
		dataLength: data?.length || 0,
		columnsLength: columns?.length || 0,
		sampleData: data?.[0],
		columns,
		loading,
	});

	// Ensure data and columns are arrays
	const safeData = Array.isArray(data) ? data : [];
	const safeColumns = Array.isArray(columns) ? columns : [];

	// If we have data but no columns, try to infer columns from the first row
	const effectiveColumns =
		safeColumns.length > 0
			? safeColumns
			: safeData.length > 0
				? Object.keys(safeData[0])
				: [];

	// State for interaction
	const [hoveredRow, setHoveredRow] = useState<number | null>(null);
	const [filters, setFilters] = useState<Record<string, FilterCondition>>({});
	const [sortConfig, setSortConfig] = useState<SortConfig>({
		column: "",
		direction: null,
	});

	// State for column menu
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const [currentColumn, setCurrentColumn] = useState<string>("");

	// State for filter modal
	const [filterModalOpen, setFilterModalOpen] = useState<boolean>(false);
	const [filterColumn, setFilterColumn] = useState<string>("");

	// Add pagination state
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(100);

	// Handle column menu close
	const handleColumnMenuClose = () => {
		setAnchorEl(null);
	};

	// Handle sort change
	const handleSortChange = (column: string, direction: SortDirection) => {
		setSortConfig({ column, direction });
		handleColumnMenuClose();
	};

	// Handle filter click from column menu
	const handleFilterClick = (column: string) => {
		setFilterColumn(column);
		setFilterModalOpen(true);
		handleColumnMenuClose();
	};

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

		// Update filters state
		setFilters(newFilters);

		// Close the filter modal
		setFilterModalOpen(false);
	};

	// Handle remove filter
	const handleRemoveFilter = (column: string) => {
		const newFilters = { ...filters };
		delete newFilters[column];
		setFilters(newFilters);
	};

	// Handle remove sort
	const handleRemoveSort = () => {
		setSortConfig({ column: "", direction: null });
	};

	// Apply filtering and sorting to data
	const filteredAndSortedData = useMemo(() => {
		// Start with the safe data
		let result = [...safeData];

		// Apply filters
		if (Object.keys(filters).length > 0) {
			result = result.filter((row) => {
				// Check all filter conditions
				return Object.entries(filters).every(([column, filter]) => {
					const value = row[column];
					const filterValue = filter.value;

					// Handle null/undefined values
					if (value === null || value === undefined) {
						return filter.operator === "IS_NULL";
					}

					// Convert to string for comparison
					const strValue = String(value).toLowerCase();

					switch (filter.operator) {
						case "EQUALS":
							return strValue === filterValue.toLowerCase();
						case "NOT_EQUALS":
							return strValue !== filterValue.toLowerCase();
						case "CONTAINS":
							return strValue.includes(filterValue.toLowerCase());
						case "NOT_CONTAINS":
							return !strValue.includes(filterValue.toLowerCase());
						case "STARTS_WITH":
							return strValue.startsWith(filterValue.toLowerCase());
						case "ENDS_WITH":
							return strValue.endsWith(filterValue.toLowerCase());
						case "IS_EMPTY":
							return strValue === "";
						case "IS_NOT_EMPTY":
							return strValue !== "";
						case "IS_NULL":
							return value === null || value === undefined;
						case "IS_NOT_NULL":
							return value !== null && value !== undefined;
						default:
							return true;
					}
				});
			});
		}

		// Apply sorting
		if (sortConfig.column && sortConfig.direction) {
			result.sort((a, b) => {
				const aValue = a[sortConfig.column];
				const bValue = b[sortConfig.column];

				// Handle null/undefined values
				if (aValue === null || aValue === undefined) {
					return sortConfig.direction === "asc" ? -1 : 1;
				}
				if (bValue === null || bValue === undefined) {
					return sortConfig.direction === "asc" ? 1 : -1;
				}

				// Compare based on type
				if (typeof aValue === "number" && typeof bValue === "number") {
					return sortConfig.direction === "asc"
						? aValue - bValue
						: bValue - aValue;
				}

				// Convert to string for comparison
				const aString = String(aValue).toLowerCase();
				const bString = String(bValue).toLowerCase();

				return sortConfig.direction === "asc"
					? aString.localeCompare(bString)
					: bString.localeCompare(aString);
			});
		}

		return result;
	}, [safeData, filters, sortConfig]);

	// Get paginated data with proper bounds checking
	const paginatedData = useMemo(() => {
		const startIndex = page * rowsPerPage;
		const endIndex = startIndex + rowsPerPage;

		// Add bounds checking
		if (startIndex >= filteredAndSortedData.length) {
			// If we're somehow beyond the last page, reset to first page
			setPage(0);
			return filteredAndSortedData.slice(0, rowsPerPage);
		}

		return filteredAndSortedData.slice(startIndex, endIndex);
	}, [filteredAndSortedData, page, rowsPerPage]);

	// Update the page change handler to be more explicit
	const handlePageChange = (newPage: number) => {
		console.log("Changing to page:", newPage); // Debug log
		setPage(newPage);
	};

	// Update the rows per page change handler
	const handleRowsPerPageChange = (newRowsPerPage: number) => {
		setRowsPerPage(newRowsPerPage);
		setPage(0); // Reset to first page when changing rows per page
	};

	// Export data as CSV
	const exportToCSV = useCallback(() => {
		if (!filteredAndSortedData.length) return;

		// Create CSV content
		const csvHeader = effectiveColumns.join(",");
		const csvRows = filteredAndSortedData
			.map((row) => {
				return effectiveColumns
					.map((column) => {
						const value = row[column];
						// Handle null, undefined and different types
						if (value === null || value === undefined) {
							return "";
						} else if (typeof value === "object") {
							return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
						} else {
							// Escape quotes and wrap in quotes if needed
							return typeof value === "string" &&
								(value.includes(",") || value.includes('"'))
								? `"${value.replace(/"/g, '""')}"`
								: String(value);
						}
					})
					.join(",");
			})
			.join("\n");

		const csvContent = `${csvHeader}\n${csvRows}`;

		// Create a blob and download
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute(
			"download",
			`query-results-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.csv`,
		);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}, [effectiveColumns, filteredAndSortedData]);

	// Format cell value for display
	const formatCellValue = (value: unknown): string => {
		if (value === null || value === undefined) {
			return "NULL";
		}
		if (typeof value === "object") {
			return JSON.stringify(value);
		}
		return String(value);
	};

	// Render table header with active filters and sort
	const renderTableHeaderControls = () => {
		// Format filter display value
		const formatFilterDisplay = (operator: string, value: string): string => {
			switch (operator) {
				case "IS_NULL":
				case "IS_EMPTY":
					return "is empty";
				case "IS_NOT_NULL":
				case "IS_NOT_EMPTY":
					return "is not empty";
				case "CONTAINS":
					return `contains "${value}"`;
				case "NOT_CONTAINS":
					return `doesn't contain "${value}"`;
				case "STARTS_WITH":
					return `starts with "${value}"`;
				case "ENDS_WITH":
					return `ends with "${value}"`;
				case "EQUALS":
					return `= "${value}"`;
				case "NOT_EQUALS":
					return `!= "${value}"`;
				default:
					return `${operator} ${value}`;
			}
		};

		const renderActiveFiltersAndSort = () => {
			const activeFilters = Object.entries(filters).map(([column, filter]) => (
				<Badge
					key={`filter-${column}`}
					className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800"
				>
					<span className="font-medium mr-1">{column}</span>
					<span className="mr-2">
						{formatFilterDisplay(filter.operator, filter.value)}
					</span>
					<button
						type="button"
						onClick={() => handleRemoveFilter(column)}
						className="hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full p-1"
					>
						×
					</button>
				</Badge>
			));

			const sortChip = sortConfig.column && sortConfig.direction && (
				<Badge className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800">
					<span className="font-medium mr-1">{sortConfig.column}</span>
					<span className="mr-2">
						{sortConfig.direction === "asc" ? "↑" : "↓"}
						{sortConfig.direction === "asc" ? " ascending" : " descending"}
					</span>
					<button
						type="button"
						onClick={handleRemoveSort}
						className="hover:bg-purple-100 dark:hover:bg-purple-800 rounded-full p-1"
					>
						×
					</button>
				</Badge>
			);

			return [...activeFilters, sortChip];
		};

		const hasActiveFilters =
			Object.keys(filters).length > 0 ||
			(sortConfig.column && sortConfig.direction);

		return (
			<div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
				<div className="flex items-center justify-between mb-2">
					<h3 className="text-gray-800 dark:text-gray-200 text-lg font-medium">
						Results{" "}
						<span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
							{filteredAndSortedData.length} rows total
							{filteredAndSortedData.length > rowsPerPage && (
								<span className="ml-2">
									(Showing {page * rowsPerPage + 1}-
									{Math.min(
										(page + 1) * rowsPerPage,
										filteredAndSortedData.length,
									)}
									)
								</span>
							)}
						</span>
					</h3>

					<div className="flex items-center gap-2">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										onClick={exportToCSV}
										disabled={!filteredAndSortedData.length}
										className={
											!filteredAndSortedData.length
												? "text-gray-300 dark:text-gray-600"
												: "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
										}
									>
										<FiDownload size={18} />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p className="dark:text-gray-200">Export as CSV</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
				</div>

				{/* Active Filters and Sort */}
				<div className="flex flex-wrap items-center gap-2">
					{Object.entries(filters).map(([column, filter]) => (
						<Badge
							key={`filter-${column}`}
							className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800"
						>
							<span className="font-medium mr-1">{column}</span>
							<span className="mr-2">
								{formatFilterDisplay(filter.operator, filter.value)}
							</span>
							<button
								type="button"
								onClick={() => handleRemoveFilter(column)}
								className="hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full p-1"
							>
								×
							</button>
						</Badge>
					))}
					{sortConfig.column && sortConfig.direction && (
						<Badge className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800">
							<span className="font-medium mr-1">{sortConfig.column}</span>
							<span className="mr-2">
								{sortConfig.direction === "asc" ? "↑" : "↓"}
								{sortConfig.direction === "asc" ? " ascending" : " descending"}
							</span>
							<button
								type="button"
								onClick={handleRemoveSort}
								className="hover:bg-purple-100 dark:hover:bg-purple-800 rounded-full p-1"
							>
								×
							</button>
						</Badge>
					)}
				</div>
			</div>
		);
	};

	// Render empty state
	const renderEmptyState = () => (
		<div className="flex flex-col items-center justify-center p-8 h-[300px] w-full text-center">
			<FiSearch size={40} className="text-gray-300 mb-4" />
			<h3 className="text-gray-500 mb-2 text-lg font-medium">No data found</h3>
			<p className="text-gray-400 max-w-md text-sm">
				{Object.keys(filters).length > 0
					? "Try adjusting your filters to see more results"
					: "Run a query to see results here"}
			</p>
		</div>
	);

	// Render loading state
	const renderLoadingState = () => (
		<div className="flex flex-col items-center justify-center p-8 h-[300px] w-full">
			<h3 className="text-gray-500 mb-4 text-lg font-medium">
				Executing query...
			</h3>
			<div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
				<div className="h-full bg-blue-500 animate-progress"></div>
			</div>
		</div>
	);

	const hasData = filteredAndSortedData.length > 0;

	return (
		<div className="w-full flex flex-col overflow-hidden bg-white dark:bg-gray-900">
			{/* Header with actions */}
			<div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
				<div className="flex items-center justify-between mb-2">
					<h3 className="text-gray-800 dark:text-gray-200 text-lg font-medium">
						Results{" "}
						<span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
							{filteredAndSortedData.length} rows total
							{filteredAndSortedData.length > rowsPerPage && (
								<span className="ml-2">
									(Showing {page * rowsPerPage + 1}-
									{Math.min(
										(page + 1) * rowsPerPage,
										filteredAndSortedData.length,
									)}
									)
								</span>
							)}
						</span>
					</h3>

					<div className="flex items-center gap-2">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										onClick={exportToCSV}
										disabled={!filteredAndSortedData.length}
										className={
											!filteredAndSortedData.length
												? "text-gray-300 dark:text-gray-600"
												: "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
										}
									>
										<FiDownload size={18} />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p className="dark:text-gray-200">Export as CSV</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
				</div>

				{/* Active Filters and Sort */}
				<div className="flex flex-wrap items-center gap-2">
					{Object.entries(filters).map(([column, filter]) => (
						<Badge
							key={`filter-${column}`}
							className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800"
						>
							<span className="font-medium mr-1">{column}</span>
							<span className="mr-2">
								{formatFilterDisplay(filter.operator, filter.value)}
							</span>
							<button
								type="button"
								onClick={() => handleRemoveFilter(column)}
								className="hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full p-1"
							>
								×
							</button>
						</Badge>
					))}
					{sortConfig.column && sortConfig.direction && (
						<Badge className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800">
							<span className="font-medium mr-1">{sortConfig.column}</span>
							<span className="mr-2">
								{sortConfig.direction === "asc" ? "↑" : "↓"}
								{sortConfig.direction === "asc" ? " ascending" : " descending"}
							</span>
							<button
								type="button"
								onClick={handleRemoveSort}
								className="hover:bg-purple-100 dark:hover:bg-purple-800 rounded-full p-1"
							>
								×
							</button>
						</Badge>
					)}
				</div>
			</div>

			<div className="flex-1 overflow-auto">
				<Table>
					<TableHeader className="sticky top-0 bg-gray-50 dark:bg-gray-800">
						<TableRow className="border-b border-gray-200 dark:border-gray-700">
							{effectiveColumns.map((column) => (
								<TableHead
									key={column}
									className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-100 dark:hover:bg-gray-700"
								>
									<div className="flex items-center space-x-2">
										<span>{column}</span>
										<div className="flex items-center">
											{sortConfig.column === column && (
												<div className="flex items-center">
													{sortConfig.direction === "asc" ? (
														<FiArrowUp className="w-4 h-4 text-blue-500 dark:text-blue-400" />
													) : (
														<FiArrowDown className="w-4 h-4 text-blue-500 dark:text-blue-400" />
													)}
												</div>
											)}
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<Button
															size="sm"
															className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
															onClick={() => handleFilterClick(column)}
														>
															<FiFilter
																className={`w-4 h-4 ${
																	filters[column]
																		? "text-blue-500 dark:text-blue-400"
																		: "text-gray-400 dark:text-gray-500"
																}`}
															/>
														</Button>
													</TooltipTrigger>
													<TooltipContent>
														<p className="text-sm dark:text-gray-200">
															Filter column
														</p>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										</div>
									</div>
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{paginatedData.map((row) => {
							const rowKey = Object.entries(row)
								.map(([key, value]) => `${key}-${value}`)
								.join("-");
							return (
								<TableRow
									key={rowKey}
									className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
								>
									{effectiveColumns.map((column) => (
										<TableCell
											key={`${column}-${rowKey}`}
											className="whitespace-nowrap text-sm text-gray-900 dark:text-gray-300"
										>
											{formatCellValue(row[column])}
										</TableCell>
									))}
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>

			{/* Empty State */}
			{safeData.length === 0 && !loading && (
				<div className="flex flex-col items-center justify-center h-full p-8 text-center">
					<FiSearch className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-4" />
					<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
						No results
					</h3>
					<p className="text-gray-500 dark:text-gray-400">
						Execute a query to see results here
					</p>
				</div>
			)}

			{/* Loading State */}
			{loading && (
				<div className="flex items-center justify-center h-full">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
				</div>
			)}

			{/* Filter Modal */}
			<FilterModal
				open={filterModalOpen}
				onClose={() => setFilterModalOpen(false)}
				onApply={(operator, value) =>
					handleFilterApply(filterColumn, operator, value)
				}
				column={filterColumn}
				currentFilter={filters[filterColumn]}
			/>
		</div>
	);
};

export default QueryResults;
