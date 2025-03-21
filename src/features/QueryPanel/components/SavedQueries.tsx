import React from 'react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { FiDatabase, FiTrash2, FiSearch, FiAlertCircle, FiClock, FiEdit } from 'react-icons/fi';

interface SavedQuery {
  name: string;
  sql: string;
  createdAt: string;
  description?: string;
}

interface SavedQueriesProps {
  connectionId: string;
  onSelectQuery: (sql: string, name: string) => void;
  onDeleteQuery: (name: string) => void;
  currentQueryName: string | null;
  queries: SavedQuery[];
  loading: boolean;
  error: string | null;
  onRefetchQueries: () => void;
}

const SavedQueries: React.FC<SavedQueriesProps> = ({
  onSelectQuery,
  onDeleteQuery,
  currentQueryName,
  queries,
  loading,
  error,
  onRefetchQueries
}) => {
  // State for search
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  
  // Handle search
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  // Filter queries based on search term
  const filteredQueries = searchTerm
    ? queries.filter(query => 
        query.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        query.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : queries;
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // If it's today, just show the time
    if (date.toDateString() === now.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // If it's yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Otherwise show the full date
    return date.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Handle query deletion
  const handleDeleteQuery = async (name: string, event: React.MouseEvent) => {
    // Stop propagation to prevent selecting the query when deleting
    event.stopPropagation();
    
    // Confirm before deleting
    if (window.confirm(`Are you sure you want to delete the query "${name}"?`)) {
      await onDeleteQuery(name);
      // Refresh the queries list after deletion using the provided method
      onRefetchQueries();
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="p-4">
        <h6 className="text-gray-800 mb-3 font-medium">Saved Queries</h6>
        <div className="relative mt-2 mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            className="bg-gray-100 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 pr-3 focus:ring-blue-500 focus:border-blue-500"
            type="text"
            placeholder="Search queries..."
            disabled
          />
        </div>
        <div className="mb-3 border-b" />
        
        {[1, 2, 3].map(i => (
          <div key={i} className="mb-4 bg-white rounded p-3 border border-gray-200">
            <Skeleton className="w-70 h-28" />
            <Skeleton className="w-40 h-16 mt-2" />
          </div>
        ))}
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="p-4">
        <h6 className="text-gray-800 mb-3 font-medium">Saved Queries</h6>
        <div className="mb-4 border-b" />
        
        <div className="p-4 bg-red-50 text-red-700 flex items-start rounded border border-red-200">
          <FiAlertCircle className="mr-2 mt-0.5 flex-shrink-0" />
          <p className="text-sm">
            {error}
          </p>
        </div>
      </div>
    );
  }
  
  // Render empty state
  if (queries.length === 0) {
    return (
      <div className="p-4">
        <h6 className="text-gray-800 mb-3 font-medium">Saved Queries</h6>
        <div className="mb-6 border-b" />
        
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FiDatabase size={36} className="text-gray-300 mb-3" />
          <p className="text-gray-600 mb-1 font-medium">
            No saved queries found
          </p>
          <p className="text-gray-500 max-w-xs">
            Save a query using the save button to see it here.
          </p>
        </div>
      </div>
    );
  }
  
  // Render queries list
  return (
    <div className="p-4">
      <h6 className="text-gray-800 mb-3 font-medium">Saved Queries</h6>
      
      {/* Search input */}
      <div className="relative mt-2 mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FiSearch className="h-5 w-5 text-gray-400" />
        </div>
        <input
          className="bg-gray-100 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 pr-3 focus:ring-blue-500 focus:border-blue-500"
          type="text"
          placeholder="Search queries..."
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>
      
      <div className="mb-3 border-b" />
      
      {filteredQueries.length === 0 && (
        <p className="text-gray-500 py-4 text-center">
          No queries match your search.
        </p>
      )}
      
      <div className="space-y-3">
        {filteredQueries.map((query) => {
          const isActive = currentQueryName === query.name;
          
          return (
            <button
              key={query.name}
              type="button"
              onClick={() => onSelectQuery(query.sql, query.name)}
              aria-pressed={isActive}
              className={`w-full text-left overflow-hidden rounded-lg transition-all duration-200 cursor-pointer shadow-sm hover:shadow ${
                isActive 
                  ? 'border-l-4 border-blue-500 bg-blue-50' 
                  : 'border border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-blue-500'}`}>
                      {isActive ? (
                        <FiEdit size={18} />
                      ) : (
                        <FiDatabase size={18} />
                      )}
                    </div>
                    <p 
                      className={`font-medium text-base truncate max-w-[180px] ${isActive ? 'text-blue-700' : 'text-gray-800'}`}
                    >
                      {query.name}
                    </p>
                  </div>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          type="button"
                          onClick={(e) => handleDeleteQuery(query.name, e)}
                          className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete query</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                {query.description && (
                  <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                    {query.description}
                  </p>
                )}
                
                {query.createdAt && (
                  <div className="flex items-center text-gray-400 mt-2">
                    <FiClock size={14} className="mr-1.5" />
                    <p className="text-xs">
                      {formatDate(query.createdAt)}
                    </p>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SavedQueries; 