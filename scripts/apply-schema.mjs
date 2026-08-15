import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const host = process.env.SUPABASE_DB_HOST ?? 'db.yiwxsvbuibhnnxequjra.supabase.co';
const port = Number(process.env.SUPABASE_DB_PORT ?? 5432);
const password = process.env.SUPABASE_DB_PASSWORD;
const user = process.env.SUPABASE_DB_USER ?? 'postgres';
const database = process.env.SUPABASE_DB_NAME ?? 'postgres';

if (!password) {
  console.error('ERROR: SUPABASE_DB_PASSWORD is required.');
  process.exit(1);
}

const migrationsDir = path.resolve(import.meta.dirname, '../supabase/migrations');
const only = process.argv[2];
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .filter((f) => !only || f === only)
  .sort();

const client = new pg.Client({ host, port, user, password, database, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  for (const file of files) {
    const sql = readFileSync(path.join(migrationsDir, file), 'utf8');
    process.stdout.write(`Applying ${file} ... `);
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log('OK');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('FAILED');
      throw err;
    }
  }
  console.log(`\nAll ${files.length} migrations applied successfully to ${host}.`);
} catch (err) {
  console.error('\nMigration aborted:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await client.end();
}