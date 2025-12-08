/**
 * Types for Redis feature
 */

export interface KeyInfo {
    type: string;
    ttl: number;
    size: number;
}

export interface KeyValue {
    type: string;
    value: unknown;
}

export type ServerInfo = Record<string, Record<string, string>>;

export interface CommandLog {
    timestamp: string;
    duration: number;
    command: string;
}

export interface RedisConnectionState {
    isLoading: boolean;
    isConnecting: boolean;
    connectionError: string | null;
    serverInfo: ServerInfo | null;
}

export interface RedisKeysState {
    keys: string[];
    selectedKey: string | null;
    keyInfo: KeyInfo | null;
    keyValue: KeyValue | null;
    searchPattern: string;
    scanCursor: string;
    hasMoreKeys: boolean;
}

export interface RedisDatabaseState {
    currentDatabase: number;
    databaseCount: number;
    availableDatabases: number[];
    isDatabaseLoading: boolean;
}
