import { useRef, useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Tooltip, 
  Typography, 
  useTheme,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  IconButton
} from '@mui/material';
import { FiFilter, FiArrowUp, FiArrowDown, FiEdit2, FiCopy } from 'react-icons/fi';
import type { MouseEvent } from 'react';
import type { TableDataRow } from "../types";
import JsonCell from "./JsonCell";
import FilterModal from "./FilterModal";
import EditCellModal from "./EditCellModal";
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { 
  fetchTableData, 
  setFilters, 
  setSortConfig, 
  setPagination, 
  setActiveTable,
  fetchPrimaryKeys,
  setEditingCell
} from '../../../store/slices/tablesSlice';

// Create a custom event for filter clicks
const FILTER_CLICK_EVENT = 'dataTableFilterClick';

interface DataTableProps {
  tableName: string;
  connectionId: string;
}

const DataTable = ({
  tableName,
  connectionId
}: DataTableProps) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const tableRef = useRef<HTMLDivElement>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ rowIndex: number, columnName: string } | null>(null);
  
  // Get table state from Redux
  const tableState = useAppSelector(state => 
    state.tables.tables[tableName] || {
      data: [],
      columns: [],
      totalRows: 0,
      loading: false,
      error: null,
      filters: {},
      sortConfig: { column: '', direction: null },
      pagination: { page: 0, rowsPerPage: 100 },
      primaryKeys: [],
      editingCell: null
    }
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
    editingCell
  } = tableState;
  
  // Filter modal state
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filterColumn, setFilterColumn] = useState('');
  
  // Column menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [currentColumn, setCurrentColumn] = useState('');
  
  // Track previous values to detect changes
  const prevTableNameRef = useRef(tableName);
  
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
    dispatch(fetchTableData({
      tableName,
      connectionId,
      filters,
      sortConfig,
      pagination
    }));
    dispatch(fetchPrimaryKeys({
      tableName,
      connectionId
    }));
  }, [tableName, dispatch, filters, sortConfig, pagination, data.length, connectionId]);
  
  // Log when primary keys change
  useEffect(() => {
    console.log("Primary keys for table " + tableName + ":", primaryKeys);
  }, [primaryKeys, tableName]);
  
  // Handle column menu open
  const handleColumnMenuOpen = (event: MouseEvent<HTMLButtonElement>, column: string) => {
    setAnchorEl(event.currentTarget);
    setCurrentColumn(column);
  };
  
  // Handle column menu close
  const handleColumnMenuClose = () => {
    setAnchorEl(null);
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
    document.addEventListener(FILTER_CLICK_EVENT, handleFilterClickEvent as EventListener);
    
    // Clean up
    return () => {
      document.removeEventListener(FILTER_CLICK_EVENT, handleFilterClickEvent as EventListener);
    };
  }, []);
  
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
    
    // Update Redux state
    dispatch(setFilters({ tableName, filters: newFilters }));
    
    // Close the filter modal
    setFilterModalOpen(false);
  };
  
  // Handle sort change
  const handleSortChange = (column: string, direction: 'asc' | 'desc' | null) => {
    dispatch(setSortConfig({ 
      tableName, 
      sortConfig: { column, direction } 
    }));
    
    // Close the column menu
    handleColumnMenuClose();
  };
  
  // Handle remove sort
  const handleRemoveSort = () => {
    dispatch(setSortConfig({ 
      tableName, 
      sortConfig: { column: '', direction: null } 
    }));
  };
  
  // Handle remove filter
  const handleRemoveFilter = (column: string) => {
    const newFilters = { ...filters };
    delete newFilters[column];
    
    dispatch(setFilters({ 
      tableName, 
      filters: newFilters 
    }));
  };
  
  // Handle page change
  const handlePageChange = (newPage: number) => {
    dispatch(setPagination({ 
      tableName, 
      pagination: { ...pagination, page: newPage } 
    }));
  };
  
  // Handle rows per page change
  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    dispatch(setPagination({ 
      tableName, 
      pagination: { page: 0, rowsPerPage: newRowsPerPage } 
    }));
  };

  // Handle filter click from column menu
  const handleFilterClick = (column: string) => {
    setFilterColumn(column);
    setFilterModalOpen(true);
    handleColumnMenuClose();
  };

  // Handle cell edit
  const handleCellEdit = (rowIndex: number, columnName: string) => {
    console.log("Attempting to edit cell, primary keys available:", primaryKeys);
    if (primaryKeys.length === 0) {
      console.log('No primary keys found, editing not allowed');
      return; // No primary key, editing not allowed
    }

    const row = data[rowIndex];
    const primaryKeyColumn = primaryKeys[0]; // Using the first primary key
    const primaryKeyValue = row[primaryKeyColumn];
    
    console.log("Using primary key column: " + primaryKeyColumn + ", value: " + primaryKeyValue);

    dispatch(setEditingCell({
      tableName,
      editingCell: {
        rowIndex,
        columnName,
        value: row[columnName],
        primaryKeyColumn,
        primaryKeyValue
      }
    }));
  };

  // Handle closing the edit modal
  const handleCloseEditModal = () => {
    dispatch(setEditingCell({
      tableName,
      editingCell: null
    }));
  };

  // Copy cell content to clipboard
  const handleCopyCellContent = (value: unknown) => {
    const textToCopy = formatCellValue(value);
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        // You could add a toast notification here
        console.log('Copied to clipboard:', textToCopy);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };

  // Format cell value for display
  const formatCellValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    // Handle other types
    return String(value);
  };

  // Check if the table has data
  const hasData = data.length > 0;
  
  // Get cell width based on column name and content
  const getCellWidth = (column: string): string => {
    // Adjust width based on column name length
    if (column.length > 30) return '300px';
    if (column.length > 20) return '250px';
    if (column.length > 10) return '200px';
    return '150px';
  };

  // Render the table header
  const renderTableHeader = () => (
    <div className="sticky top-0 z-10 flex border-b border-gray-200 bg-gray-50">
      {columns.map(column => {
        const width = getCellWidth(column);
        return (
          <div 
            key={`header-${column}`}
            className="flex items-center justify-between p-3 font-medium text-gray-700"
            style={{ 
              width,
              minWidth: width,
              maxWidth: width,
              borderRight: '1px solid rgba(224, 224, 224, 0.4)'
            }}
          >
            <Tooltip title={column} arrow placement="top">
              <Typography
                variant="subtitle2"
                noWrap
                className="max-w-[200px] truncate"
              >
                {column}
              </Typography>
            </Tooltip>
            
            {/* Filter icon for each column */}
            <button
              type="button"
              className="p-1 rounded-full hover:bg-gray-200 focus:outline-none"
              onClick={(e: MouseEvent<HTMLButtonElement>) => handleColumnMenuOpen(e, column)}
              aria-label={`Filter ${column}`}
            >
              <FiFilter size={16} />
            </button>
          </div>
        );
      })}
      
      {/* Column Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleColumnMenuClose}
      >
        <MenuItem onClick={() => handleSortChange(currentColumn, 'asc')}>
          <ListItemIcon>
            <FiArrowUp size={16} />
          </ListItemIcon>
          <ListItemText>Sort Ascending</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleSortChange(currentColumn, 'desc')}>
          <ListItemIcon>
            <FiArrowDown size={16} />
          </ListItemIcon>
          <ListItemText>Sort Descending</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleFilterClick(currentColumn)}>
          <ListItemIcon>
            <FiFilter size={16} />
          </ListItemIcon>
          <ListItemText>Filter</ListItemText>
        </MenuItem>
      </Menu>
    </div>
  );

  // Render a table row
  const renderTableRow = (row: TableDataRow, rowIndex: number) => (
    <div 
      key={`row-${rowIndex}`}
      className={`flex border-b border-gray-100 ${
        hoveredRow === rowIndex ? 'bg-blue-50' : rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
      }`}
      onMouseEnter={() => setHoveredRow(rowIndex)}
      onMouseLeave={() => setHoveredRow(null)}
    >
      {columns.map(column => {
        const cellValue = row[column];
        const isJson = 
          typeof cellValue === 'object' && 
          cellValue !== null && 
          !(cellValue instanceof Date);
        
        const isPrimaryKey = primaryKeys.includes(column);
        const isEditableCell = !isPrimaryKey; // Don't allow editing primary key
        const isCellHovered = hoveredCell?.rowIndex === rowIndex && hoveredCell?.columnName === column;
        const width = getCellWidth(column);
        
        return (
          <div 
            key={`cell-${rowIndex}-${column}`}
            className="p-3 overflow-hidden text-gray-900 relative"
            style={{ 
              width,
              minWidth: width,
              maxWidth: width,
              borderRight: '1px solid rgba(224, 224, 224, 0.4)'
            }}
            onMouseEnter={() => setHoveredCell({ rowIndex, columnName: column })}
            onMouseLeave={() => setHoveredCell(null)}
          >
            {isJson ? (
              <JsonCell value={cellValue} />
            ) : (
              <Tooltip title="Click to copy" arrow placement="top">
                <Typography 
                  variant="body2" 
                  noWrap 
                  className="cursor-pointer hover:text-blue-600"
                  onClick={() => handleCopyCellContent(cellValue)}
                >
                  {formatCellValue(cellValue)}
                </Typography>
              </Tooltip>
            )}
            
            {/* Cell action buttons */}
            {isCellHovered && (
              <div 
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 rounded shadow-sm flex"
                style={{ zIndex: 2 }}
              >
                {/* Copy button */}
                <Tooltip title="Copy to clipboard" arrow>
                  <IconButton
                    size="small"
                    onClick={() => handleCopyCellContent(cellValue)}
                    className="text-gray-500 hover:text-blue-600"
                  >
                    <FiCopy size={14} />
                  </IconButton>
                </Tooltip>
                
                {/* Edit button */}
                <Tooltip 
                  title={
                    !primaryKeys.length 
                      ? "Editing not available: Table has no primary key" 
                      : isEditableCell 
                        ? "Edit cell value" 
                        : "Primary key cannot be edited"
                  } 
                  arrow
                >
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => isEditableCell && handleCellEdit(rowIndex, column)}
                      disabled={!primaryKeys.length || !isEditableCell}
                      className={`text-gray-500 hover:text-blue-600 ${!primaryKeys.length || !isEditableCell ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <FiEdit2 size={14} />
                    </IconButton>
                  </span>
                </Tooltip>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Render empty state
  const renderEmptyState = () => (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        p: 4,
        height: '300px',
        width: '100%'
      }}
    >
      <Typography variant="h6" color="text.secondary" gutterBottom>
        No data found
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {Object.keys(filters).length > 0 
          ? 'Try adjusting your filters to see more results'
          : 'This table appears to be empty'}
      </Typography>
    </Box>
  );

  // Render loading state
  const renderLoadingState = () => (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        p: 4,
        height: '300px',
        width: '100%'
      }}
    >
      <Typography variant="h6" color="text.secondary" gutterBottom>
        Loading data...
      </Typography>
    </Box>
  );

  // Render error state
  const renderErrorState = () => (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        p: 4,
        height: '300px',
        width: '100%',
        color: 'error.main'
      }}
    >
      <Typography variant="h6" color="error" gutterBottom>
        Error Loading Data
      </Typography>
      <Typography variant="body2" color="error.main">
        {error}
      </Typography>
    </Box>
  );

  // Render table header with pagination and active filters/sort
  const renderTableHeaderControls = () => {
    // Format filter display value
    const formatFilterDisplay = (operator: string, value: string): string => {
      if (operator === 'IS NULL') return 'is empty';
      if (operator === 'IS NOT NULL') return 'is not empty';
      if (operator === 'LIKE') return `contains "${value.replace(/%/g, '')}"`;
      if (operator === 'NOT LIKE') return `doesn't contain "${value.replace(/%/g, '')}"`;
      
      return `${operator} ${value}`;
    };

    const renderActiveFiltersAndSort = () => {
      const activeFilters = Object.entries(filters).map(([column, filter]) => (
        <div
          key={`filter-${column}`}
          className="flex items-center bg-blue-50 text-blue-700 text-sm rounded-full px-3 py-1 mr-2 mb-2"
        >
          <span className="font-medium mr-1">{column}</span>
          <span className="mr-2">{formatFilterDisplay(filter.operator, filter.value)}</span>
          <button
            type="button"
            onClick={() => handleRemoveFilter(column)}
            className="hover:bg-blue-100 rounded-full p-1"
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
          className="flex items-center bg-purple-50 text-purple-700 text-sm rounded-full px-3 py-1 mr-2 mb-2"
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
            className="hover:bg-purple-100 rounded-full p-1"
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

    return (
      <div className="p-4 border-b border-gray-200">
        {/* Pagination Controls */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">{tableName}</h2>
          
          <div className="flex items-center space-x-6">
            {/* Rows per page selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Rows per page:</span>
              <select
                value={pagination.rowsPerPage}
                onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
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
                {Math.min((pagination.page + 1) * pagination.rowsPerPage, totalRows)} of{' '}
                {totalRows.toLocaleString()} rows
              </span>
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 0}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={(pagination.page + 1) * pagination.rowsPerPage >= totalRows}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
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
      <Paper 
        elevation={0} 
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          position: 'relative'
        }}
      >
        {/* Show LinearProgress at the top when loading */}
        {loading && (
          <LinearProgress
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 1000,
            }}
          />
        )}

        {/* Table header with pagination and filters */}
        {columns.length > 0 && renderTableHeaderControls()}
        
        {/* Table container with virtual scrolling */}
        <Box 
          ref={tableRef}
          sx={{ 
            flexGrow: 1,
            overflow: 'auto',
            position: 'relative'
          }}
        >
          {/* Table header */}
          {columns.length > 0 && renderTableHeader()}
          
          {/* Table body */}
          {error ? (
            renderErrorState()
          ) : loading && !hasData ? (
            renderLoadingState()
          ) : hasData ? (
            <div className="table-body">
              {data.map((row, index) => renderTableRow(row, index))}
            </div>
          ) : (
            renderEmptyState()
          )}
        </Box>
      </Paper>
      
      {/* Filter Modal */}
      <FilterModal 
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        column={filterColumn}
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