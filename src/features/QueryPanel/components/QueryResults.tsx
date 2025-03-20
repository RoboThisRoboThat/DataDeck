import React, { useState, useRef, useMemo, useCallback } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FiFilter, FiArrowUp, FiArrowDown, FiDownload, FiSearch } from 'react-icons/fi';
import FilterModal from './FilterModal';
import { Badge } from 'lucide-react';

interface QueryResultsProps {
  data: any[];
  columns: string[];
  loading: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  column: string;
  direction: SortDirection;
}

interface FilterCondition {
  operator: string;
  value: string;
}

const QueryResults: React.FC<QueryResultsProps> = ({ data, columns, loading }) => {
  const tableRef = useRef<HTMLDivElement>(null);
  
  // Debug logs to check incoming data
  console.log('QueryResults received props:', {
    dataLength: data?.length || 0,
    columnsLength: columns?.length || 0,
    sampleData: data?.[0],
    columns,
    loading
  });
  
  // Ensure data and columns are arrays
  const safeData = Array.isArray(data) ? data : [];
  const safeColumns = Array.isArray(columns) ? columns : [];
  
  // If we have data but no columns, try to infer columns from the first row
  const effectiveColumns = safeColumns.length > 0 
    ? safeColumns 
    : (safeData.length > 0 ? Object.keys(safeData[0]) : []);
  
  // State for interaction
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [filters, setFilters] = useState<Record<string, FilterCondition>>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: '', direction: null });
  
  // State for column menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [currentColumn, setCurrentColumn] = useState<string>('');
  
  // State for filter modal
  const [filterModalOpen, setFilterModalOpen] = useState<boolean>(false);
  const [filterColumn, setFilterColumn] = useState<string>('');
  
  // Add pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  
  // Handle column menu open
  const handleColumnMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, column: string) => {
    setAnchorEl(event.currentTarget);
    setCurrentColumn(column);
  };
  
  // Handle column menu close
  const handleColumnMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Handle sort change
  const handleSortChange = (column: string, direction: SortDirection) => {
    setSortConfig({ column, direction });
    handleColumnMenuClose();
  };
  
  // Handle remove sort
  const handleRemoveSort = () => {
    setSortConfig({ column: '', direction: null });
  };
  
  // Handle filter click from column menu
  const handleFilterClick = (column: string) => {
    setFilterColumn(column);
    setFilterModalOpen(true);
    handleColumnMenuClose();
  };
  
  // Handle filter apply
  const handleFilterApply = (column: string, operator: string, value: string) => {
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
  
  // Apply filtering and sorting to data
  const filteredAndSortedData = useMemo(() => {
    // Start with the safe data
    let result = [...safeData];
    
    // Apply filters
    if (Object.keys(filters).length > 0) {
      result = result.filter(row => {
        // Check all filter conditions
        return Object.entries(filters).every(([column, filter]) => {
          const value = row[column];
          const filterValue = filter.value;
          
          // Handle null/undefined values
          if (value === null || value === undefined) {
            return filter.operator === 'IS_NULL';
          }
          
          // Convert to string for comparison
          const strValue = String(value).toLowerCase();
          
          switch (filter.operator) {
            case 'EQUALS':
              return strValue === filterValue.toLowerCase();
            case 'NOT_EQUALS':
              return strValue !== filterValue.toLowerCase();
            case 'CONTAINS':
              return strValue.includes(filterValue.toLowerCase());
            case 'NOT_CONTAINS':
              return !strValue.includes(filterValue.toLowerCase());
            case 'STARTS_WITH':
              return strValue.startsWith(filterValue.toLowerCase());
            case 'ENDS_WITH':
              return strValue.endsWith(filterValue.toLowerCase());
            case 'IS_EMPTY':
              return strValue === '';
            case 'IS_NOT_EMPTY':
              return strValue !== '';
            case 'IS_NULL':
              return value === null || value === undefined;
            case 'IS_NOT_NULL':
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
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (bValue === null || bValue === undefined) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        
        // Compare based on type
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' 
            ? aValue - bValue 
            : bValue - aValue;
        }
        
        // Convert to string for comparison
        const aString = String(aValue).toLowerCase();
        const bString = String(bValue).toLowerCase();
        
        return sortConfig.direction === 'asc'
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
    console.log('Changing to page:', newPage); // Debug log
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
    const csvHeader = effectiveColumns.join(',');
    const csvRows = filteredAndSortedData.map(row => {
      return effectiveColumns.map(column => {
        const value = row[column];
        // Handle null, undefined and different types
        if (value === null || value === undefined) {
          return '';
        } else if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        } else {
          // Escape quotes and wrap in quotes if needed
          return typeof value === 'string' && (value.includes(',') || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"`
            : String(value);
        }
      }).join(',');
    }).join('\n');
    
    const csvContent = `${csvHeader}\n${csvRows}`;
    
    // Create a blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `query-results-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [effectiveColumns, filteredAndSortedData]);
  
  // Format cell value for display
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  };
  
  // Render table header with active filters and sort
  const renderTableHeaderControls = () => {
    // Format filter display value
    const formatFilterDisplay = (operator: string, value: string): string => {
      switch (operator) {
        case 'IS_NULL':
        case 'IS_EMPTY':
          return 'is empty';
        case 'IS_NOT_NULL':
        case 'IS_NOT_EMPTY':
          return 'is not empty';
        case 'CONTAINS':
          return `contains "${value}"`;
        case 'NOT_CONTAINS':
          return `doesn't contain "${value}"`;
        case 'STARTS_WITH':
          return `starts with "${value}"`;
        case 'ENDS_WITH':
          return `ends with "${value}"`;
        case 'EQUALS':
          return `= "${value}"`;
        case 'NOT_EQUALS':
          return `!= "${value}"`;
        default:
          return `${operator} ${value}`;
      }
    };

    const renderActiveFiltersAndSort = () => {
      const activeFilters = Object.entries(filters).map(([column, filter]) => (
        <Badge
          key={`filter-${column}`}
          variant="secondary"
          className="bg-blue-50 text-blue-700 border border-blue-100 mr-2 mb-2 px-3 py-1 flex items-center gap-1"
        >
          <span className="font-medium mr-1">{column}</span>
          <span className="mr-2">{formatFilterDisplay(filter.operator, filter.value)}</span>
          <button
            type="button"
            onClick={() => handleRemoveFilter(column)}
            className="hover:bg-blue-100 rounded-full p-1 flex items-center justify-center"
            aria-label={`Remove filter for ${column}`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </Badge>
      ));

      const sortChip = sortConfig.column && sortConfig.direction && (
        <Badge
          key="sort-chip"
          variant="secondary"
          className="bg-purple-50 text-purple-700 border border-purple-100 mr-2 mb-2 px-3 py-1 flex items-center gap-1"
        >
          <span className="font-medium mr-1">{sortConfig.column}</span>
          <span className="mr-2 flex items-center">
            {sortConfig.direction === 'asc' ? (
              <FiArrowUp className="mr-1" size={12} />
            ) : (
              <FiArrowDown className="mr-1" size={12} />
            )}
            {sortConfig.direction === 'asc' ? 'ascending' : 'descending'}
          </span>
          <button
            type="button"
            onClick={handleRemoveSort}
            className="hover:bg-purple-100 rounded-full p-1 flex items-center justify-center"
            aria-label="Remove sort"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </Badge>
      );

      return [...activeFilters, sortChip];
    };

    const hasActiveFilters = Object.keys(filters).length > 0 || (sortConfig.column && sortConfig.direction);

    return (
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-gray-800 text-lg font-medium">
            Results{' '}
            <span className="text-sm font-normal text-gray-500 ml-2">
              {filteredAndSortedData.length} rows total
              {filteredAndSortedData.length > rowsPerPage && (
                <span className="ml-2">
                  (Showing {page * rowsPerPage + 1}-
                  {Math.min((page + 1) * rowsPerPage, filteredAndSortedData.length)})
                </span>
              )}
            </span>
          </h3>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={exportToCSV}
                  disabled={!filteredAndSortedData.length}
                  className={!filteredAndSortedData.length ? "text-gray-300" : "text-gray-600 hover:bg-gray-100"}
                >
                  <FiDownload size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export as CSV</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* Active Filters and Sort Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center mt-2">
            {renderActiveFiltersAndSort()}
          </div>
        )}
      </div>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center p-8 h-[300px] w-full text-center">
      <FiSearch size={40} className="text-gray-300 mb-4" />
      <h3 className="text-gray-500 mb-2 text-lg font-medium">
        No data found
      </h3>
      <p className="text-gray-400 max-w-md text-sm">
        {Object.keys(filters).length > 0 
          ? 'Try adjusting your filters to see more results'
          : 'Run a query to see results here'}
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
    <div className="h-full flex flex-col">
      {/* Table header with filters - Fixed */}
      <div className="flex-none border-b border-gray-200">
        {effectiveColumns.length > 0 && renderTableHeaderControls()}
      </div>

      {/* Table container with horizontal scroll wrapper */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        {loading && !filteredAndSortedData.length ? (
          renderLoadingState()
        ) : filteredAndSortedData.length > 0 ? (
          <div className="flex-1 overflow-auto">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden">
                <Table>
                  <TableHeader className="bg-white sticky top-0 z-10">
                    <TableRow className="hover:bg-white">
                      {effectiveColumns.map(column => {
                        const isColumnSorted = sortConfig.column === column;
                        const isColumnFiltered = column in filters;
                        
                        return (
                          <TableHead 
                            key={column}
                            className={`px-3 py-3 font-medium text-sm truncate border-b border-gray-200
                              ${isColumnSorted ? 'bg-blue-50' : ''}
                              ${isColumnFiltered ? 'bg-yellow-50' : ''}
                            `}
                          >
                            <div className="flex items-center justify-between">
                              <button
                                className="text-gray-700 font-medium truncate flex items-center"
                                onClick={() => handleSortChange(column, isColumnSorted ? (sortConfig.direction === 'asc' ? 'desc' : null) : 'asc')}
                              >
                                <span className="truncate">{column}</span>
                                {isColumnSorted && (
                                  <span className="ml-1 text-blue-500">
                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </button>
                              <button
                                className={`p-1 rounded hover:bg-gray-200 ${isColumnFiltered ? 'text-yellow-600' : 'text-gray-400'}`}
                                onClick={(e) => handleFilterClick(column)}
                              >
                                <FiFilter size={14} />
                              </button>
                            </div>
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((row, index) => (
                      <TableRow 
                        key={index}
                        className={`${hoveredRow === index ? 'bg-blue-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                        onMouseEnter={() => setHoveredRow(index)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        {effectiveColumns.map(column => {
                          const value = formatCellValue(row[column]);
                          const isEmpty = value === '';
                          
                          return (
                            <TableCell
                              key={`${index}-${column}`}
                              className={`px-3 py-3 text-sm truncate
                                ${isEmpty ? 'text-gray-400 italic' : 'text-gray-700'}
                              `}
                              title={isEmpty ? 'NULL' : value}
                            >
                              {isEmpty ? 'NULL' : value}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : (
          renderEmptyState()
        )}
        
        {/* Pagination - Fixed at bottom */}
        {filteredAndSortedData.length > 0 && (
          <div className="flex-none border-t border-gray-200 bg-white">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span>Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                  className="border rounded text-sm py-1 px-2"
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                  <option value={500}>500</option>
                </select>
                <span className="ml-4">
                  {page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, filteredAndSortedData.length)}{' '}
                  of {filteredAndSortedData.length}
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(0)}
                  disabled={page === 0}
                  className="h-8 w-8 p-0"
                >
                  <span className="sr-only">First page</span>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8.84182 3.13514C9.04327 3.32401 9.05348 3.64042 8.86462 3.84188L5.43521 7.49991L8.86462 11.1579C9.05348 11.3594 9.04327 11.6758 8.84182 11.8647C8.64036 12.0535 8.32394 12.0433 8.13508 11.8419L4.38508 7.84188C4.20477 7.64955 4.20477 7.35027 4.38508 7.15794L8.13508 3.15794C8.32394 2.95648 8.64036 2.94628 8.84182 3.13514Z" fill="currentColor" />
                  </svg>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 0}
                  className="h-8 w-8 p-0"
                >
                  <span className="sr-only">Previous page</span>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.85355 3.14645C7.04882 3.34171 7.04882 3.65829 6.85355 3.85355L3.70711 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H3.70711L6.85355 11.1464C7.04882 11.3417 7.04882 11.6583 6.85355 11.8536C6.65829 12.0488 6.34171 12.0488 6.14645 11.8536L2.14645 7.85355C1.95118 7.65829 1.95118 7.34171 2.14645 7.14645L6.14645 3.14645C6.34171 2.95118 6.65829 2.95118 6.85355 3.14645Z" fill="currentColor" />
                  </svg>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= Math.ceil(filteredAndSortedData.length / rowsPerPage) - 1}
                  className="h-8 w-8 p-0"
                >
                  <span className="sr-only">Next page</span>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z" fill="currentColor" />
                  </svg>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.ceil(filteredAndSortedData.length / rowsPerPage) - 1)}
                  disabled={page >= Math.ceil(filteredAndSortedData.length / rowsPerPage) - 1}
                  className="h-8 w-8 p-0"
                >
                  <span className="sr-only">Last page</span>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.1584 3.13508C5.95694 3.32394 5.94673 3.64036 6.1356 3.84182L9.56499 7.49989L6.1356 11.1579C5.94673 11.3594 5.95694 11.6758 6.1584 11.8647C6.35986 12.0535 6.67627 12.0433 6.86514 11.8419L10.6151 7.84182C10.7954 7.64949 10.7954 7.35029 10.6151 7.15796L6.86514 3.15796C6.67627 2.9565 6.35986 2.94629 6.1584 3.13508Z" fill="currentColor" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      <FilterModal 
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        column={filterColumn}
        currentFilter={filters[filterColumn]}
        onApply={handleFilterApply}
      />
    </div>
  );
};

export default QueryResults; 