import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  IconButton,
  Typography,
  Divider,
  Skeleton,
  Tooltip,
  Paper
} from '@mui/material';
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
  
  // Handle query selection
  const handleSelectQuery = (sql: string, name: string) => {
    onSelectQuery(sql, name);
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
  
  // Render loading state
  if (loading) {
    return (
      <Box className="p-4">
        <Typography variant="h6" className="text-gray-800 mb-3 font-medium">Saved Queries</Typography>
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
        <Divider className="mb-3" />
        
        {[1, 2, 3].map(i => (
          <Box key={i} className="mb-4 bg-white rounded p-3 border border-gray-200">
            <Skeleton variant="text" width="70%" height={28} />
            <Skeleton variant="text" width="40%" height={16} className="mt-2" />
          </Box>
        ))}
      </Box>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Box className="p-4">
        <Typography variant="h6" className="text-gray-800 mb-3 font-medium">Saved Queries</Typography>
        <Divider className="mb-4" />
        
        <Paper className="p-4 bg-red-50 text-red-700 flex items-start rounded border border-red-200">
          <FiAlertCircle className="mr-2 mt-0.5 flex-shrink-0" />
          <Typography variant="body2">
            {error}
          </Typography>
        </Paper>
      </Box>
    );
  }
  
  // Render empty state
  if (queries.length === 0) {
    return (
      <Box className="p-4">
        <Typography variant="h6" className="text-gray-800 mb-3 font-medium">Saved Queries</Typography>
        <Divider className="mb-6" />
        
        <Box className="flex flex-col items-center justify-center py-8 text-center">
          <FiDatabase size={36} className="text-gray-300 mb-3" />
          <Typography variant="body1" className="text-gray-600 mb-1 font-medium">
            No saved queries found
          </Typography>
          <Typography variant="body2" className="text-gray-500 max-w-xs">
            Save a query using the save button to see it here.
          </Typography>
        </Box>
      </Box>
    );
  }
  
  // Render queries list
  return (
    <Box className="p-4">
      <Typography variant="h6" className="text-gray-800 mb-3 font-medium">Saved Queries</Typography>
      
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
      
      <Divider className="mb-3" />
      
      {filteredQueries.length === 0 && (
        <Typography variant="body2" className="text-gray-500 py-4 text-center">
          No queries match your search.
        </Typography>
      )}
      
      <List className="space-y-2" disablePadding>
        {filteredQueries.map((query) => {
          const isActive = currentQueryName === query.name;
          
          return (
            <Paper
              key={query.name}
              elevation={0}
              className={`overflow-hidden border rounded transition-colors duration-150 ${
                isActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <ListItem 
                disablePadding
                secondaryAction={
                  <Tooltip title="Delete query">
                    <IconButton 
                      edge="end" 
                      aria-label="delete" 
                      onClick={(e) => handleDeleteQuery(query.name, e)}
                      size="small"
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 mr-1"
                    >
                      <FiTrash2 size={16} />
                    </IconButton>
                  </Tooltip>
                }
              >
                <ListItemButton 
                  onClick={() => handleSelectQuery(query.sql, query.name)}
                  className={`py-3 px-4 ${isActive ? 'bg-blue-50' : 'hover:bg-blue-50'}`}
                >
                  <div className="flex flex-col w-full pr-8">
                    <div className="flex items-center mb-1">
                      <ListItemIcon className="min-w-[28px]">
                        {isActive ? (
                          <FiEdit size={16} className="text-blue-600" />
                        ) : (
                          <FiDatabase size={16} className="text-blue-500" />
                        )}
                      </ListItemIcon>
                      <Typography 
                        className={`font-medium ${isActive ? 'text-blue-700' : 'text-gray-800'}`}
                        noWrap
                      >
                        {query.name}
                      </Typography>
                    </div>
                    
                    {query.createdAt && (
                      <div className="flex items-center pl-9 text-gray-400">
                        <FiClock size={12} className="mr-1.5" />
                        <Typography variant="caption">
                          {formatDate(query.createdAt)}
                        </Typography>
                      </div>
                    )}
                  </div>
                </ListItemButton>
              </ListItem>
            </Paper>
          );
        })}
      </List>
    </Box>
  );
};

export default SavedQueries; 