import type React from 'react';
import { IoClose } from 'react-icons/io5';

interface TableListProps {
  tables: string[];
  openTables: string[];
  activeTable: string | null;
  tableSearch: string;
  setTableSearch: (search: string) => void;
  handleTableSelect: (table: string) => void;
  handleKeyDown: (event: React.KeyboardEvent, table: string) => void;
}

const TableList = ({
  tables,
  openTables,
  activeTable,
  tableSearch,
  setTableSearch,
  handleTableSelect,
  handleKeyDown,
}: TableListProps) => {
  // Filter tables based on search
  const getFilteredTables = () => {
    if (!tableSearch.trim()) return tables;
    return tables.filter(table => 
      table.toLowerCase().includes(tableSearch.toLowerCase())
    );
  };

  return (
    <div  className="w-64 min-w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">Tables</h2>
        
        {/* Search Input */}
        <div className="mb-2 h-[30px]">
          <div>
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Search tables..."
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm 
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                placeholder-gray-400"
            />
            {tableSearch && (
              <button
                type="button"
                onClick={() => setTableSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 
                  hover:text-gray-600"
              >
                <IoClose className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Table List */}
      <div className="overflow-y-auto p-4 pt-2 flex-1" style={{ maxHeight: 'calc(100vh - 220px)' }}>
        <div className="space-y-0.5">
          {getFilteredTables().map(table => (
            <button
              key={table}
              type="button"
              className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors
                ${openTables.includes(table) ? 'text-blue-600' : 'text-gray-700'}
                ${activeTable === table ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}
                focus:outline-none focus:ring-2 focus:ring-blue-500`}
              onClick={() => handleTableSelect(table)}
              onKeyDown={(e) => handleKeyDown(e, table)}
            >
              {table}
            </button>
          ))}
          
          {/* No Results Message */}
          {getFilteredTables().length === 0 && (
            <div className="text-center py-4 text-gray-500 text-sm">
              No tables found matching "{tableSearch}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableList; 