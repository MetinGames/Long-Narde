import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const runtimeDirectories = ['assets', 'engine'];
const runtimeRootExtensions = new Set(['.css', '.html', '.js', '.webmanifest']);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const directory of runtimeDirectories) {
    await cp(path.join(root, directory), path.join(output, directory), {
        recursive: true
    });
}

for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!runtimeRootExtensions.has(path.extname(entry.name))) continue;
    await cp(path.join(root, entry.name), path.join(output, entry.name));
}

console.log('Native web bundle prepared in dist/.');
