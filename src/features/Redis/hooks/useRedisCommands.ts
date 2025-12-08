import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";

interface UseRedisCommandsProps {
    connectionId: string | null;
    onDataChange?: () => void;
}

interface UseRedisCommandsReturn {
    commandInput: string;
    commandResult: unknown;
    isExecuting: boolean;
    setCommandInput: (input: string) => void;
    executeCommand: () => Promise<void>;
    clearResult: () => void;
}

/**
 * Hook for executing raw Redis commands
 */
export function useRedisCommands({
    connectionId,
    onDataChange,
}: UseRedisCommandsProps): UseRedisCommandsReturn {
    const { toast } = useToast();
    const [commandInput, setCommandInput] = useState("");
    const [commandResult, setCommandResult] = useState<unknown>(null);
    const [isExecuting, setIsExecuting] = useState(false);

    const executeCommand = useCallback(async (): Promise<void> => {
        if (!connectionId || !commandInput.trim()) return;

        setIsExecuting(true);
        try {
            // Parse the command
            const parts = commandInput.trim().split(/\s+/);
            const command = parts[0].toUpperCase();
            const args = parts.slice(1);

            const result = await window.redis.executeCommand(
                connectionId,
                command,
                args,
            );

            setCommandResult(result);

            // Refresh keys if the command might have modified data
            const modifyingCommands = [
                "SET",
                "DEL",
                "EXPIRE",
                "RENAME",
                "FLUSHDB",
                "FLUSHALL",
                "HSET",
                "LPUSH",
                "RPUSH",
                "SADD",
                "ZADD",
            ];
            if (modifyingCommands.includes(command)) {
                onDataChange?.();
            }
        } catch (error) {
            console.error("Failed to execute command:", error);
            setCommandResult({
                error:
                    error instanceof Error ? error.message : "Failed to execute command",
            });
            toast({
                title: "Command Error",
                description:
                    error instanceof Error ? error.message : "Failed to execute command",
                variant: "destructive",
            });
        } finally {
            setIsExecuting(false);
        }
    }, [connectionId, commandInput, onDataChange, toast]);

    const clearResult = useCallback((): void => {
        setCommandResult(null);
    }, []);

    return {
        commandInput,
        commandResult,
        isExecuting,
        setCommandInput,
        executeCommand,
        clearResult,
    };
}
