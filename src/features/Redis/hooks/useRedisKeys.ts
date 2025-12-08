import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import type { KeyInfo, KeyValue } from "../types";

interface UseRedisKeysProps {
    connectionId: string | null;
}

interface UseRedisKeysReturn {
    keys: string[];
    isLoading: boolean;
    searchPattern: string;
    scanCursor: string;
    hasMoreKeys: boolean;
    selectedKey: string | null;
    keyInfo: KeyInfo | null;
    keyValue: KeyValue | null;
    setSearchPattern: (pattern: string) => void;
    loadKeys: (pattern?: string, cursor?: string) => Promise<void>;
    loadMoreKeys: () => void;
    selectKey: (key: string) => Promise<void>;
    deleteKey: (key: string) => Promise<boolean>;
    refreshKeys: () => Promise<void>;
    clearSelection: () => void;
}

/**
 * Hook for managing Redis keys - listing, searching, selecting, deleting
 */
export function useRedisKeys({
    connectionId,
}: UseRedisKeysProps): UseRedisKeysReturn {
    const { toast } = useToast();
    const [keys, setKeys] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchPattern, setSearchPattern] = useState("*");
    const [scanCursor, setScanCursor] = useState("0");
    const [hasMoreKeys, setHasMoreKeys] = useState(false);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);
    const [keyValue, setKeyValue] = useState<KeyValue | null>(null);

    const loadKeys = useCallback(
        async (pattern = searchPattern, cursor = "0"): Promise<void> => {
            if (!connectionId) return;

            setIsLoading(true);
            try {
                const response = await window.redis.getKeys(
                    connectionId,
                    pattern,
                    cursor,
                    100,
                );

                if (cursor === "0") {
                    setKeys(response.keys);
                } else {
                    setKeys((prev) => [...prev, ...response.keys]);
                }

                setScanCursor(response.cursor);
                setHasMoreKeys(response.cursor !== "0");
            } catch (error) {
                console.error("Failed to load Redis keys:", error);
                toast({
                    title: "Error",
                    description:
                        error instanceof Error ? error.message : "Failed to load Redis keys",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        },
        [connectionId, searchPattern, toast],
    );

    const loadMoreKeys = useCallback((): void => {
        if (scanCursor !== "0") {
            loadKeys(searchPattern, scanCursor);
        }
    }, [scanCursor, searchPattern, loadKeys]);

    const refreshKeys = useCallback(async (): Promise<void> => {
        setScanCursor("0");
        await loadKeys(searchPattern, "0");
    }, [loadKeys, searchPattern]);

    const selectKey = useCallback(
        async (key: string): Promise<void> => {
            if (!connectionId) return;

            setSelectedKey(key);
            setKeyInfo(null);
            setKeyValue(null);

            try {
                const info = await window.redis.getKeyInfo(connectionId, key);
                setKeyInfo(info);

                const value = await window.redis.getKeyValue(connectionId, key);
                setKeyValue(value);
            } catch (error) {
                console.error("Failed to get key details:", error);
                toast({
                    title: "Error",
                    description:
                        error instanceof Error ? error.message : "Failed to get key details",
                    variant: "destructive",
                });
            }
        },
        [connectionId, toast],
    );

    const deleteKey = useCallback(
        async (key: string): Promise<boolean> => {
            if (!connectionId) return false;

            try {
                const success = await window.redis.deleteKey(connectionId, key);

                if (success) {
                    setKeys((prevKeys) => prevKeys.filter((k) => k !== key));

                    if (selectedKey === key) {
                        setSelectedKey(null);
                        setKeyInfo(null);
                        setKeyValue(null);
                    }

                    toast({
                        title: "Success",
                        description: `Deleted key: ${key}`,
                    });
                    return true;
                }
                return false;
            } catch (error) {
                console.error("Failed to delete key:", error);
                toast({
                    title: "Error",
                    description:
                        error instanceof Error ? error.message : "Failed to delete key",
                    variant: "destructive",
                });
                return false;
            }
        },
        [connectionId, selectedKey, toast],
    );

    const clearSelection = useCallback((): void => {
        setSelectedKey(null);
        setKeyInfo(null);
        setKeyValue(null);
    }, []);

    return {
        keys,
        isLoading,
        searchPattern,
        scanCursor,
        hasMoreKeys,
        selectedKey,
        keyInfo,
        keyValue,
        setSearchPattern,
        loadKeys,
        loadMoreKeys,
        selectKey,
        deleteKey,
        refreshKeys,
        clearSelection,
    };
}
