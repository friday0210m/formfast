import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
}
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
// 自动创建表
async function initDatabase() {
    try {
        await client `
      CREATE TABLE IF NOT EXISTS forms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        api_key TEXT NOT NULL UNIQUE,
        allowed_origins JSONB NOT NULL DEFAULT '["*"]',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
        await client `
      CREATE TABLE IF NOT EXISTS submissions (
        id TEXT PRIMARY KEY,
        form_id TEXT NOT NULL REFERENCES forms(id),
        data JSONB NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
        console.log('✅ Database tables initialized');
    }
    catch (error) {
        console.error('Failed to initialize database:', error);
    }
}
initDatabase();
//# sourceMappingURL=db.js.map