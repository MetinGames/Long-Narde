import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const roadmap = await readFile(path.join(root, 'ROADMAP.md'), 'utf8');
const issues = JSON.parse(await readFile(path.join(root, '.github/active-issues.json')));
const numbers = new Set();
const allowedStatuses = new Set(['triage', 'ready', 'in-progress', 'blocked']);

for (const issue of issues) {
    if (!Number.isSafeInteger(issue.number) || numbers.has(issue.number)) {
        throw new Error(`Invalid or duplicate active issue: ${issue.number}`);
    }
    numbers.add(issue.number);
    if (!/^p[0-3]$/.test(issue.priority)) {
        throw new Error(`Invalid priority for #${issue.number}`);
    }
    if (!allowedStatuses.has(issue.status)) {
        throw new Error(`Invalid active status for #${issue.number}`);
    }
    if (!roadmap.includes(`issues/${issue.number}`)) {
        throw new Error(`ROADMAP.md does not reference active issue #${issue.number}`);
    }
}

console.log(`Roadmap references all ${issues.length} active catalog issues.`);
