import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import type { KeyValue } from "../types";

interface UseRedisValueProps {
    connectionId: string | null;
    selectedKey: string | null;
    keyValue: KeyValue | null;
    onKeyValueUpdate: (value: KeyValue) => void;
}

interface UseRedisValueReturn {
    isEditing: boolean;
    editingField: string | null;
    editingValue: string;
    setEditingField: (field: string | null) => void;
    setEditingValue: (value: string) => void;
    startEditing: (field: string, value: string) => void;
    cancelEditing: () => void;
    saveValue: () => Promise<void>;
    updateStringValue: (value: string) => Promise<void>;
    updateHashField: (field: string, value: string) => Promise<void>;
}

/**
 * Hook for editing Redis key values
 */
export function useRedisValue({
    connectionId,
    selectedKey,
    keyValue,
    onKeyValueUpdate,
}: UseRedisValueProps): UseRedisValueReturn {
    const { toast } = useToast();
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState("");

    const isEditing = editingField !== null;

    const startEditing = useCallback((field: string, value: string): void => {
        setEditingField(field);
        setEditingValue(value);
    }, []);

    const cancelEditing = useCallback((): void => {
        setEditingField(null);
        setEditingValue("");
    }, []);

    const updateStringValue = useCallback(
        async (value: string): Promise<void> => {
            if (!connectionId || !selectedKey) return;

            try {
                await window.redis.executeCommand(connectionId, "SET", [
                    selectedKey,
                    value,
                ]);

                onKeyValueUpdate({
                    type: "string",
                    value,
                });

                toast({
                    title: "Value Updated",
                    description: `Updated key ${selectedKey}`,
                });
            } catch (error) {
                console.error("Failed to update value:", error);
                toast({
                    title: "Error",
                    description:
                        error instanceof Error ? error.message : "Failed to update value",
                    variant: "destructive",
                });
            }
        },
        [connectionId, selectedKey, onKeyValueUpdate, toast],
    );

    const updateHashField = useCallback(
        async (field: string, value: string): Promise<void> => {
            if (!connectionId || !selectedKey || !keyValue) return;

            try {
                await window.redis.executeCommand(connectionId, "HSET", [
                    selectedKey,
                    field,
                    value,
                ]);

                if (typeof keyValue.value === "object" && keyValue.value !== null) {
                    const hashValue = { ...(keyValue.value as Record<string, unknown>) };
                    hashValue[field] = value;

                    onKeyValueUpdate({
                        type: "hash",
                        value: hashValue,
                    });
                }

                toast({
                    title: "Hash Field Updated",
                    description: `Updated field ${field} of ${selectedKey}`,
                });
            } catch (error) {
                console.error("Failed to update hash field:", error);
                toast({
                    title: "Error",
                    description:
                        error instanceof Error ? error.message : "Failed to update value",
                    variant: "destructive",
                });
            }
        },
        [connectionId, selectedKey, keyValue, onKeyValueUpdate, toast],
    );

    const saveValue = useCallback(async (): Promise<void> => {
        if (!editingField || !keyValue) return;

        if (keyValue.type.toLowerCase() === "string") {
            await updateStringValue(editingValue);
        } else if (keyValue.type.toLowerCase() === "hash") {
            await updateHashField(editingField, editingValue);
        }

        cancelEditing();
    }, [
        editingField,
        editingValue,
        keyValue,
        updateStringValue,
        updateHashField,
        cancelEditing,
    ]);

    return {
        isEditing,
        editingField,
        editingValue,
        setEditingField,
        setEditingValue,
        startEditing,
        cancelEditing,
        saveValue,
        updateStringValue,
        updateHashField,
    };
}
