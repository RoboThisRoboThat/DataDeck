import { useScreen } from '../context/ScreenContext';
import SQLTables from '../features/SQLTables';
import { useState, useEffect } from 'react';
import { Database, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Layout } from '../components/Layout';

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
      <div className="h-screen w-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-sm text-muted-foreground">Connecting to database...</p>
        </div>
      </div>
    );
  }

  const headerActions = (
    <Button 
      variant="ghost"
      size="sm"
      onClick={handleDisconnect}
      className="text-sm"
    >
      <X className="size-4 mr-1.5" />
      Disconnect
    </Button>
  );

  return (
    <Layout 
      showThemeToggle={false}
      title={
        <div className="flex items-center gap-2">
          <Database className="size-4 text-primary" />
          <span className="font-medium">{activeConnectionName || 'Database'}</span>
          {activeConnectionId && (
            <span className="text-xs text-muted-foreground">({activeConnectionId})</span>
          )}
        </div>
      }
      actions={headerActions}
    >
      <div className="flex-1">
        {activeConnectionId ? (
          <SQLTables 
            connectionId={activeConnectionId} 
            onDisconnect={handleDisconnect} 
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <Button
              variant="default"
              onClick={() => setCurrentScreen('connection')}
            >
              Return to Connections
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
} 