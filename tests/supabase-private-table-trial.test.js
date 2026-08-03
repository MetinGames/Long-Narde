import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const schemaPath = new URL(
    '../supabase/schema/private_table_trial.sql',
    import.meta.url
);
const functionPath = new URL(
    '../supabase/functions/private-table/index.ts',
    import.meta.url
);

test('Supabase trial schema keeps exposed tables behind grants and RLS', async () => {
    const sql = await readFile(schemaPath, 'utf8');

    for (const table of [
        'public.private_table_rooms',
        'public.private_table_room_members'
    ]) {
        assert.match(sql, new RegExp(
            `alter table ${table.replaceAll('.', '\\.')} enable row level security`,
            'i'
        ));
        assert.match(sql, new RegExp(
            `revoke all on ${table.replaceAll('.', '\\.')}`,
            'i'
        ));
    }

    assert.match(sql, /private_table_rooms_member_read/i);
    assert.match(sql, /private_table_members_self_read/i);
    assert.match(sql, /actor_id = \(select auth\.uid\(\)\)/i);
    assert.doesNotMatch(sql, /grant\s+(insert|update|delete).*authenticated/is);
});

test('Supabase trial exposes service-only RPCs and hashes resumable secrets', async () => {
    const sql = await readFile(schemaPath, 'utf8');

    assert.match(sql, /grant execute on function public\.private_table_dispatch[\s\S]*to service_role/i);
    assert.match(sql, /revoke all on function public\.private_table_dispatch[\s\S]*from public, anon, authenticated/i);
    assert.match(sql, /extensions\.digest\([\s\S]*resume_token/is);
    assert.match(sql, /extensions\.hmac\(/i);
    const inviteTable = sql.match(
        /create table private_table_private\.invites \([\s\S]*?\n\);/i
    )?.[0] ?? '';
    assert.match(inviteTable, /token_hash bytea not null unique/i);
    assert.doesNotMatch(inviteTable, /invite_token/i);
    assert.match(sql, /trusted_gameplay_not_ready/i);
    assert.match(sql, /clients cannot submit trusted outcome fields/i);
});

test('Realtime policy allows member Presence but no client Broadcast writes', async () => {
    const sql = await readFile(schemaPath, 'utf8');

    assert.match(sql, /nardora_private_table_receive/i);
    assert.match(sql, /extension in \('broadcast', 'presence'\)/i);
    assert.match(sql, /nardora_private_table_presence_send/i);
    assert.match(sql, /extension = 'presence'/i);
    assert.match(
        sql,
        /to_regprocedure\([\s\S]*realtime\.send\(jsonb,text,text,boolean\)/i
    );
    assert.doesNotMatch(
        sql,
        /for insert[\s\S]{0,500}extension\s*=\s*'broadcast'/i
    );
});

test('Edge Function verifies Auth user and never forwards client actor authority', async () => {
    const source = await readFile(functionPath, 'utf8');

    assert.match(source, /\/auth\/v1\/user/);
    assert.match(source, /command\.actorId !== actorId/);
    assert.match(source, /p_actor_id: actorId/);
    assert.match(source, /p_command: \{ \.\.\.command, actorId \}/);
    assert.match(source, /SUPABASE_SECRET_KEYS/);
    assert.doesNotMatch(source, /sb_secret_[A-Za-z0-9_-]+/);
    assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY/);
    assert.doesNotMatch(source, /console\.(log|error|warn)/);
});
