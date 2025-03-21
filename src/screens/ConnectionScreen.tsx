import { useState, useEffect } from 'react';
import { useScreen } from '../context/ScreenContext';
import { AddConnectionModal } from '../components/AddConnectionModal';
import { Trash, Plus, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Layout } from '../components/Layout';
import type { Connection } from '../types/connection';
import { useTheme } from '../context/ThemeContext';
export function ConnectionScreen() {
  const { theme } = useTheme();
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
    <Layout title="Data Deck" showThemeToggle={false}>
      <div className="flex-1 p-4 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Database Connections</h2>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className={`flex items-center gap-1.5 ${theme === 'dark' ? 'text-white' : 'text-black'}`}
            >
              <Plus className="size-4" color={theme === 'dark' ? 'white' : 'black'} />
              Add Connection
            </Button>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md mb-4 dark:border-destructive/30">
              {error}
            </div>
          )}

          {notification && (
            <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-md mb-4 dark:bg-green-900/20 dark:border-green-800/30 dark:text-green-400">
              {notification}
            </div>
          )}

          <div className="bg-card rounded-lg shadow-sm border border-border">
            {connections.map(connection => (
              <div
                key={connection.id}
                className="border-b border-border last:border-b-0"
              >
                <Button
                  variant="ghost"
                  onClick={() => handleConnect(connection)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleConnect(connection);
                    }
                  }}
                  className="flex justify-between p-4 w-full text-left hover:bg-muted/40 h-auto"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-medium">{connection.name}</h3>
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                        {connection.dbType === 'mysql' ? 'MySQL' : 'PostgreSQL'}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground flex items-center gap-1">
                      <ExternalLink className="size-3.5" />
                      {connection.host}:{connection.port} • {connection.database}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConnection(connection.id);
                    }}
                  >
                    <Trash className="size-4" />
                  </Button>
                </Button>
              </div>
            ))}
            
            {connections.length === 0 && (
              <div className="px-6 py-8 text-center text-muted-foreground">
                No connections added yet. Click the "Add Connection" button to get started.
              </div>
            )}
          </div>
        </div>
      </div>

      <AddConnectionModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddConnection}
      />
    </Layout>
  );
} 