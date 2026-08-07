import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertSupabaseMigrationSafe } from './lib/supabaseMigrationSafety.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrations = path.join(root, 'supabase', 'migrations');
let entries = [];

try {
    entries = await readdir(migrations);
} catch (error) {
    if (error.code !== 'ENOENT') throw error;
}

for (const entry of entries.filter(name => name.endsWith('.sql')).sort()) {
    assertSupabaseMigrationSafe(
        await readFile(path.join(migrations, entry), 'utf8'),
        entry
    );
}

console.log(`Supabase safety checked ${entries.filter(name => name.endsWith('.sql')).length} migration(s).`);
