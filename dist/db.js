import postgres from 'postgres';
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
}
const client = postgres(connectionString, { ssl: { rejectUnauthorized: false } });
// 直接导出 client 用于查询
export { client };
// 简化的数据库操作
export const db = {
    async insertForms(data) {
        return await client `
      INSERT INTO forms (id, name, api_key, allowed_origins)
      VALUES (${data.id}, ${data.name}, ${data.apiKey}, ${JSON.stringify(data.allowedOrigins)})
      RETURNING *;
    `;
    },
    async selectForms(where) {
        if (where?.id) {
            return await client `SELECT * FROM forms WHERE id = ${where.id}`;
        }
        return await client `SELECT * FROM forms`;
    },
    async insertSubmissions(data) {
        return await client `
      INSERT INTO submissions (id, form_id, data, ip_address, user_agent)
      VALUES (${data.id}, ${data.formId}, ${JSON.stringify(data.data)}, ${data.ipAddress}, ${data.userAgent})
      RETURNING *;
    `;
    },
    async selectSubmissions(formId) {
        return await client `
      SELECT * FROM submissions WHERE form_id = ${formId} ORDER BY created_at DESC;
    `;
    }
};
// 自动创建表
export async function initDatabase() {
    let retries = 10;
    while (retries > 0) {
        try {
            console.log('Initializing database...');
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
            return;
        }
        catch (error) {
            console.error(`❌ Database init failed (${retries} retries left):`, error.message);
            retries--;
            if (retries > 0) {
                await new Promise(r => setTimeout(r, 3000));
            }
            else {
                throw error;
            }
        }
    }
}
//# sourceMappingURL=db.js.map