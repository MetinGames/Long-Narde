import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
    assertSupabaseMigrationSafe,
    findManagedSchemaMutations,
    MANAGED_SCHEMAS
} from '../scripts/lib/supabaseMigrationSafety.mjs';

test('hosted private-table migrations keep provider-managed schemas immutable', () => {
    assert.deepEqual(MANAGED_SCHEMAS, ['auth', 'storage', 'realtime']);
    for (const sql of [
        'create table realtime.room_events (id bigint);',
        'alter function auth.uid() rename to unsafe_uid;',
        'drop table if exists storage.objects;'
    ]) {
        assert.throws(() => assertSupabaseMigrationSafe(sql), /provider-managed/);
    }
});

test('application tables and realtime authorization policies remain allowed', () => {
    const sql = `
        create schema if not exists nardora;
        create table nardora.rooms (id uuid primary key);
        alter table nardora.rooms enable row level security;
        create policy "room members receive broadcasts"
        on realtime.messages for select to authenticated
        using ((select auth.uid()) is not null);
    `;

    assert.deepEqual(findManagedSchemaMutations(sql), []);
    assert.equal(assertSupabaseMigrationSafe(sql), true);
});

test('managed schema matching tolerates quoted names and multiline DDL', () => {
    const findings = findManagedSchemaMutations(
        'CREATE\nTABLE\nIF NOT EXISTS "realtime".unsafe (id int);'
    );
    assert.equal(findings.length, 1);
    assert.equal(findings[0].schema, 'realtime');
});


test('hosted boundary records synthetic provider evidence without enabling online play', () => {
    const boundary = readFileSync(
        new URL('../docs/SUPABASE_HOSTED_BOUNDARY.md', import.meta.url),
        'utf8'
    );

    assert.match(boundary, /realtime\.send\(jsonb,text,text,boolean\)/);
    assert.match(boundary, /revisions 1–9/);
    assert.match(boundary, /returned to zero rows/);
    assert.match(boundary, /Friend Match and Online disabled/);
    assert.match(boundary, /does not\s+decide the production region/);
});
