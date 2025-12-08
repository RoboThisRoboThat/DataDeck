import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import type { ServerInfo } from "../types";

interface UseRedisConnectionProps {
    connectionId: string | null;
}

interface UseRedisConnectionReturn {
    isConnecting: boolean;
    isConnected: boolean;
    connectionError: string | null;
    serverInfo: ServerInfo | null;
    connect: () => Promise<boolean>;
    disconnect: () => Promise<void>;
    loadServerInfo: () => Promise<void>;
}

/**
 * Hook for managing Redis connection state and operations
 */
export function useRedisConnection({
    connectionId,
}: UseRedisConnectionProps): UseRedisConnectionReturn {
    const { toast } = useToast();
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);

    const connect = useCallback(async (): Promise<boolean> => {
        if (!connectionId) return false;

        setIsConnecting(true);
        setConnectionError(null);

        try {
            // Get connection details
            const connections = await window.store.getConnections();
            const connection = connections.find((conn) => conn.id === connectionId);

            if (!connection) {
                throw new Error("Connection not found");
            }

            if (connection.dbType !== "redis") {
                throw new Error("Selected connection is not a Redis connection");
            }

            // Connect to Redis
            const result = await window.redis.connect(connectionId, connection);

            if (!result.success) {
                throw new Error(result.message || "Failed to connect to Redis");
            }

            setIsConnected(true);
            return true;
        } catch (error) {
            console.error("Redis connection error:", error);
            const errorMessage =
                error instanceof Error ? error.message : "Failed to connect to Redis";
            setConnectionError(errorMessage);
            toast({
                title: "Connection Error",
                description: errorMessage,
                variant: "destructive",
            });
            return false;
        } finally {
            setIsConnecting(false);
        }
    }, [connectionId, toast]);

    const disconnect = useCallback(async (): Promise<void> => {
        if (!connectionId) return;

        try {
            await window.redis.disconnect(connectionId);
            setIsConnected(false);
            setServerInfo(null);
        } catch (error) {
            console.error("Error disconnecting from Redis:", error);
        }
    }, [connectionId]);

    const loadServerInfo = useCallback(async (): Promise<void> => {
        if (!connectionId) return;

        try {
            const info = await window.redis.getServerInfo(connectionId);
            setServerInfo(info as ServerInfo);
        } catch (error) {
            console.error("Failed to load Redis server info:", error);
        }
    }, [connectionId]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (connectionId && isConnected) {
                window.redis
                    .disconnect(connectionId)
                    .catch((error) =>
                        console.error("Error disconnecting from Redis:", error),
                    );
            }
        };
    }, [connectionId, isConnected]);

    return {
        isConnecting,
        isConnected,
        connectionError,
        serverInfo,
        connect,
        disconnect,
        loadServerInfo,
    };
}
