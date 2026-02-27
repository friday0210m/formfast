import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// 使用 Render 提供的 PostgreSQL 数据库 URL
// 需要在 Render Dashboard 中设置 DATABASE_URL 环境变量
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  console.error('Please set it in Render Dashboard -> Environment Variables');
  process.exit(1);
}

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
