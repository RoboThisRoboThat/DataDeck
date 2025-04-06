import { DiMysql, DiPostgresql, DiMongodb, DiRedis } from "react-icons/di";
import type { IconType } from "react-icons";

export enum ConnectionType {
	MySQL = "mysql",
	Postgres = "postgres",
	MongoDB = "mongodb",
	Redis = "redis",
}

export interface DatabaseTypeInfo {
	name: string;
	icon: IconType;
	iconColor: string;
	description: string;
}

export const DATABASE_TYPE_MAP: Record<ConnectionType, DatabaseTypeInfo> = {
	[ConnectionType.MySQL]: {
		name: "MySQL",
		icon: DiMysql,
		iconColor: "text-blue-600",
		description: "Connect to MySQL databases",
	},
	[ConnectionType.Postgres]: {
		name: "PostgreSQL",
		icon: DiPostgresql,
		iconColor: "text-blue-500",
		description: "Connect to PostgreSQL databases",
	},
	[ConnectionType.MongoDB]: {
		name: "MongoDB",
		icon: DiMongodb,
		iconColor: "text-green-600",
		description: "Connect to MongoDB databases",
	},
	[ConnectionType.Redis]: {
		name: "Redis",
		icon: DiRedis,
		iconColor: "text-red-500",
		description: "Connect to Redis databases",
	},
};

export interface BaseConnection {
	id: string;
	name: string;
	dbType: ConnectionType;
}

export interface SQLConnection extends BaseConnection {
	dbType: ConnectionType.MySQL | ConnectionType.Postgres;
	host: string;
	port: string;
	user: string;
	password: string;
	database: string;
}

export interface MongoDBConnection extends BaseConnection {
	dbType: ConnectionType.MongoDB;
	connectionString: string;
}

export interface RedisConnection extends BaseConnection {
	dbType: ConnectionType.Redis;
	connectionString: string;
}

// For backward compatibility
export type Connection = SQLConnection | MongoDBConnection | RedisConnection;
