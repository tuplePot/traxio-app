import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

export const db = drizzle({ client: pool, schema: schema });

/** Ambil baris pertama hasil query (pengganti `.then(first)` milik SQLite). */
export const first = <T>(rows: T[]): T | undefined => rows[0];

/** Ambil satu baris yang pasti ada (mis. hasil `insert ... returning`). */
export const one = <T>(rows: T[]): T => {
  if (rows.length === 0) throw new Error('Query tidak mengembalikan baris');
  return rows[0];
};
