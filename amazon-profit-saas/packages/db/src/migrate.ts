import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { pool, transaction } from './index.js';
const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../migrations');
await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations(filename text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())');
const applied = new Set((await pool.query<{filename:string}>('SELECT filename FROM schema_migrations')).rows.map(r=>r.filename));
for (const file of (await readdir(dir)).filter(f=>f.endsWith('.sql')).sort()) {
  if (applied.has(file)) continue;
  const sql = await readFile(resolve(dir,file),'utf8');
  await transaction(async c=>{await c.query(sql);await c.query('INSERT INTO schema_migrations(filename) VALUES($1)',[file]);});
  console.log(`[db] applied ${file}`);
}
await pool.end();
