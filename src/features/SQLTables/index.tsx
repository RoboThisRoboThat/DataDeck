import { useState, useEffect, useRef } from 'react';
import TableList from './components/TableList';
import TableTabs from './components/TableTabs';
import DataTable from './components/DataTable';
import QueryPanel from '../QueryPanel';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

interface SQLTablesProps {
  connectionId: string;
  onDisconnect: () => void;
}

function SQLTables({ connectionId, onDisconnect }: SQLTablesProps) {
  const [allTables, setAllTables] = useState<string[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [tableSearch, setTableSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentActiveTab, setCurrentActiveTab] = useState('tables');
  
  // Store connectionId in a ref to ensure we can access it in async callbacks
  const connectionIdRef = useRef(connectionId);
  
  // Update ref when prop changes
  useEffect(() => {
    connectionIdRef.current = connectionId;
  }, [connectionId]);

  useEffect(() => {
    if (!connectionId) {
      setError('No connection ID provided');
      console.error('SQLTables: No connection ID provided');
      return;
    }
    
    console.log("SQLTables: Using connection ID:", connectionId);
    
    // Validate connection ID is not empty
    if (connectionId.trim() === '') {
      setError('Empty connection ID provided');
      console.error('SQLTables: Empty connection ID provided');
      return;
    }
    loadTables(connectionId);
  }, [connectionId]);

  const loadTables = async (connectionId: string) => {

    try {
      setLoading(true);
      setError('');
      console.log("Loading tables with connection ID:", connectionId);
      const tablesData = await window.database.getTables(connectionId);
      
      if (!tablesData || !Array.isArray(tablesData) || tablesData.length === 0) {
        console.log("No tables found or invalid response:", tablesData);
        setAllTables([]);
        return;
      }
      
      const firstRow = tablesData[0];
      const tableNameKey = Object.keys(firstRow)[0];
      const tableNames = tablesData.map(table => table[tableNameKey as keyof typeof table] as string);
      console.log("Tables loaded successfully:", tableNames);
      setAllTables(tableNames);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to load tables: ${errorMessage}`);
      console.error('Failed to load tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = async (tableName: string) => {
    // Add the table to the list if it's not already there
    if (!tables.includes(tableName)) {
      setTables(prevTables => [...prevTables, tableName]);
    }
    setActiveTable(tableName);
  };

  const handleCloseTable = (tableName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setTables(prev => prev.filter(t => t !== tableName));
    if (activeTable === tableName) {
      const remainingTables = tables.filter(t => t !== tableName);
      setActiveTable(remainingTables.length > 0 ? remainingTables[remainingTables.length - 1] : null);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, table: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      handleTableSelect(table);
    }
  };

  return (
    <div>
      <Tabs value={currentActiveTab} onChange={(_, newValue) => setCurrentActiveTab(newValue)} aria-label="basic tabs example">
          <Tab label="Tables" value="tables"  />
          <Tab label="Query" value="query"  />
      </Tabs>

      {currentActiveTab === 'tables' && (
    <div className='flex flex-1 flex-row h-full' id='main-tables-container'>
        <TableList 
        tables={allTables}
        openTables={tables}
        activeTable={activeTable}
        tableSearch={tableSearch}
        setTableSearch={setTableSearch}
        handleTableSelect={handleTableSelect}
        handleKeyDown={handleKeyDown}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        
        {loading && (
          <div className="p-4 m-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md">
            Loading tables...
          </div>
        )}
        
        {error && (
          <div className="p-4 m-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
            <div className="mt-2">
              <button 
                type="button"
                onClick={() => loadTables(connectionId)}
                className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Tabs Bar */}
        <TableTabs 
          tables={tables}
          activeTable={activeTable}
          setActiveTable={setActiveTable}
          handleCloseTable={handleCloseTable}
        />
        
        {/* Table Content */}
        <div className="flex-1 overflow-hidden">
          { activeTable ? (
            <div className="h-full flex flex-col">
              {/* Data Table */}
              <div className="flex-1 overflow-auto">
                <DataTable 
                  tableName={activeTable} 
                  connectionId={connectionId}
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg">Select a table from the sidebar to view its data</p>
                <p className="text-sm mt-2">{tables.length} tables available</p>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
      )}

      {currentActiveTab === 'query' && (
        <div id='query-panel-container'>
          <QueryPanel connectionId={connectionId} />
        </div>
      )}
    </div>
  );
}

export default SQLTables;