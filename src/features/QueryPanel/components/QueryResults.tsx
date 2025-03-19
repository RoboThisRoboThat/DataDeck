import React, { useState, useRef, useMemo, useCallback } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  useTheme, 
  IconButton, 
  LinearProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Badge,
  TablePagination
} from '@mui/material';
import { FiFilter, FiArrowUp, FiArrowDown, FiDownload, FiSearch } from 'react-icons/fi';
import FilterModal from './FilterModal';

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
  const theme = useTheme();
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
  const handlePageChange = (event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    console.log('Changing to page:', newPage); // Debug log
    setPage(newPage);
  };
  
  // Update the rows per page change handler
  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = Number.parseInt(event.target.value, 10);
    console.log('Changing rows per page to:', newRowsPerPage); // Debug log
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
  
  // Get cell width based on column name and content
  const getCellWidth = (column: string): string => {
    // Adjust width based on column name length
    if (column.length > 30) return '300px';
    if (column.length > 20) return '250px';
    if (column.length > 10) return '200px';
    return '150px';
  };
  
  // Render table header
  const renderTableHeader = () => (
    <div className="flex min-w-max border-b border-gray-200">
      {effectiveColumns.map(column => {
        const isColumnSorted = sortConfig.column === column;
        const isColumnFiltered = column in filters;
        
        return (
          <div
            key={column}
            className={`
              flex-none w-[200px] p-3
              flex items-center justify-between
              font-medium text-gray-700 text-sm
              hover:bg-gray-50 cursor-pointer
              ${isColumnSorted ? 'bg-blue-50' : ''}
              ${isColumnFiltered ? 'bg-yellow-50' : ''}
            `}
            onClick={() => handleSortChange(column, isColumnSorted ? (sortConfig.direction === 'asc' ? 'desc' : null) : 'asc')}
            role="columnheader"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSortChange(column, isColumnSorted ? (sortConfig.direction === 'asc' ? 'desc' : null) : 'asc');
              }
            }}
          >
            <div className="flex items-center space-x-2">
              <span className="truncate">{column}</span>
              {isColumnSorted && (
                <span className="text-blue-500">
                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </div>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleFilterClick(column);
              }}
              className={`
                p-1 hover:bg-gray-200 rounded
                ${isColumnFiltered ? 'text-yellow-600' : 'text-gray-400'}
              `}
            >
              <FiFilter size={14} />
            </IconButton>
          </div>
        );
      })}
    </div>
  );
  
  // Render a table row
  const renderTableRow = (row: Record<string, unknown>, index: number) => (
    <div
      key={index}
      className={`
        flex min-w-max border-b border-gray-100
        ${hoveredRow === index ? 'bg-blue-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
      `}
      onMouseEnter={() => setHoveredRow(index)}
      onMouseLeave={() => setHoveredRow(null)}
    >
      {effectiveColumns.map(column => {
        const value = formatCellValue(row[column]);
        const isEmpty = value === '';
        
        return (
          <div
            key={column}
            className={`
              flex-none w-[200px] p-3
              text-sm truncate
              ${isEmpty ? 'text-gray-400 italic' : 'text-gray-700'}
            `}
            title={isEmpty ? 'NULL' : value}
          >
            {isEmpty ? 'NULL' : value}
          </div>
        );
      })}
    </div>
  );
  
  // Render empty state
  const renderEmptyState = () => (
    <Box className="flex flex-col items-center justify-center p-8 h-[300px] w-full text-center">
      <FiSearch size={40} className="text-gray-300 mb-4" />
      <Typography variant="h6" className="text-gray-500 mb-2">
        No data found
      </Typography>
      <Typography variant="body2" className="text-gray-400 max-w-md">
        {Object.keys(filters).length > 0 
          ? 'Try adjusting your filters to see more results'
          : 'Run a query to see results here'}
      </Typography>
    </Box>
  );
  
  // Render loading state
  const renderLoadingState = () => (
    <Box className="flex flex-col items-center justify-center p-8 h-[300px] w-full">
      <Typography variant="h6" className="text-gray-500 mb-4">
        Executing query...
      </Typography>
      <LinearProgress className="w-48" />
    </Box>
  );
  
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
        <div
          key={`filter-${column}`}
          className="flex items-center bg-blue-50 text-blue-700 text-sm rounded-full px-3 py-1 mr-2 mb-2 border border-blue-100"
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
        </div>
      ));

      const sortChip = sortConfig.column && sortConfig.direction && (
        <div
          key="sort-chip"
          className="flex items-center bg-purple-50 text-purple-700 text-sm rounded-full px-3 py-1 mr-2 mb-2 border border-purple-100"
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
        </div>
      );

      return [...activeFilters, sortChip];
    };

    const hasActiveFilters = Object.keys(filters).length > 0 || (sortConfig.column && sortConfig.direction);

    return (
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-2">
          <Typography variant="h6" className="text-gray-800 font-medium">
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
          </Typography>
          
          <Tooltip title="Export as CSV">
            <IconButton 
              size="small" 
              onClick={exportToCSV}
              disabled={!filteredAndSortedData.length}
              className={!filteredAndSortedData.length ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}
            >
              <FiDownload size={18} />
            </IconButton>
          </Tooltip>
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

  const hasData = filteredAndSortedData.length > 0;
  
  return (
    <Box className="h-full flex flex-col">
      {/* Table header with filters - Fixed */}
      <Box className="flex-none border-b border-gray-200">
        {effectiveColumns.length > 0 && renderTableHeaderControls()}
      </Box>

      {/* Table container with horizontal scroll wrapper */}
      <Box className="flex-1 overflow-hidden flex flex-col relative">
        {/* Horizontal scroll container */}
        <Box className="overflow-x-auto">
          <Box className="min-w-full inline-block">
            {/* Fixed header */}
            <Box className="sticky top-0 z-10 bg-white shadow-sm">
              {effectiveColumns.length > 0 && renderTableHeader()}
            </Box>

            {/* Scrollable body */}
            <Box className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
              {loading && !filteredAndSortedData.length ? (
                renderLoadingState()
              ) : filteredAndSortedData.length > 0 ? (
                <div>
                  {paginatedData.map((row, index) => renderTableRow(row, index))}
                </div>
              ) : (
                renderEmptyState()
              )}
            </Box>
          </Box>
        </Box>
        
        {/* Pagination - Fixed at bottom */}
        {filteredAndSortedData.length > 0 && (
          <Box className="flex-none border-t border-gray-200 bg-white mt-auto">
            <TablePagination
              component="div"
              count={filteredAndSortedData.length}
              page={page}
              onPageChange={handlePageChange}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleRowsPerPageChange}
              rowsPerPageOptions={[50, 100, 250, 500]}
              showFirstButton
              showLastButton
              className="border-t border-gray-200"
              sx={{
                '.MuiTablePagination-select': {
                  paddingTop: '0.5rem',
                  paddingBottom: '0.5rem',
                },
                '.MuiTablePagination-selectLabel': {
                  paddingTop: '0.5rem',
                  paddingBottom: '0.5rem',
                },
                '.MuiTablePagination-displayedRows': {
                  paddingTop: '0.5rem',
                  paddingBottom: '0.5rem',
                },
                '.MuiTablePagination-actions': {
                  marginLeft: '1rem',
                  gap: '0.5rem',
                },
                '.MuiTablePagination-root': {
                  overflow: 'visible',
                }
              }}
            />
          </Box>
        )}
      </Box>

      {/* Filter Modal */}
      <FilterModal 
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        column={filterColumn}
        currentFilter={filters[filterColumn]}
        onApply={handleFilterApply}
      />
    </Box>
  );
};

export default QueryResults; 