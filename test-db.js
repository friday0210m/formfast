import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
console.log('Testing connection...');
console.log('URL exists:', !!connectionString);

try {
  const client = postgres(connectionString);
  await client`SELECT 1`;
  console.log('✅ Connection successful');
  
  await client`
    CREATE TABLE IF NOT EXISTS test_table (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
  `;
  console.log('✅ Table created');
  
  await client`DROP TABLE test_table;`;
  console.log('✅ Cleanup done');
  
  await client.end();
} catch (err) {
  console.error('❌ Error:', err.message);
}
