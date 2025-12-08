import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";

interface UseRedisDatabaseProps {
    connectionId: string | null;
    onDatabaseChange?: () => void;
}

interface UseRedisDatabaseReturn {
    currentDatabase: number;
    databaseCount: number;
    availableDatabases: number[];
    isLoading: boolean;
    loadDatabaseInfo: () => Promise<void>;
    selectDatabase: (dbNumber: number) => Promise<void>;
}

/**
 * Hook for managing Redis database selection
 */
export function useRedisDatabase({
    connectionId,
    onDatabaseChange,
}: UseRedisDatabaseProps): UseRedisDatabaseReturn {
    const { toast } = useToast();
    const [currentDatabase, setCurrentDatabase] = useState(0);
    const [databaseCount, setDatabaseCount] = useState(16);
    const [availableDatabases, setAvailableDatabases] = useState<number[]>([0]);
    const [isLoading, setIsLoading] = useState(false);

    const loadDatabaseInfo = useCallback(async (): Promise<void> => {
        if (!connectionId) return;

        setIsLoading(true);
        try {
            // Get database count
            const countResult = await window.redis.getDatabaseCount(connectionId);
            if (countResult.success) {
                setDatabaseCount(countResult.count);
            }

            // Get current database
            const currentResult = await window.redis.getCurrentDatabase(connectionId);
            if (currentResult.success) {
                setCurrentDatabase(currentResult.db);
            }

            // Get populated databases
            const populatedResult =
                await window.redis.getPopulatedDatabases(connectionId);
            if (populatedResult.success) {
                setAvailableDatabases(populatedResult.databases);
            }
        } catch (error) {
            console.error("Failed to load database info:", error);
        } finally {
            setIsLoading(false);
        }
    }, [connectionId]);

    const selectDatabase = useCallback(
        async (dbNumber: number): Promise<void> => {
            if (!connectionId) return;

            setIsLoading(true);
            try {
                const result = await window.redis.selectDatabase(connectionId, dbNumber);

                if (result.success) {
                    setCurrentDatabase(dbNumber);
                    toast({
                        title: "Database Changed",
                        description: `Switched to database ${dbNumber}`,
                    });
                    onDatabaseChange?.();
                } else {
                    throw new Error(result.message || "Failed to switch database");
                }
            } catch (error) {
                console.error("Failed to switch database:", error);
                toast({
                    title: "Error",
                    description:
                        error instanceof Error
                            ? error.message
                            : "Failed to switch database",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        },
        [connectionId, onDatabaseChange, toast],
    );

    return {
        currentDatabase,
        databaseCount,
        availableDatabases,
        isLoading,
        loadDatabaseInfo,
        selectDatabase,
    };
}
