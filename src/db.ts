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
  async insertForms(data: any) {
    return await client`
      INSERT INTO forms (id, name, api_key, allowed_origins)
      VALUES (${data.id}, ${data.name}, ${data.apiKey}, ${JSON.stringify(data.allowedOrigins)})
      RETURNING *;
    `;
  },
  async selectForms(where?: any) {
    if (where?.id) {
      return await client`SELECT * FROM forms WHERE id = ${where.id}`;
    }
    return await client`SELECT * FROM forms`;
  },
  async insertSubmissions(data: any) {
    return await client`
      INSERT INTO submissions (id, form_id, data, ip_address, user_agent)
      VALUES (${data.id}, ${data.formId}, ${JSON.stringify(data.data)}, ${data.ipAddress}, ${data.userAgent})
      RETURNING *;
    `;
  },
  async selectSubmissions(formId: string) {
    return await client`
      SELECT * FROM submissions WHERE form_id = ${formId} ORDER BY created_at DESC;
    `;
  },
  async deleteForm(formId: string) {
    // 先删除关联的提交数据
    await client`DELETE FROM submissions WHERE form_id = ${formId}`;
    // 再删除表单
    return await client`DELETE FROM forms WHERE id = ${formId}`;
  },
  async updateForm(formId: string, data: { name?: string }) {
    if (data.name) {
      return await client`UPDATE forms SET name = ${data.name} WHERE id = ${formId}`;
    }
  }
};

// 自动创建表
export async function initDatabase(): Promise<void> {
  let retries = 10;
  while (retries > 0) {
    try {
      console.log('Initializing database...');
      
      await client`
        CREATE TABLE IF NOT EXISTS forms (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          api_key TEXT NOT NULL UNIQUE,
          allowed_origins JSONB NOT NULL DEFAULT '["*"]',
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `;
      
      await client`
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
    } catch (error: any) {
      console.error(`❌ Database init failed (${retries} retries left):`, error.message);
      retries--;
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 3000));
      } else {
        throw error;
      }
    }
  }
}
