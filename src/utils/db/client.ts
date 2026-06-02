import { Pool } from "pg";

let pool: Pool | undefined;

export function getDb(): Pool {
    if (!pool) {
        pool = new Pool({ connectionString: process.env.DATABASE_URL });
    }
    return pool;
}
