import React from 'react';
import { IoChevronBack, IoChevronForward, IoClose, IoCaretUp, IoCaretDown } from 'react-icons/io5';
import type { SortConfig, FilterCondition } from '../types';

interface TableHeaderProps {
  tableName: string;
  totalRows: number;
  pagination: {
    page: number;
    rowsPerPage: number;
  };
  sortConfig: SortConfig;
  filters: Record<string, FilterCondition>;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onRemoveSort: () => void;
  onRemoveFilter: (column: string) => void;
}

const TableHeader = ({
  tableName,
  totalRows,
  pagination,
  sortConfig,
  filters,
  onPageChange,
  onRowsPerPageChange,
  onRemoveSort,
  onRemoveFilter,
}: TableHeaderProps) => {
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
          onClick={() => onRemoveFilter(column)}
          className="hover:bg-blue-100 rounded-full p-1"
          aria-label={`Remove filter for ${column}`}
        >
          <IoClose className="w-3 h-3" />
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
            <IoCaretUp className="w-3 h-3 mr-1" />
          ) : (
            <IoCaretDown className="w-3 h-3 mr-1" />
          )}
          {sortConfig.direction === 'asc' ? 'ascending' : 'descending'}
        </span>
        <button
          type="button"
          onClick={onRemoveSort}
          className="hover:bg-purple-100 rounded-full p-1"
          aria-label="Remove sort"
        >
          <IoClose className="w-3 h-3" />
        </button>
      </div>
    );

    return [...activeFilters, sortChip];
  };

  return (
    <div className="p-6 pb-4">
      {/* Header and Controls */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-semibold text-gray-800">{tableName}</h2>
        
        {/* Pagination Controls */}
        <div className="flex items-center space-x-6">
          {/* Rows per page selector */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Rows per page:</span>
            <select
              value={pagination.rowsPerPage}
              onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
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
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page === 0}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <IoChevronBack className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={(pagination.page + 1) * pagination.rowsPerPage >= totalRows}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <IoChevronForward className="w-5 h-5" />
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

export default TableHeader; 