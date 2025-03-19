import { useScreen } from '../context/ScreenContext';
import SQLTables from '../features/SQLTables';
import { IoCheckboxOutline } from 'react-icons/io5';
import { useState, useEffect } from 'react';

export function TablesScreen() {
  const { setCurrentScreen, activeConnectionId, activeConnectionName, setActiveConnectionId, setActiveConnectionName } = useScreen();
  const [isStandaloneWindow, setIsStandaloneWindow] = useState(false);
  const [loadingConnection, setLoadingConnection] = useState(false);

  useEffect(() => {
    async function initializeConnection() {
      // Check if this is a standalone window
      const isSecondary = window.opener !== null || window.name === 'secondary';
      setIsStandaloneWindow(isSecondary);
      
      // If we don't have an active connection but have URL params, try to connect using them
      if (!activeConnectionId) {
        try {
          const params = new URLSearchParams(window.location.search);
          const connId = params.get('connectionId');
          const connName = params.get('connectionName');
          
          if (connId) {
            setLoadingConnection(true);
            console.log("Recovering connection from URL params:", connId, connName);
            
            // Set the connection details from URL
            setActiveConnectionId(connId);
            if (connName) setActiveConnectionName(connName);
            
            // Attempt to connect to the database
            const result = await window.database.connect(connId);
            
            if (!result?.success && !result?.connected) {
              console.error("Failed to recover connection:", result?.message);
              // If in standalone window and connection fails, close the window
              if (isSecondary) {
                window.close();
              } else {
                setCurrentScreen('connection');
              }
            }
          } else if (isSecondary) {
            // Standalone window without connection params should close
            window.close();
          }
        } catch (error) {
          console.error("Error recovering connection:", error);
          if (isSecondary) {
            window.close();
          } else {
            setCurrentScreen('connection');
          }
        } finally {
          setLoadingConnection(false);
        }
      }
    }
    
    initializeConnection();
  }, [activeConnectionId, setActiveConnectionId, setActiveConnectionName, setCurrentScreen]);

  const handleDisconnect = async () => {
    try {
      if (activeConnectionId) {
        console.log("Disconnecting from:", activeConnectionId);
        await window.database.disconnect(activeConnectionId);
      }
      setActiveConnectionId(null);
      setActiveConnectionName(null);
      
      // If this is a standalone window, close it on disconnect
      if (isStandaloneWindow) {
        window.close();
      } else {
        setCurrentScreen('connection');
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  if (loadingConnection) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <p>Connecting to database...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col">
      {/* Header with connection name and disconnect button */}
      <div className="bg-gray-100 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={handleDisconnect}
            className="p-1 rounded-full hover:bg-gray-200 text-gray-600"
            title="Disconnect and return to connections"
          >
            <IoCheckboxOutline className="w-5 h-5" />
          </button>
          <span className="font-medium">{activeConnectionName || 'Database'}</span>
          <span className="text-xs text-gray-500">({activeConnectionId})</span>
        </div>
        <button 
          type="button"
          onClick={handleDisconnect}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          Disconnect
        </button>
      </div>
      
      <div>
        {activeConnectionId ? (
          <SQLTables 
            connectionId={activeConnectionId} 
            onDisconnect={handleDisconnect} 
          />
        ) : (
          <div className="flex items-center justify-center w-full">
            <button
              type="button"
              onClick={() => setCurrentScreen('connection')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Return to Connections
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 