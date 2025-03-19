import { useState, useEffect } from 'react';
import { useScreen } from '../context/ScreenContext';
import { AddConnectionModal } from '../components/AddConnectionModal';
import { FaTrash, FaPlus } from 'react-icons/fa';
import type { Connection } from '../types/connection';

export function ConnectionScreen() {
  const { setCurrentScreen, setActiveConnectionId, setActiveConnectionName } = useScreen();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const savedConnections = await window.store.getConnections();
      setConnections(savedConnections);
    } catch (error) {
      setError('Failed to load connections');
      console.error(error);
    }
  };

  const handleAddConnection = async (connection: Connection) => {
    try {
      const updatedConnections = await window.store.addConnection(connection);
      setConnections(updatedConnections);
    } catch (error) {
      setError('Failed to add connection');
      console.error(error);
    }
  };

  const handleDeleteConnection = async (id: string) => {
    try {
      const updatedConnections = await window.store.deleteConnection(id);
      setConnections(updatedConnections);
    } catch (error) {
      setError('Failed to delete connection');
      console.error(error);
    }
  };

  const handleConnect = async (connection: Connection) => {
    try {
      // Force a clean string to ensure there's no weird character issues
      const connectionId = String(connection.id).trim();
      
      if (!connectionId) {
        throw new Error("Connection ID is empty");
      }

      // First, connect to the database
      const result = await window.database.connect(connectionId);
      
      if (result?.success || result?.connected) {
        console.log("Successfully connected to database:", connectionId);
        
        // Set the connection ID in context
        setActiveConnectionId(connectionId);
        setActiveConnectionName(connection.name);
        try {
          const windowIdResult = await window.windowManager.getCurrentWindowId();
          if (windowIdResult?.success) {
            console.log("Current window ID:", windowIdResult.windowId);
            await window.windowManager.setWindowFullscreen(windowIdResult.windowId);
          } else {
            await window.windowManager.setMainWindowFullscreen();
          }
        } catch (error) {
          console.error("Failed to set fullscreen:", error);
          await window.windowManager.setMainWindowFullscreen();
        }
        
        // Open a new window
        try {
          console.log("Opening new window for connection:", connectionId);
          const windowResult = await window.windowManager.openConnectionWindow(connectionId, connection.name);
          
          if (windowResult?.success) {
            console.log("Successfully opened new window");
          } else {
            console.error("Failed to open window:", windowResult?.message);
          }
        } catch (error) {
          console.error("Error opening window:", error);
        }
        
        // Clear any previous errors
        setError('');
        
        // Show success notification
        setNotification('Connected to database. A new window has been opened.');
        setTimeout(() => setNotification(''), 5000);
        
        // Navigate to tables screen immediately
        setCurrentScreen('tables');

      // Set the query parameters with connectionId and connectionName
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set('connectionId', connectionId);
      urlParams.set('connectionName', connection.name);
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
      window.history.replaceState(null, '', newUrl);
      } else {
        const errorMessage = result?.message || 'Unknown connection error';
        console.error("Connection failed:", errorMessage);
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect');
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Database Connections</h1>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
        >
          <FaPlus className="text-sm" />
          Add Connection
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {notification && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {notification}
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        {connections.map(connection => (
          <div
            key={connection.id}
            className="border-b border-gray-200 last:border-b-0"
          >
            <div
              onClick={() => handleConnect(connection)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleConnect(connection);
                }
              }}
              className="flex justify-between px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  {connection.name}
                </h3>
                <div className="mt-1 text-sm text-gray-500">
                  {connection.host}:{connection.port} • {connection.database} • {connection.dbType === 'mysql' ? 'MySQL' : 'PostgreSQL'}
                </div>
              </div>
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteConnection(connection.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    handleDeleteConnection(connection.id);
                  }
                }}
                className="ml-4"
              >
                <button 
                  type="button"
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FaTrash className="text-gray-500 hover:text-red-600 transition-colors" />
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {connections.length === 0 && (
          <div className="px-6 py-8 text-center text-gray-500">
            No connections added yet. Click the "Add Connection" button to get started.
          </div>
        )}
      </div>

      <AddConnectionModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddConnection}
      />
    </div>
  );
} 