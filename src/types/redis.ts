/**
 * Redis-specific type definitions.
 * Replaces all `any` types used in Redis-related code.
 */

import type { Result } from "./shared";

// ============================================
// Connection Types
// ============================================

/**
 * Redis connection configuration (replaces `config: any`)
 */
export interface RedisConfig {
    connectionString?: string;
    host?: string;
    port?: string | number;
    password?: string;
    username?: string;
    db?: number;
    database?: string; // Alternative to db for string-based db number
    tls?: boolean;
}

/**
 * Redis connection information for internal tracking
 */
export interface RedisConnectionInfo {
    id: string;
    type: "standalone" | "cluster" | "sentinel";
}

// ============================================
// Key Value Types
// ============================================

/**
 * Redis string value
 */
export interface RedisStringValue {
    type: "string";
    value: string;
}

/**
 * Redis list value
 */
export interface RedisListValue {
    type: "list";
    value: string[];
}

/**
 * Redis set value
 */
export interface RedisSetValue {
    type: "set";
    value: string[];
}

/**
 * Redis hash value
 */
export interface RedisHashValue {
    type: "hash";
    value: Record<string, string>;
}

/**
 * Redis sorted set member
 */
export interface RedisSortedSetMember {
    value: string;
    score: number;
}

/**
 * Redis sorted set value
 */
export interface RedisSortedSetValue {
    type: "zset";
    value: RedisSortedSetMember[];
}

/**
 * Redis stream entry
 */
export interface RedisStreamEntry {
    id: string;
    fields: Record<string, string>;
}

/**
 * Redis stream value
 */
export interface RedisStreamValue {
    type: "stream";
    value: RedisStreamEntry[];
}

/**
 * Unknown or none type value
 */
export interface RedisUnknownValue {
    type: "none" | "unknown";
    value: null;
}

/**
 * Union type for all Redis value types (replaces `value: any`)
 * Using a simpler structure to maintain compatibility with ioredis output types
 */
export interface RedisKeyValue {
    type: string;
    value: string | string[] | Record<string, string> | null;
}

/**
 * Input type for setting values - accepts various Redis data structures
 */
export type RedisInputValue =
    | string
    | string[];


// ============================================
// Key Info Types
// ============================================

/**
 * Information about a Redis key
 */
export interface RedisKeyInfo {
    type: string;
    ttl: number;
    size: number;
}

/**
 * Result from getKeys operation
 */
export interface RedisKeysResult {
    keys: string[];
    cursor: string;
}

// ============================================
// Server Info Types
// ============================================

/**
 * Redis server section info
 */
export interface RedisServerSection {
    [key: string]: string | number;
}

/**
 * Redis server info (replaces `Promise<any>`)
 */
export interface RedisServerInfo {
    server?: RedisServerSection;
    clients?: RedisServerSection;
    memory?: RedisServerSection;
    persistence?: RedisServerSection;
    stats?: RedisServerSection;
    replication?: RedisServerSection;
    cpu?: RedisServerSection;
    keyspace?: RedisServerSection;
    [section: string]: RedisServerSection | undefined;
}

/**
 * Redis client connection info - uses index signature since Redis client info is dynamic
 */
export interface RedisClientInfo {
    [key: string]: string;
}

// ============================================
// Result Types
// ============================================

/**
 * Result from Redis connect operation
 */
export type RedisConnectResult = Result;

/**
 * Result from Redis disconnect operation
 */
export type RedisDisconnectResult = Result;

/**
 * Result from select database operation
 */
export type RedisSelectDbResult = Result;

/**
 * Result from getDatabaseCount operation
 */
export interface RedisDatabaseCountResult extends Result {
    count: number;
}

/**
 * Result from getCurrentDatabase operation
 */
export interface RedisCurrentDbResult extends Result {
    db: number;
}

/**
 * Result from getPopulatedDatabases operation
 */
export interface RedisPopulatedDbsResult extends Result {
    databases: number[];
}

/**
 * Generic Redis command result (for executeCommand)
 */
export type RedisCommandResult = string | number | string[] | null | undefined;
