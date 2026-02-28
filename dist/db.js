import postgres from 'postgres';
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
}
const client = postgres(connectionString, { ssl: { rejectUnauthorized: false } });
export { client };
// 数据库操作
export const db = {
    // Users
    async createUser(data) {
        return await client `
      INSERT INTO users (email, google_id, stripe_customer_id, subscription_status)
      VALUES (${data.email}, ${data.googleId || null}, ${data.stripeCustomerId || null}, 'free')
      ON CONFLICT (email) DO UPDATE SET
        google_id = COALESCE(EXCLUDED.google_id, users.google_id),
        updated_at = NOW()
      RETURNING *;
    `;
    },
    async getUserByEmail(email) {
        const result = await client `SELECT * FROM users WHERE email = ${email}`;
        return result[0];
    },
    async getUserByGoogleId(googleId) {
        const result = await client `SELECT * FROM users WHERE google_id = ${googleId}`;
        return result[0];
    },
    async updateUserSubscription(email, data) {
        return await client `
      UPDATE users 
      SET subscription_status = ${data.subscriptionStatus},
          stripe_customer_id = COALESCE(${data.stripeCustomerId || null}, stripe_customer_id),
          stripe_subscription_id = COALESCE(${data.stripeSubscriptionId || null}, stripe_subscription_id),
          updated_at = NOW()
      WHERE email = ${email}
      RETURNING *;
    `;
    },
    // Forms (updated with user_email)
    async insertForms(data) {
        return await client `
      INSERT INTO forms (id, name, api_key, allowed_origins, user_email)
      VALUES (${data.id}, ${data.name}, ${data.apiKey}, ${JSON.stringify(data.allowedOrigins)}, ${data.userEmail || null})
      RETURNING *;
    `;
    },
    async selectForms(where) {
        if (where?.id) {
            return await client `SELECT * FROM forms WHERE id = ${where.id}`;
        }
        if (where?.userEmail) {
            return await client `SELECT * FROM forms WHERE user_email = ${where.userEmail} ORDER BY created_at DESC`;
        }
        return await client `SELECT * FROM forms ORDER BY created_at DESC`;
    },
    async countFormsByUser(userEmail) {
        const result = await client `SELECT COUNT(*) as count FROM forms WHERE user_email = ${userEmail}`;
        return parseInt(result[0].count);
    },
    async deleteForm(formId) {
        await client `DELETE FROM submissions WHERE form_id = ${formId}`;
        return await client `DELETE FROM forms WHERE id = ${formId}`;
    },
    async updateForm(formId, data) {
        if (data.name !== undefined) {
            const result = await client `UPDATE forms SET name = ${data.name} WHERE id = ${formId} RETURNING *`;
            return result[0];
        }
    },
    // Submissions
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
    },
    // Auth codes for email verification
    async createAuthCode(data) {
        // 删除旧验证码
        await client `DELETE FROM auth_codes WHERE email = ${data.email}`;
        // 创建新验证码（10分钟有效）
        return await client `
      INSERT INTO auth_codes (email, code, expires_at)
      VALUES (${data.email}, ${data.code}, NOW() + INTERVAL '10 minutes')
      RETURNING *;
    `;
    },
    async verifyAuthCode(email, code) {
        const result = await client `
      SELECT * FROM auth_codes 
      WHERE email = ${email} AND code = ${code} AND expires_at > NOW()
    `;
        if (result[0]) {
            // 验证成功后删除
            await client `DELETE FROM auth_codes WHERE email = ${email}`;
            return true;
        }
        return false;
    }
};
// 自动创建表
export async function initDatabase() {
    let retries = 10;
    while (retries > 0) {
        try {
            console.log('Initializing database...');
            // Users table
            await client `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          google_id TEXT UNIQUE,
          stripe_customer_id TEXT,
          stripe_subscription_id TEXT,
          subscription_status TEXT NOT NULL DEFAULT 'free',
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `;
            // Auth codes table
            await client `
        CREATE TABLE IF NOT EXISTS auth_codes (
          id SERIAL PRIMARY KEY,
          email TEXT NOT NULL,
          code TEXT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `;
            // Forms table (with user_email)
            await client `
        CREATE TABLE IF NOT EXISTS forms (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          api_key TEXT NOT NULL UNIQUE,
          allowed_origins JSONB NOT NULL DEFAULT '["*"]',
          user_email TEXT REFERENCES users(email),
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `;
            // Submissions table
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