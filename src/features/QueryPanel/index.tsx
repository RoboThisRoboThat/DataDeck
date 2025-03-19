import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  IconButton, 
  Tabs,
  Tab,
  Tooltip,
  CircularProgress,
  Menu,
  MenuItem,
} from '@mui/material';
import { 
  FiPlay, 
  FiSave, 
  FiCopy, 
  FiDownload,
  FiStopCircle,
  FiClock,
  FiChevronRight,
  FiAlertTriangle,
  FiCheckCircle,
  FiFileText,
  FiCode,
  FiDatabase
} from 'react-icons/fi';
import QueryEditor from './components/QueryEditor';
import QueryResults from './components/QueryResults';
import SavedQueries from './components/SavedQueries';
import SaveQueryModal from './components/SaveQueryModal';

interface QueryPanelProps {
  connectionId: string;
}

interface QueryResult {
  id: string;
  sql: string;
  data: unknown[];
  columns: string[];
  error?: string;
  status: 'running' | 'completed' | 'error';
  executionTime?: number;
}

function QueryPanel({ connectionId }: QueryPanelProps) {
  const editorRef = useRef<MonacoEditor | null>(null);
  
  // State for editor
  const [sql, setSql] = useState<string>('SELECT * FROM ');
  const [selectedText, setSelectedText] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  
  // Track the currently loaded query name
  const [currentQueryName, setCurrentQueryName] = useState<string | null>('Unsaved Query');
  
  // State for saved queries
  const [savedQueries, setSavedQueries] = useState<Array<{name: string; sql: string; createdAt: string; description?: string;}>>([]);
  const [loadingSavedQueries, setLoadingSavedQueries] = useState<boolean>(true);
  const [savedQueriesError, setSavedQueriesError] = useState<string | null>(null);
  
  // Function to fetch saved queries
  const fetchSavedQueries = async () => {
    setLoadingSavedQueries(true);
    setSavedQueriesError(null);
    
    try {
      const result = await window.electron.ipcRenderer.invoke('get-saved-queries', {
        connectionId
      });
      
      if (result.error) {
        setSavedQueriesError(result.error);
        setSavedQueries([]);
      } else {
        // Filter out the unsaved query for display
        const queries = result.queries.filter(
          (query: { name: string; sql: string }) => query.name !== 'Unsaved Query'
        );
        setSavedQueries(queries);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setSavedQueriesError(error.message || 'Failed to load saved queries');
      setSavedQueries([]);
    } finally {
      setLoadingSavedQueries(false);
    }
  };
  
  // Load saved queries on mount and when connectionId changes
  useEffect(() => {
    fetchSavedQueries();
  }, [connectionId]);
  
  // Load unsaved query on initial mount
  useEffect(() => {
    const loadUnsavedQuery = async () => {
      try {
        const result = await window.electron.ipcRenderer.invoke('get-saved-queries', {
          connectionId
        });
        
        if (!result.error) {
          // Find the unsaved query
          const unsavedQuery = result.queries.find(
            (q: { name: string; sql: string }) => q.name === 'Unsaved Query'
          );
          
          // If we have an unsaved query, load it
          if (unsavedQuery && unsavedQuery.sql) {
            setSql(unsavedQuery.sql);
          }
        }
      } catch (error) {
        console.error('Error loading unsaved query:', error);
      }
    };
    
    loadUnsavedQuery();
  }, [connectionId]);
  
  // Auto-save effect
  useEffect(() => {
    const autoSaveQuery = async () => {
      if (!currentQueryName) return;
      
      try {
        // Don't dispatch refresh events for auto-saves during typing
        const shouldRefresh = false;
        
        await window.electron.ipcRenderer.invoke('save-query', {
          connectionId,
          name: currentQueryName,
          sql,
          createdAt: new Date().toISOString(),
          shouldRefresh
        });
      } catch (error) {
        console.error('Auto-save error:', error);
      }
    };
    
    // Debounce auto-save to prevent too frequent saves
    const timeoutId = setTimeout(autoSaveQuery, 1000);
    return () => clearTimeout(timeoutId);
  }, [sql, connectionId, currentQueryName]);
  
  // State for results
  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState<number>(0);
  
  // State for execution
  const [executionStartTime, setExecutionStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  
  // State for UI
  const [saveModalOpen, setSaveModalOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  
  // Clear timer when component unmounts
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);
  
  // Start timer for query execution
  const startTimer = () => {
    const startTime = Date.now();
    setExecutionStartTime(startTime);
    
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);
    
    setTimerInterval(interval);
  };
  
  // Stop timer
  const stopTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    
    // Capture final execution time if we have a start time
    if (executionStartTime) {
      const finalTime = Date.now() - executionStartTime;
      setElapsedTime(finalTime);
      setExecutionStartTime(null);
      return finalTime;
    }
    
    return elapsedTime;
  };
  
  // Format execution time
  const formatExecutionTime = (ms: number): string => {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    
    const seconds = ms / 1000;
    if (seconds < 60) {
      return `${seconds.toFixed(2)}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  };
  
  // Execute SQL query
  const executeQuery = async (runSelectedOnly = false) => {
    if (isExecuting) return;
    
    const queryToExecute = runSelectedOnly ? selectedText : sql;
    if (!queryToExecute.trim()) return;
    
    setIsExecuting(true);
    setError(null);
    startTimer();
    
    // Split into multiple queries if semicolons are present
    const queries = queryToExecute
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0);
    
    if (queries.length === 0) {
      setIsExecuting(false);
      return;
    }
    
    // Create a new result tab for this execution
    const resultId = Date.now().toString();
    setQueryResults([
      ...queryResults,
      {
        id: resultId,
        sql: queryToExecute,
        data: [],
        columns: [],
        status: 'running',
        executionTime: 0
      }
    ]);
    
    // Set the new tab as active
    setActiveTabIndex(queryResults.length);
    
    // Execute each query in sequence
    for (let i = 0; i < queries.length; i++) {
      const queryText = queries[i];
      
      try {
        // Use db:query instead of execute-query
        const result = await window.database.query(connectionId, queryText);
        const executionTime = stopTimer();
        
        // Update results with success
        setQueryResults(prev => prev.map(res => 
          res.id === resultId 
            ? { 
                ...res, 
                data: Array.isArray(result) 
                  ? result 
                  : (result.rows || result.data || []),
                columns: result.columns || (result.data && result.data.length > 0
                  ? Object.keys(result.data[0]) 
                  : (Array.isArray(result) && result.length > 0 
                    ? Object.keys(result[0]) 
                    : [])),
                executionTime,
                status: 'completed'
              }
            : res
        ));
      } catch (err: unknown) {
        console.error('Query execution error:', err);
        const executionTime = stopTimer();
        
        const error = err as Error;
        
        // Update with error information
        setQueryResults(prev => prev.map(res => 
          res.id === resultId 
            ? { 
                ...res, 
                error: error.message || 'Failed to execute query', 
                executionTime,
                status: 'error'
              }
            : res
        ));
      }
      
      // Restart timer for next query
      if (i < queries.length - 1) {
        startTimer();
      }
    }
    
    setIsExecuting(false);
  };
  
  // Stop query execution
  const stopExecution = async () => {
    try {
      await window.electron.ipcRenderer.invoke('stop-query', {
        connectionId
      });
      
      setIsExecuting(false);
      stopTimer();
      
      // Mark running queries as stopped with error
      setQueryResults(prev => prev.map(res => 
        res.status === 'running' 
          ? { 
              ...res, 
              error: 'Query execution was cancelled', 
              executionTime: elapsedTime,
              status: 'error' 
            }
          : res
      ));
      
    } catch (err: any) {
      setError(err.message || 'Failed to stop query execution');
    }
  };
  
  // Handle editor selection change
  const handleSelectionChange = (text: string) => {
    setSelectedText(text);
  };
  
  // Handle tab change
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTabIndex(newValue);
  };
  
  // Open save query modal
  const openSaveModal = () => {
    if (!sql.trim()) {
      setError('Cannot save empty query');
      return;
    }
    
    setSaveModalOpen(true);
  };
  
  // Save the current query
  const saveQuery = async (name: string, description?: string) => {
    if (!sql.trim() || !name.trim()) {
      setError('Query name and SQL are required');
      return;
    }
    
    try {
      // Save the query with the new name - explicitly set shouldRefresh to true
      const result = await window.electron.ipcRenderer.invoke('save-query', {
        connectionId,
        name,
        sql,
        description,
        createdAt: new Date().toISOString(),
        shouldRefresh: true // Explicit refresh when manually saving
      });
      
      if (result.error) {
        setError(result.error);
      } else {
        // Clear the unsaved query content - explicitly set shouldRefresh to false
        await window.electron.ipcRenderer.invoke('save-query', {
          connectionId,
          name: 'Unsaved Query',
          sql: '',
          createdAt: new Date().toISOString(),
          shouldRefresh: false // Don't refresh when clearing unsaved
        });
        
        // Update current query name to the new saved query
        setCurrentQueryName(name);
        
        // Reset the SQL in the editor if we were editing the unsaved query
        if (currentQueryName === 'Unsaved Query') {
          setSql('SELECT * FROM ');
        }
        
        setSaveModalOpen(false);
        
        // Refresh the saved queries list
        fetchSavedQueries();
      }
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to save query');
    }
  };
  
  // Load a saved query
  const loadQuery = (savedSql: string, queryName: string) => {
    setSql(savedSql);
    setCurrentQueryName(queryName);
    
    // Focus on the editor
    if (editorRef.current?.focus) {
      editorRef.current.focus();
    }
  };
  
  // Delete a saved query
  const deleteQuery = async (name: string): Promise<void> => {
    try {
      interface DeleteQueryResponse {
        error?: string;
        success?: boolean;
      }
      
      const result = await window.electron.ipcRenderer.invoke('delete-query', {
        connectionId,
        name
      }) as DeleteQueryResponse;
      
      if (result.error) {
        setError(result.error);
      } else {
        // Refresh the saved queries list after deletion
        fetchSavedQueries();
      }
    } catch (error: unknown) {
      const err = error as Error;
      setError(err.message || 'Failed to delete query');
    }
  };
  
  // Copy query to clipboard
  const copyQuery = () => {
    if (!sql.trim()) return;
    
    navigator.clipboard.writeText(sql)
      .then(() => {
        const tempError = error;
        setError('Query copied to clipboard');
        setTimeout(() => setError(tempError), 2000);
      })
      .catch(() => {
        setError('Failed to copy query to clipboard');
      });
  };
  
  // Handle export menu open
  const handleExportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };
  
  // Handle export menu close
  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };
  
  // Export current result in various formats
  const exportResult = (format: 'csv' | 'json' | 'sql') => {
    handleExportMenuClose();
    
    // If no active tab or no results, do nothing
    if (activeTabIndex >= queryResults.length || !queryResults[activeTabIndex]) {
      return;
    }
    
    const result = queryResults[activeTabIndex];
    
    // If no data or columns, do nothing
    if (!result.data.length || !result.columns.length) {
      setError('No data to export');
      return;
    }
    
    try {
      let content = '';
      let fileType = '';
      let fileExtension = '';
      
      if (format === 'csv') {
        // Create CSV content
        const header = result.columns.join(',');
        const rows = result.data.map(row => {
          return result.columns.map(column => {
            const value = row[column];
            // Handle null, undefined and different types
            if (value === null || value === undefined) {
              return '';
            } else if (typeof value === 'object') {
              return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            } else {
              return typeof value === 'string' && (value.includes(',') || value.includes('"'))
                ? `"${value.replace(/"/g, '""')}"`
                : String(value);
            }
          }).join(',');
        }).join('\n');
        
        content = `${header}\n${rows}`;
        fileType = 'text/csv;charset=utf-8;';
        fileExtension = 'csv';
      } else if (format === 'json') {
        // Create JSON content
        const jsonData = result.data.map(row => {
          const rowObject: Record<string, any> = {};
          result.columns.forEach(column => {
            rowObject[column] = row[column];
          });
          return rowObject;
        });
        
        content = JSON.stringify(jsonData, null, 2);
        fileType = 'application/json;charset=utf-8;';
        fileExtension = 'json';
      } else if (format === 'sql') {
        // Create SQL INSERT statements
        const tableName = 'exported_data';
        
        let insertStatements = [];
        for (const row of result.data) {
          const values = result.columns.map(column => {
            const value = row[column];
            
            if (value === null || value === undefined) {
              return 'NULL';
            } else if (typeof value === 'string') {
              return `'${value.replace(/'/g, "''")}'`;
            } else if (typeof value === 'boolean') {
              return value ? '1' : '0';
            } else if (typeof value === 'object') {
              return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
            } else {
              return String(value);
            }
          });
          
          insertStatements.push(
            `INSERT INTO ${tableName} (${result.columns.join(', ')}) VALUES (${values.join(', ')});`
          );
        }
        
        content = `-- Export from Date Crunch\n` +
                 `-- Table structure\n` +
                 `CREATE TABLE ${tableName} (\n` +
                 result.columns.map(col => `  ${col} TEXT`).join(',\n') +
                 '\n);\n\n' +
                 '-- Data\n' +
                 insertStatements.join('\n');
                 
        fileType = 'text/plain;charset=utf-8;';
        fileExtension = 'sql';
      }
      
      // Create download link
      const blob = new Blob([content], { type: fileType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `query-result-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${fileExtension}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (err: any) {
      setError(err.message || `Failed to export as ${format.toUpperCase()}`);
    }
  };
  
  // Render result tabs
  const renderResultTabs = () => {
    if (queryResults.length === 0) {
      return null;
    }
    
    return (
      <Box className="border-b border-gray-200 bg-gray-50">
        <Tabs 
          value={activeTabIndex} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          className="min-h-[48px]"
        >
          {queryResults.map((result, index) => {
            const isRunning = result.status === 'running';
            const hasError = result.status === 'error';
            const isSuccess = result.status === 'completed';
            
            return (
              <Tab 
                key={result.id}
                label={
                  <div className="flex items-center space-x-2 py-1">
                    {isRunning && (
                      <CircularProgress size={16} thickness={4} className="text-blue-500" />
                    )}
                    {hasError && (
                      <FiAlertTriangle size={16} className="text-red-500" />
                    )}
                    {isSuccess && (
                      <FiCheckCircle size={16} className="text-green-500" />
                    )}
                    <span className="max-w-[150px] truncate">
                      {result.sql.substring(0, 20)}{result.sql.length > 20 ? '...' : ''}
                    </span>
                    {!isRunning && (
                      <span className="text-xs text-gray-500 font-mono">
                        {formatExecutionTime(result.executionTime)}
                      </span>
                    )}
                  </div>
                }
                className={`
                  ${hasError ? 'text-red-600 border-b-red-500' : ''}
                  ${isSuccess ? 'text-blue-600 border-b-blue-500' : ''}
                  ${isRunning ? 'text-blue-500 border-b-blue-300' : ''}
                `}
              />
            );
          })}
        </Tabs>
      </Box>
    );
  };
  
  // Render current active result
  const renderActiveResult = () => {
    if (queryResults.length === 0) {
      return (
        <Box className="flex-grow flex items-center justify-center bg-gray-50 p-8">
          <div className="text-center">
            <FiCode size={40} className="text-gray-300 mx-auto mb-4" />
            <Typography variant="h6" className="text-gray-600 mb-2">
              Run a query to see results
            </Typography>
            <Typography variant="body2" className="text-gray-500 max-w-md">
              Write SQL in the editor above and click Execute or press Ctrl+Enter
            </Typography>
          </div>
        </Box>
      );
    }
    
    const activeResult = queryResults[activeTabIndex];
    
    if (!activeResult) {
      return null;
    }
    
    console.log('Active result:', activeResult); // Add logging to debug
    
    // If query is running
    if (activeResult.status === 'running') {
      return (
        <Box className="flex-grow flex flex-col items-center justify-center bg-blue-50 p-8">
          <CircularProgress size={48} className="mb-4" />
          <Typography variant="h6" className="mb-2 text-blue-800">
            Executing query...
          </Typography>
          <Typography variant="body2" className="text-blue-600 font-mono">
            {formatExecutionTime(elapsedTime)}
          </Typography>
        </Box>
      );
    }
    
    // If query has error
    if (activeResult.error) {
      return (
        <Paper 
          elevation={0}
          className="m-4 p-4 bg-red-50 border border-red-200 rounded"
        >
          <Typography variant="subtitle1" className="text-red-800 font-medium mb-2">
            Error executing query
          </Typography>
          <Typography variant="body2" className="text-red-700 font-mono whitespace-pre-wrap">
            {activeResult.error}
          </Typography>
        </Paper>
      );
    }
    
    // If non-SELECT query with affected rows
    if (!activeResult.isSelect && activeResult.affectedRows !== undefined) {
      return (
        <Paper 
          elevation={0}
          className="m-4 p-4 bg-green-50 border border-green-200 rounded"
        >
          <Typography variant="subtitle1" className="text-green-800 font-medium mb-2">
            Query executed successfully
          </Typography>
          <Typography variant="body1" className="text-green-700">
            {activeResult.affectedRows} {activeResult.affectedRows === 1 ? 'row' : 'rows'} affected
          </Typography>
          <Typography variant="caption" className="text-green-600 mt-2 block">
            Execution time: {formatExecutionTime(activeResult.executionTime)}
          </Typography>
        </Paper>
      );
    }
    
    // For SELECT queries, show the results table
    // Check that we have data to display
    if (activeResult.data && activeResult.columns) {
      return (
        <Box className="flex-grow">
          <QueryResults 
            data={activeResult.data}
            columns={activeResult.columns}
            loading={false}
          />
        </Box>
      );
    } else {
      // Handle the case where we have no data but no error
      return (
        <Paper 
          elevation={0}
          className="m-4 p-4 bg-blue-50 border border-blue-200 rounded"
        >
          <Typography variant="subtitle1" className="text-blue-800 font-medium mb-2">
            Query executed successfully
          </Typography>
          <Typography variant="body1" className="text-blue-700">
            No data returned
          </Typography>
        </Paper>
      );
    }
  };

  return (
    <Box className="flex h-full overflow-hidden">
      {/* Saved Queries Sidebar - Wider width */}
      <Box className="w-80 flex-none border-r border-gray-200 bg-white overflow-auto saved-queries-component">
        <SavedQueries 
          connectionId={connectionId}
          onSelectQuery={(savedSql, queryName) => loadQuery(savedSql, queryName)}
          onDeleteQuery={deleteQuery}
          currentQueryName={currentQueryName}
          queries={savedQueries}
          loading={loadingSavedQueries}
          error={savedQueriesError}
          onRefetchQueries={fetchSavedQueries}
        />
      </Box>
      
      {/* Main Content Area - Reduced padding, just the editor */}
      <Box className="flex-1 flex bg-gray-100 overflow-hidden">
        {/* Content Container with no max-width */}
        <Box className="w-full flex flex-col overflow-hidden bg-white">
          {/* Header with actions */}
          <Box className=" border-b border-gray-200 shadow-sm flex-none">
            <div className="flex justify-between items-center p-2">
              <Typography 
                variant="h6" 
                className="text-gray-800 font-semibold"
              >
                SQL Query Editor
              </Typography>
              
              <div className="flex items-center gap-2">
                {/* Currently executing timer */}
                {isExecuting && (
                  <div className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-md mr-1">
                    <FiClock className="mr-1" size={14} />
                    <span className="text-sm font-mono">
                      {formatExecutionTime(elapsedTime)}
                    </span>
                  </div>
                )}
                
                {/* Execute button */}
                {!isExecuting ? (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<FiPlay />}
                    onClick={() => executeQuery(false)}
                    disabled={!sql.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 shadow-md"
                  >
                    Execute
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<FiStopCircle />}
                    onClick={stopExecution}
                    className="bg-red-600 hover:bg-red-700 shadow-md"
                  >
                    Stop
                  </Button>
                )}
                
                {/* Execute Selection button - show only when text is selected */}
                {selectedText && (
                  <Tooltip title="Execute selected SQL">
                    <Button
                      variant="outlined"
                      startIcon={<FiChevronRight />}
                      onClick={() => executeQuery(true)}
                      disabled={isExecuting}
                      className="border-indigo-500 text-indigo-600 hover:bg-indigo-50"
                    >
                      Run Selection
                    </Button>
                  </Tooltip>
                )}
                
                {/* Save button */}
                <Button
                  variant="outlined"
                  startIcon={<FiSave />}
                  onClick={openSaveModal}
                  disabled={!sql.trim() || isExecuting}
                  className="border-indigo-500 text-indigo-600 hover:bg-indigo-50"
                >
                  Save
                </Button>
                
                {/* Copy button */}
                <Tooltip title="Copy to clipboard">
                  <IconButton
                    onClick={copyQuery}
                    disabled={!sql.trim() || isExecuting}
                    className="text-gray-600 hover:text-indigo-600 hover:bg-indigo-50"
                    size="small"
                  >
                    <FiCopy size={18} />
                  </IconButton>
                </Tooltip>
                
                {/* Export button - only enabled when there are results */}
                <Tooltip title="Export results">
                  <span>
                    <IconButton 
                      onClick={handleExportMenuOpen}
                      disabled={!queryResults.length || activeTabIndex >= queryResults.length || !queryResults[activeTabIndex].data.length}
                      className="text-gray-600 hover:text-indigo-600 hover:bg-indigo-50"
                      size="small"
                    >
                      <FiDownload size={18} />
                    </IconButton>
                  </span>
                </Tooltip>
                
                {/* Export menu */}
                <Menu
                  anchorEl={exportMenuAnchor}
                  open={Boolean(exportMenuAnchor)}
                  onClose={handleExportMenuClose}
                  className="mt-1"
                >
                  <MenuItem 
                    onClick={() => exportResult('csv')}
                    className="py-2 px-4 hover:bg-blue-50"
                  >
                    <FiFileText className="mr-2 text-blue-600" size={16} />
                    Export as CSV
                  </MenuItem>
                  <MenuItem 
                    onClick={() => exportResult('json')}
                    className="py-2 px-4 hover:bg-blue-50"
                  >
                    <FiCode className="mr-2 text-blue-600" size={16} />
                    Export as JSON
                  </MenuItem>
                  <MenuItem 
                    onClick={() => exportResult('sql')}
                    className="py-2 px-4 hover:bg-blue-50"
                  >
                    <FiDatabase className="mr-2 text-blue-600" size={16} />
                    Export as SQL
                  </MenuItem>
                </Menu>
              </div>
            </div>
          </Box>
          
          {/* Main content area with reduced padding */}
          <Box className="flex flex-col flex-grow overflow-hidden">
            {/* Query editor with fixed height and minimal margin */}
            <Box className="flex flex-col h-[300px] m-1">
              {/* Query editor container */}
              <Box className="flex-grow border border-gray-200 rounded-md shadow-sm bg-white overflow-hidden">
                <QueryEditor 
                  value={sql}
                  onChange={setSql}
                  onExecute={() => executeQuery(false)}
                  isExecuting={isExecuting}
                  onSelectionChange={handleSelectionChange}
                  ref={editorRef}
                  connectionId={connectionId}
                />
              </Box>
              
              {/* Error message if any */}
              {error && (
                <Paper 
                  elevation={0}
                  className={`mt-2 p-2 ${
                    error.includes('copied to clipboard') 
                      ? 'bg-green-50 border-green-200 text-green-700' 
                      : 'bg-red-50 border-red-200 text-red-700'
                  } border rounded-md`}
                >
                  <div className="flex items-center">
                    {error.includes('copied to clipboard') ? (
                      <FiCheckCircle className="mr-2" size={16} />
                    ) : (
                      <FiAlertTriangle className="mr-2" size={16} />
                    )}
                    <Typography variant="body2">
                      {error}
                    </Typography>
                  </div>
                </Paper>
              )}
            </Box>
            
            {/* Results area with minimal margin */}
            <Box className="flex flex-col h-[calc(100vh-500px)] min-h-[400px] m-1 mt-2 overflow-hidden border border-gray-200 rounded-md shadow-sm bg-white">
              {/* Result tabs - Fixed */}
              <Box className="flex-none border-b border-gray-200">
                {renderResultTabs()}
              </Box>
              
              {/* Results content - Scrollable */}
              <Box className="flex-1 overflow-hidden">
                {renderActiveResult()}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
      
      {/* Save Query Modal */}
      <SaveQueryModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={saveQuery}
        sql={sql}
      />
    </Box>
  );
}

export default QueryPanel;