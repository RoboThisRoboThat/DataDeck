/**
 * Utility functions for Redis feature
 */

/**
 * Format TTL value to human-readable string
 */
export function formatTTL(ttl: number): string {
    if (ttl === -1) return "No Expiry";
    if (ttl === -2) return "Key not found";
    if (ttl < 60) return `${ttl}s`;
    if (ttl < 3600) return `${Math.floor(ttl / 60)}m ${ttl % 60}s`;
    if (ttl < 86400) {
        const hours = Math.floor(ttl / 3600);
        const minutes = Math.floor((ttl % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }
    const days = Math.floor(ttl / 86400);
    const hours = Math.floor((ttl % 86400) / 3600);
    return `${days}d ${hours}h`;
}

/**
 * Format memory size to human-readable string
 */
export function formatSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format duration in milliseconds to readable string
 */
export function formatDuration(ms: number): string {
    if (ms < 1) return `${(ms * 1000).toFixed(2)}µs`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Check if a string is valid JSON
 */
export function isJsonString(str: string): boolean {
    try {
        JSON.parse(str);
        return true;
    } catch {
        return false;
    }
}

/**
 * Try to format a value as pretty JSON
 */
export function tryFormatJson(value: string): string {
    try {
        const parsed = JSON.parse(value);
        return JSON.stringify(parsed, null, 2);
    } catch {
        return value;
    }
}

/**
 * Get type badge color based on Redis type
 */
export function getTypeBadgeColor(type: string): string {
    const colors: Record<string, string> = {
        string: "bg-blue-500",
        hash: "bg-green-500",
        list: "bg-yellow-500",
        set: "bg-purple-500",
        zset: "bg-pink-500",
        stream: "bg-orange-500",
    };
    return colors[type.toLowerCase()] || "bg-gray-500";
}
