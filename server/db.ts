import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';
const DATABASE_URL = 'postgresql://postgres:akash@localhost:5432/akash';
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}
const pool = new Pool({ connectionString: DATABASE_URL });
export const db = drizzle(pool, { schema });
export { pool };
