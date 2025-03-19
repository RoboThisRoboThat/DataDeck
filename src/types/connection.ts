export interface Connection {
    id: string;
    name: string;
    host: string;
    port: string;
    user: string;
    password: string;
    database: string;
    dbType: 'mysql' | 'postgres';
} 