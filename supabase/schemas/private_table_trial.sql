-- Nardora synthetic private-table trial.
-- No real-player data belongs in this project. Gameplay commands remain disabled
-- until the Long Narde rule engine runs inside the trusted boundary.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private_table_private;
revoke all on schema private_table_private from public, anon, authenticated;

create table public.private_table_rooms (
    id uuid primary key default extensions.gen_random_uuid(),
    protocol_version smallint not null default 1 check (protocol_version = 1),
    status text not null default 'lobby'
        check (status in ('lobby', 'active', 'closed')),
    revision bigint not null default 0 check (revision >= 0),
    last_event_sequence bigint not null default 0
        check (last_event_sequence >= 0),
    host_actor_id uuid not null,
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    closed_at timestamptz,
    delete_after timestamptz
);

create table public.private_table_room_members (
    room_id uuid not null references public.private_table_rooms(id) on delete cascade,
    actor_id uuid not null,
    display_name text not null check (
        char_length(btrim(display_name)) between 1 and 40
    ),
    avatar_id text not null check (
        char_length(btrim(avatar_id)) between 1 and 64
    ),
    status text not null default 'joined'
        check (status in ('joined', 'ready', 'disconnected', 'left')),
    ready boolean not null default false,
    joined_at timestamptz not null default statement_timestamp(),
    last_seen_at timestamptz not null default statement_timestamp(),
    left_at timestamptz,
    primary key (room_id, actor_id)
);

create index private_table_members_actor_room_idx
    on public.private_table_room_members(actor_id, room_id)
    where status <> 'left';

create table private_table_private.member_credentials (
    room_id uuid not null,
    actor_id uuid not null,
    session_id text,
    resume_token_hash bytea,
    resume_generation integer not null default 1 check (resume_generation > 0),
    muted_actor_ids uuid[] not null default '{}',
    blocked_actor_ids uuid[] not null default '{}',
    primary key (room_id, actor_id),
    foreign key (room_id, actor_id)
        references public.private_table_room_members(room_id, actor_id)
        on delete cascade,
    check (session_id is null or char_length(session_id) between 1 and 128)
);

create table private_table_private.invites (
    id uuid primary key default extensions.gen_random_uuid(),
    room_id uuid not null references public.private_table_rooms(id) on delete cascade,
    token_hash bytea not null unique,
    created_by uuid not null,
    created_at timestamptz not null default statement_timestamp(),
    expires_at timestamptz not null,
    used_by uuid,
    used_at timestamptz
);

create index private_table_invites_room_expiry_idx
    on private_table_private.invites(room_id, expires_at)
    where used_by is null;

create table private_table_private.events (
    id uuid primary key default extensions.gen_random_uuid(),
    room_id uuid not null references public.private_table_rooms(id) on delete cascade,
    event_sequence bigint not null check (event_sequence > 0),
    revision bigint not null check (revision > 0),
    event_type text not null,
    actor_id uuid not null,
    payload jsonb not null default '{}'::jsonb,
    occurred_at timestamptz not null default statement_timestamp(),
    unique (room_id, event_sequence),
    unique (room_id, revision)
);

create index private_table_events_retention_idx
    on private_table_private.events(occurred_at);

create table private_table_private.reports (
    id uuid primary key default extensions.gen_random_uuid(),
    room_id uuid not null references public.private_table_rooms(id) on delete cascade,
    reporter_actor_id uuid not null,
    target_actor_id uuid not null,
    category text not null check (
        category in ('harassment', 'spam', 'cheating', 'unsafe_profile', 'other')
    ),
    created_at timestamptz not null default statement_timestamp()
);

create index private_table_reports_room_idx
    on private_table_private.reports(room_id);

create table private_table_private.processed_commands (
    actor_id uuid not null,
    command_id text not null check (char_length(command_id) between 1 and 96),
    fingerprint bytea not null,
    room_id uuid not null references public.private_table_rooms(id) on delete cascade,
    safe_result jsonb not null,
    token_kind text check (token_kind in ('invite', 'resume')),
    token_reference uuid,
    token_generation integer,
    processed_at timestamptz not null default statement_timestamp(),
    primary key (actor_id, command_id)
);

create index private_table_commands_retention_idx
    on private_table_private.processed_commands(processed_at);

create index private_table_commands_room_idx
    on private_table_private.processed_commands(room_id);

create table private_table_private.secrets (
    key_name text primary key,
    secret_value text not null,
    created_at timestamptz not null default statement_timestamp()
);

insert into private_table_private.secrets(key_name, secret_value)
values (
    'token_pepper',
    encode(extensions.gen_random_bytes(32), 'hex')
)
on conflict (key_name) do nothing;

revoke all on all tables in schema private_table_private
    from public, anon, authenticated;
grant usage on schema private_table_private to service_role;
grant select, insert, update, delete
    on all tables in schema private_table_private
    to service_role;

alter table public.private_table_rooms enable row level security;
alter table public.private_table_room_members enable row level security;

revoke all on public.private_table_rooms from public, anon, authenticated;
revoke all on public.private_table_room_members from public, anon, authenticated;
grant select, insert, update, delete
    on public.private_table_rooms, public.private_table_room_members
    to service_role;

grant select (
    id,
    protocol_version,
    status,
    revision,
    last_event_sequence,
    host_actor_id,
    created_at,
    updated_at,
    closed_at
) on public.private_table_rooms to authenticated;

grant select (
    room_id,
    actor_id,
    display_name,
    avatar_id,
    status,
    ready,
    joined_at,
    last_seen_at,
    left_at
) on public.private_table_room_members to authenticated;

create policy private_table_rooms_member_read
on public.private_table_rooms
for select
to authenticated
using (
    exists (
        select 1
        from public.private_table_room_members member
        where member.room_id = private_table_rooms.id
          and member.actor_id = (select auth.uid())
          and member.status <> 'left'
    )
);

create policy private_table_members_self_read
on public.private_table_room_members
for select
to authenticated
using (
    actor_id = (select auth.uid())
    and status <> 'left'
);

create or replace function private_table_private.raise_protocol_error(
    error_code text,
    error_message text,
    error_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
set search_path = pg_catalog
as $$
begin
    raise exception using
        errcode = 'P0001',
        message = error_message,
        detail = jsonb_build_object(
            'code', error_code,
            'details', coalesce(error_details, '{}'::jsonb)
        )::text;
end;
$$;

create or replace function private_table_private.derive_token(
    token_kind text,
    room_id uuid,
    actor_id uuid,
    token_reference uuid,
    token_generation integer
)
returns text
language sql
stable
set search_path = pg_catalog, private_table_private, extensions
as $$
    select encode(
        extensions.hmac(
            convert_to(
                concat_ws(
                    ':',
                    token_kind,
                    room_id::text,
                    coalesce(actor_id::text, '-'),
                    coalesce(token_reference::text, '-'),
                    coalesce(token_generation::text, '-')
                ),
                'UTF8'
            ),
            convert_to(secret_value, 'UTF8'),
            'sha256'
        ),
        'hex'
    )
    from private_table_private.secrets
    where key_name = 'token_pepper'
$$;

create or replace function private_table_private.attach_sensitive_token(
    safe_result jsonb,
    token_kind text,
    room_id uuid,
    actor_id uuid,
    token_reference uuid,
    token_generation integer
)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog, private_table_private
as $$
declare
    token_value text;
begin
    if token_kind is null then
        return safe_result;
    end if;

    token_value := private_table_private.derive_token(
        token_kind,
        room_id,
        actor_id,
        token_reference,
        token_generation
    );

    if token_kind = 'invite' then
        return jsonb_set(
            safe_result,
            '{invitation,inviteToken}',
            to_jsonb(token_value),
            true
        );
    end if;

    return jsonb_set(
        safe_result,
        '{snapshot,self,resumeToken}',
        to_jsonb(token_value),
        true
    );
end;
$$;

create or replace function private_table_private.snapshot(
    target_room_id uuid,
    viewer_actor_id uuid
)
returns jsonb
language sql
stable
set search_path = pg_catalog, public, private_table_private
as $$
    select jsonb_build_object(
        'version', room.protocol_version,
        'authority', 'server',
        'roomId', room.id::text,
        'revision', room.revision,
        'lastEventSequence', room.last_event_sequence,
        'status', room.status,
        'hostId', room.host_actor_id::text,
        'members', coalesce((
            select jsonb_agg(
                jsonb_build_object(
                    'identity', jsonb_build_object(
                        'id', member.actor_id::text,
                        'displayName', member.display_name,
                        'avatarId', member.avatar_id
                    ),
                    'status', member.status,
                    'ready', member.ready,
                    'lastSeenAt', floor(
                        extract(epoch from member.last_seen_at) * 1000
                    )::bigint
                )
                order by member.joined_at, member.actor_id
            )
            from public.private_table_room_members member
            where member.room_id = room.id
        ), '[]'::jsonb),
        'self', (
            select jsonb_build_object(
                'resumeToken', null,
                'mutedActorIds', to_jsonb(credential.muted_actor_ids::text[]),
                'blockedActorIds', to_jsonb(credential.blocked_actor_ids::text[])
            )
            from private_table_private.member_credentials credential
            where credential.room_id = room.id
              and credential.actor_id = viewer_actor_id
        )
    )
    from public.private_table_rooms room
    where room.id = target_room_id
$$;

create or replace function private_table_private.append_event(
    target_room_id uuid,
    event_actor_id uuid,
    new_event_type text,
    new_payload jsonb
)
returns jsonb
language plpgsql
volatile
set search_path = pg_catalog, public, private_table_private, extensions
as $$
declare
    room_row public.private_table_rooms%rowtype;
    event_id uuid := extensions.gen_random_uuid();
    event_time timestamptz := statement_timestamp();
begin
    update public.private_table_rooms
    set revision = revision + 1,
        last_event_sequence = last_event_sequence + 1,
        updated_at = event_time
    where id = target_room_id
    returning * into room_row;

    insert into private_table_private.events(
        id,
        room_id,
        event_sequence,
        revision,
        event_type,
        actor_id,
        payload,
        occurred_at
    ) values (
        event_id,
        target_room_id,
        room_row.last_event_sequence,
        room_row.revision,
        new_event_type,
        event_actor_id,
        coalesce(new_payload, '{}'::jsonb),
        event_time
    );

    return jsonb_build_object(
        'version', room_row.protocol_version,
        'authority', 'server',
        'eventId', event_id::text,
        'eventSequence', room_row.last_event_sequence,
        'roomId', target_room_id::text,
        'revision', room_row.revision,
        'type', new_event_type,
        'occurredAt', floor(extract(epoch from event_time) * 1000)::bigint,
        'actorId', event_actor_id::text,
        'payload', coalesce(new_payload, '{}'::jsonb)
    );
end;
$$;

create or replace function public.private_table_dispatch(
    p_actor_id uuid,
    p_session_id text,
    p_command jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, private_table_private, extensions, realtime
as $$
<<dispatch>>
declare
    command_id text;
    command_type text;
    command_actor_id text;
    payload jsonb := coalesce(p_command -> 'payload', '{}'::jsonb);
    fingerprint bytea;
    prior private_table_private.processed_commands%rowtype;
    room_row public.private_table_rooms%rowtype;
    member_row public.private_table_room_members%rowtype;
    credential_row private_table_private.member_credentials%rowtype;
    room_id uuid;
    expected_revision bigint;
    identity jsonb;
    display_name text;
    avatar_id text;
    ready_value boolean;
    invite_id uuid;
    invite_token text;
    resume_token text;
    resume_generation integer;
    target_actor_id uuid;
    report_id uuid;
    event jsonb;
    result jsonb;
    safe_result jsonb;
    token_kind text;
    token_reference uuid;
    token_generation integer;
    should_broadcast boolean := true;
    active_count integer;
    all_ready boolean;
begin
    if p_command is null or jsonb_typeof(p_command) <> 'object' then
        perform private_table_private.raise_protocol_error(
            'invalid_command',
            'command envelope is required'
        );
    end if;

    if p_command ->> 'version' is distinct from '1' then
        perform private_table_private.raise_protocol_error(
            'unsupported_version',
            'only private-table protocol version 1 is supported',
            jsonb_build_object('supportedVersion', 1)
        );
    end if;

    if p_command ? 'authority'
       and p_command ->> 'authority' <> 'client' then
        perform private_table_private.raise_protocol_error(
            'invalid_authority',
            'clients may dispatch only client command envelopes'
        );
    end if;

    command_id := btrim(coalesce(p_command ->> 'commandId', ''));
    command_type := btrim(coalesce(p_command ->> 'type', ''));
    command_actor_id := btrim(coalesce(p_command ->> 'actorId', ''));

    if char_length(command_id) not between 1 and 96
       or char_length(command_type) not between 1 and 64 then
        perform private_table_private.raise_protocol_error(
            'invalid_command',
            'commandId and type are required and must respect protocol limits'
        );
    end if;

    if command_actor_id <> p_actor_id::text then
        perform private_table_private.raise_protocol_error(
            'identity_mismatch',
            'command actorId must match the authenticated user'
        );
    end if;

    if p_session_id is null or char_length(btrim(p_session_id)) not between 1 and 128 then
        perform private_table_private.raise_protocol_error(
            'invalid_command',
            'sessionId is required and must be at most 128 characters'
        );
    end if;

    if jsonb_typeof(payload) <> 'object' then
        perform private_table_private.raise_protocol_error(
            'invalid_command',
            'payload must be an object'
        );
    end if;

    if payload ?| array[
        'accepted',
        'dice',
        'diceValues',
        'legal',
        'rating',
        'result',
        'score',
        'winnerId'
    ] then
        perform private_table_private.raise_protocol_error(
            'untrusted_outcome',
            'clients cannot submit trusted outcome fields'
        );
    end if;

    fingerprint := extensions.digest(
        convert_to(
            p_actor_id::text || ':' || p_session_id || ':' || p_command::text,
            'UTF8'
        ),
        'sha256'
    );

    perform pg_advisory_xact_lock(
        hashtextextended(p_actor_id::text || ':' || command_id, 0)
    );

    select * into prior
    from private_table_private.processed_commands
    where actor_id = p_actor_id
      and processed_commands.command_id = dispatch.command_id;

    if found then
        if prior.fingerprint <> fingerprint then
            perform private_table_private.raise_protocol_error(
                'idempotency_conflict',
                'commandId was already used for a different command'
            );
        end if;

        return private_table_private.attach_sensitive_token(
            jsonb_set(prior.safe_result, '{replayed}', 'true'::jsonb, true),
            prior.token_kind,
            prior.room_id,
            p_actor_id,
            prior.token_reference,
            prior.token_generation
        );
    end if;

    if command_type = 'create_room' then
        identity := payload -> 'identity';
        if jsonb_typeof(identity) <> 'object'
           or identity ->> 'id' is distinct from p_actor_id::text then
            perform private_table_private.raise_protocol_error(
                'invalid_identity',
                'identity is required and identity.id must match actorId'
            );
        end if;

        display_name := btrim(coalesce(identity ->> 'displayName', ''));
        avatar_id := btrim(coalesce(identity ->> 'avatarId', ''));
        if char_length(display_name) not between 1 and 40
           or char_length(avatar_id) not between 1 and 64 then
            perform private_table_private.raise_protocol_error(
                'invalid_identity',
                'displayName and avatarId must respect protocol limits'
            );
        end if;

        if nullif(p_command ->> 'roomId', '') is null then
            room_id := extensions.gen_random_uuid();
        else
            begin
                room_id := (p_command ->> 'roomId')::uuid;
            exception when invalid_text_representation then
                perform private_table_private.raise_protocol_error(
                    'invalid_command',
                    'roomId must be a UUID'
                );
            end;
        end if;

        if exists (select 1 from public.private_table_rooms where id = room_id) then
            perform private_table_private.raise_protocol_error(
                'room_exists',
                'room already exists'
            );
        end if;

        insert into public.private_table_rooms(id, host_actor_id)
        values (room_id, p_actor_id);

        insert into public.private_table_room_members(
            room_id,
            actor_id,
            display_name,
            avatar_id
        ) values (
            room_id,
            p_actor_id,
            display_name,
            avatar_id
        );

        resume_generation := 1;
        resume_token := private_table_private.derive_token(
            'resume', room_id, p_actor_id, null, resume_generation
        );

        insert into private_table_private.member_credentials(
            room_id,
            actor_id,
            session_id,
            resume_token_hash,
            resume_generation
        ) values (
            room_id,
            p_actor_id,
            p_session_id,
            extensions.digest(convert_to(resume_token, 'UTF8'), 'sha256'),
            resume_generation
        );

        event := private_table_private.append_event(
            room_id,
            p_actor_id,
            'room_created',
            jsonb_build_object('hostId', p_actor_id::text)
        );
        token_kind := 'resume';
        token_generation := resume_generation;

    else
        if nullif(p_command ->> 'roomId', '') is null then
            perform private_table_private.raise_protocol_error(
                'invalid_command',
                'roomId is required for room commands'
            );
        end if;

        begin
            room_id := (p_command ->> 'roomId')::uuid;
        exception when invalid_text_representation then
            perform private_table_private.raise_protocol_error(
                'invalid_command',
                'roomId must be a UUID'
            );
        end;

        select * into room_row
        from public.private_table_rooms
        where id = room_id
        for update;

        if not found then
            perform private_table_private.raise_protocol_error(
                'room_not_found',
                'room does not exist'
            );
        end if;

        if room_row.status = 'closed' then
            perform private_table_private.raise_protocol_error(
                'room_closed',
                'room is closed'
            );
        end if;

        if coalesce(
            jsonb_typeof(p_command -> 'expectedRevision') <> 'number',
            true
        ) or coalesce(
            (p_command ->> 'expectedRevision') !~ '^[0-9]+$',
            true
        ) then
            perform private_table_private.raise_protocol_error(
                'revision_required',
                'expectedRevision is required for room commands',
                jsonb_build_object('actualRevision', room_row.revision)
            );
        end if;

        expected_revision := (p_command ->> 'expectedRevision')::bigint;
        if expected_revision <> room_row.revision then
            perform private_table_private.raise_protocol_error(
                'stale_revision',
                'command was based on a stale room revision',
                jsonb_build_object(
                    'expectedRevision', expected_revision,
                    'actualRevision', room_row.revision
                )
            );
        end if;

        if command_type = 'create_invite' then
            select member.* into member_row
            from public.private_table_room_members member
            join private_table_private.member_credentials credential
              using (room_id, actor_id)
            where member.room_id = dispatch.room_id
              and member.actor_id = p_actor_id
              and member.status not in ('left', 'disconnected')
              and credential.session_id = p_session_id;

            if not found then
                perform private_table_private.raise_protocol_error(
                    'stale_session',
                    'session is missing or stale'
                );
            end if;
            if room_row.host_actor_id <> p_actor_id then
                perform private_table_private.raise_protocol_error(
                    'host_required',
                    'only the room host can perform this command'
                );
            end if;
            if room_row.status <> 'lobby' then
                perform private_table_private.raise_protocol_error(
                    'invalid_transition',
                    'invites can be created only while the room is in the lobby'
                );
            end if;

            invite_id := extensions.gen_random_uuid();
            invite_token := private_table_private.derive_token(
                'invite', room_id, p_actor_id, invite_id, 1
            );
            insert into private_table_private.invites(
                id,
                room_id,
                token_hash,
                created_by,
                expires_at
            ) values (
                invite_id,
                room_id,
                extensions.digest(convert_to(invite_token, 'UTF8'), 'sha256'),
                p_actor_id,
                statement_timestamp() + interval '15 minutes'
            );

            event := private_table_private.append_event(
                room_id,
                p_actor_id,
                'invite_created',
                jsonb_build_object(
                    'inviteId', invite_id::text,
                    'expiresAt', floor(extract(
                        epoch from statement_timestamp() + interval '15 minutes'
                    ) * 1000)::bigint
                )
            );
            token_kind := 'invite';
            token_reference := invite_id;
            token_generation := 1;

        elsif command_type = 'join_room' then
            if room_row.status <> 'lobby' then
                perform private_table_private.raise_protocol_error(
                    'invalid_transition',
                    'members can join only while the room is in the lobby'
                );
            end if;
            if exists (
                select 1
                from public.private_table_room_members
                where private_table_room_members.room_id = dispatch.room_id
                  and actor_id = p_actor_id
            ) then
                perform private_table_private.raise_protocol_error(
                    'member_exists',
                    'member already belongs to this room'
                );
            end if;

            select count(*) into active_count
            from public.private_table_room_members
            where private_table_room_members.room_id = dispatch.room_id
              and status <> 'left';
            if active_count >= 2 then
                perform private_table_private.raise_protocol_error(
                    'room_full',
                    'private tables allow exactly two active members'
                );
            end if;

            invite_token := btrim(coalesce(payload ->> 'inviteToken', ''));
            select id into invite_id
            from private_table_private.invites
            where invites.room_id = dispatch.room_id
              and token_hash = extensions.digest(
                  convert_to(invite_token, 'UTF8'),
                  'sha256'
              )
              and used_by is null
              and expires_at > statement_timestamp()
            for update;
            if not found then
                perform private_table_private.raise_protocol_error(
                    'invalid_invite',
                    'invite is missing, expired, or already used'
                );
            end if;

            if exists (
                select 1
                from private_table_private.member_credentials credential
                where credential.room_id = dispatch.room_id
                  and p_actor_id = any(credential.blocked_actor_ids)
            ) then
                perform private_table_private.raise_protocol_error(
                    'member_blocked',
                    'member cannot join this room'
                );
            end if;

            identity := payload -> 'identity';
            if jsonb_typeof(identity) <> 'object'
               or identity ->> 'id' is distinct from p_actor_id::text then
                perform private_table_private.raise_protocol_error(
                    'invalid_identity',
                    'identity is required and identity.id must match actorId'
                );
            end if;
            display_name := btrim(coalesce(identity ->> 'displayName', ''));
            avatar_id := btrim(coalesce(identity ->> 'avatarId', ''));
            if char_length(display_name) not between 1 and 40
               or char_length(avatar_id) not between 1 and 64 then
                perform private_table_private.raise_protocol_error(
                    'invalid_identity',
                    'displayName and avatarId must respect protocol limits'
                );
            end if;

            insert into public.private_table_room_members(
                room_id,
                actor_id,
                display_name,
                avatar_id
            ) values (
                room_id,
                p_actor_id,
                display_name,
                avatar_id
            );

            resume_generation := 1;
            resume_token := private_table_private.derive_token(
                'resume', room_id, p_actor_id, null, resume_generation
            );
            insert into private_table_private.member_credentials(
                room_id,
                actor_id,
                session_id,
                resume_token_hash,
                resume_generation
            ) values (
                room_id,
                p_actor_id,
                p_session_id,
                extensions.digest(convert_to(resume_token, 'UTF8'), 'sha256'),
                resume_generation
            );
            update private_table_private.invites
            set used_by = p_actor_id,
                used_at = statement_timestamp()
            where id = invite_id;

            event := private_table_private.append_event(
                room_id,
                p_actor_id,
                'member_joined',
                jsonb_build_object('memberId', p_actor_id::text)
            );
            token_kind := 'resume';
            token_generation := resume_generation;

        elsif command_type = 'resume' then
            select * into member_row
            from public.private_table_room_members member
            where member.room_id = dispatch.room_id
              and member.actor_id = p_actor_id
            for update;
            select * into credential_row
            from private_table_private.member_credentials credential
            where credential.room_id = dispatch.room_id
              and credential.actor_id = p_actor_id
            for update;

            if not found or member_row.status <> 'disconnected' then
                perform private_table_private.raise_protocol_error(
                    'invalid_transition',
                    'only a disconnected member can resume'
                );
            end if;

            resume_token := btrim(coalesce(payload ->> 'resumeToken', ''));
            if credential_row.resume_token_hash is null
               or credential_row.resume_token_hash <> extensions.digest(
                   convert_to(resume_token, 'UTF8'), 'sha256'
               ) then
                perform private_table_private.raise_protocol_error(
                    'invalid_resume_token',
                    'resume token is invalid'
                );
            end if;

            resume_generation := credential_row.resume_generation + 1;
            resume_token := private_table_private.derive_token(
                'resume', room_id, p_actor_id, null, resume_generation
            );
            update private_table_private.member_credentials
            set session_id = p_session_id,
                resume_generation = dispatch.resume_generation,
                resume_token_hash = extensions.digest(
                    convert_to(resume_token, 'UTF8'), 'sha256'
                )
            where member_credentials.room_id = dispatch.room_id
              and actor_id = p_actor_id;
            update public.private_table_room_members
            set status = case when ready then 'ready' else 'joined' end,
                last_seen_at = statement_timestamp()
            where private_table_room_members.room_id = dispatch.room_id
              and actor_id = p_actor_id;

            event := private_table_private.append_event(
                room_id,
                p_actor_id,
                'member_resumed',
                jsonb_build_object('memberId', p_actor_id::text)
            );
            token_kind := 'resume';
            token_generation := resume_generation;

        else
            select member.* into member_row
            from public.private_table_room_members member
            join private_table_private.member_credentials credential
              using (room_id, actor_id)
            where member.room_id = dispatch.room_id
              and member.actor_id = p_actor_id
              and member.status not in ('left', 'disconnected')
              and credential.session_id = p_session_id;

            if not found then
                perform private_table_private.raise_protocol_error(
                    'stale_session',
                    'session is missing or stale'
                );
            end if;

            if command_type = 'set_ready' then
                if room_row.status <> 'lobby' then
                    perform private_table_private.raise_protocol_error(
                        'invalid_transition',
                        'readiness can change only while the room is in the lobby'
                    );
                end if;
                ready_value := coalesce(payload -> 'ready' = 'true'::jsonb, false);
                update public.private_table_room_members
                set ready = ready_value,
                    status = case when ready_value then 'ready' else 'joined' end,
                    last_seen_at = statement_timestamp()
                where private_table_room_members.room_id = dispatch.room_id
                  and actor_id = p_actor_id;
                event := private_table_private.append_event(
                    room_id,
                    p_actor_id,
                    case when ready_value
                        then 'member_ready'
                        else 'member_unready'
                    end,
                    jsonb_build_object('memberId', p_actor_id::text)
                );

            elsif command_type = 'start_match' then
                if room_row.host_actor_id <> p_actor_id then
                    perform private_table_private.raise_protocol_error(
                        'host_required',
                        'only the room host can perform this command'
                    );
                end if;
                if room_row.status <> 'lobby' then
                    perform private_table_private.raise_protocol_error(
                        'invalid_transition',
                        'match can start only from the lobby'
                    );
                end if;
                select count(*), bool_and(ready)
                into active_count, all_ready
                from public.private_table_room_members
                where private_table_room_members.room_id = dispatch.room_id
                  and status in ('joined', 'ready');
                if active_count <> 2 or not coalesce(all_ready, false) then
                    perform private_table_private.raise_protocol_error(
                        'members_not_ready',
                        'exactly two joined members must be ready'
                    );
                end if;
                update public.private_table_rooms
                set status = 'active'
                where id = room_id;
                event := private_table_private.append_event(
                    room_id,
                    p_actor_id,
                    'match_started',
                    jsonb_build_object(
                        'memberIds', (
                            select jsonb_agg(actor_id::text order by joined_at, actor_id)
                            from public.private_table_room_members
                            where private_table_room_members.room_id = dispatch.room_id
                              and status in ('joined', 'ready')
                        )
                    )
                );

            elsif command_type = 'disconnect' then
                update public.private_table_room_members
                set status = 'disconnected',
                    last_seen_at = statement_timestamp()
                where private_table_room_members.room_id = dispatch.room_id
                  and actor_id = p_actor_id;
                event := private_table_private.append_event(
                    room_id,
                    p_actor_id,
                    'member_disconnected',
                    jsonb_build_object('memberId', p_actor_id::text)
                );

            elsif command_type = 'leave_room' then
                update public.private_table_room_members
                set status = 'left',
                    ready = false,
                    left_at = statement_timestamp(),
                    last_seen_at = statement_timestamp()
                where private_table_room_members.room_id = dispatch.room_id
                  and actor_id = p_actor_id;
                update private_table_private.member_credentials
                set session_id = null,
                    resume_token_hash = null
                where member_credentials.room_id = dispatch.room_id
                  and actor_id = p_actor_id;
                event := private_table_private.append_event(
                    room_id,
                    p_actor_id,
                    'member_left',
                    jsonb_build_object('memberId', p_actor_id::text)
                );

            elsif command_type = 'close_room' then
                if room_row.host_actor_id <> p_actor_id then
                    perform private_table_private.raise_protocol_error(
                        'host_required',
                        'only the room host can perform this command'
                    );
                end if;
                if char_length(btrim(coalesce(payload ->> 'reason', 'host_closed')))
                   not between 1 and 64 then
                    perform private_table_private.raise_protocol_error(
                        'invalid_command',
                        'close reason must be at most 64 characters'
                    );
                end if;
                update public.private_table_rooms
                set status = 'closed',
                    closed_at = statement_timestamp(),
                    delete_after = statement_timestamp() + interval '24 hours'
                where id = room_id;
                event := private_table_private.append_event(
                    room_id,
                    p_actor_id,
                    'room_closed',
                    jsonb_build_object(
                        'reason', btrim(coalesce(payload ->> 'reason', 'host_closed'))
                    )
                );

            elsif command_type in ('mute_member', 'block_member', 'report_member') then
                begin
                    target_actor_id := (payload ->> 'targetId')::uuid;
                exception when invalid_text_representation or null_value_not_allowed then
                    perform private_table_private.raise_protocol_error(
                        'invalid_target',
                        'targetId must identify another room member'
                    );
                end;
                if target_actor_id = p_actor_id or not exists (
                    select 1
                    from public.private_table_room_members
                    where private_table_room_members.room_id = dispatch.room_id
                      and actor_id = target_actor_id
                      and status <> 'left'
                ) then
                    perform private_table_private.raise_protocol_error(
                        'invalid_target',
                        'targetId must identify another active room member'
                    );
                end if;

                should_broadcast := false;
                if command_type = 'mute_member' then
                    update private_table_private.member_credentials
                    set muted_actor_ids = case
                        when target_actor_id = any(muted_actor_ids)
                            then muted_actor_ids
                        else array_append(muted_actor_ids, target_actor_id)
                    end
                    where member_credentials.room_id = dispatch.room_id
                      and actor_id = p_actor_id;
                    event := private_table_private.append_event(
                        room_id,
                        p_actor_id,
                        'member_muted',
                        jsonb_build_object(
                            'targetId', target_actor_id::text,
                            'audience', p_actor_id::text
                        )
                    );
                elsif command_type = 'block_member' then
                    update private_table_private.member_credentials
                    set blocked_actor_ids = case
                        when target_actor_id = any(blocked_actor_ids)
                            then blocked_actor_ids
                        else array_append(blocked_actor_ids, target_actor_id)
                    end
                    where member_credentials.room_id = dispatch.room_id
                      and actor_id = p_actor_id;
                    event := private_table_private.append_event(
                        room_id,
                        p_actor_id,
                        'member_blocked',
                        jsonb_build_object(
                            'targetId', target_actor_id::text,
                            'audience', p_actor_id::text
                        )
                    );
                else
                    if coalesce(payload ->> 'category', '') not in (
                        'harassment',
                        'spam',
                        'cheating',
                        'unsafe_profile',
                        'other'
                    ) then
                        perform private_table_private.raise_protocol_error(
                            'invalid_report_category',
                            'report category is not supported'
                        );
                    end if;
                    report_id := extensions.gen_random_uuid();
                    insert into private_table_private.reports(
                        id,
                        room_id,
                        reporter_actor_id,
                        target_actor_id,
                        category
                    ) values (
                        report_id,
                        room_id,
                        p_actor_id,
                        target_actor_id,
                        payload ->> 'category'
                    );
                    event := private_table_private.append_event(
                        room_id,
                        p_actor_id,
                        'member_reported',
                        jsonb_build_object(
                            'reportId', report_id::text,
                            'targetId', target_actor_id::text,
                            'category', payload ->> 'category',
                            'audience', p_actor_id::text
                        )
                    );
                end if;

            elsif command_type in ('request_roll', 'request_move') then
                perform private_table_private.raise_protocol_error(
                    'trusted_gameplay_not_ready',
                    'hosted dice and moves remain disabled until the rule engine is server-authoritative'
                );
            else
                perform private_table_private.raise_protocol_error(
                    'unknown_command',
                    'unknown private-table command: ' || command_type
                );
            end if;
        end if;
    end if;

    safe_result := jsonb_build_object(
        'events', jsonb_build_array(event),
        'snapshot', private_table_private.snapshot(room_id, p_actor_id),
        'replayed', false
    );

    if token_kind = 'invite' then
        safe_result := safe_result || jsonb_build_object(
            'invitation', jsonb_build_object(
                'inviteId', invite_id::text,
                'inviteToken', null,
                'expiresAt', event #> '{payload,expiresAt}'
            )
        );
    elsif report_id is not null then
        safe_result := safe_result || jsonb_build_object(
            'reportId', report_id::text
        );
    end if;

    insert into private_table_private.processed_commands(
        actor_id,
        command_id,
        fingerprint,
        room_id,
        safe_result,
        token_kind,
        token_reference,
        token_generation
    ) values (
        p_actor_id,
        command_id,
        fingerprint,
        room_id,
        safe_result,
        token_kind,
        token_reference,
        token_generation
    );

    -- A newly provisioned trial can temporarily lack Supabase's managed
    -- realtime.send function. Persist canonical state regardless, and publish
    -- only when the provider-owned Realtime migration is actually present.
    if should_broadcast and to_regprocedure(
        'realtime.send(jsonb,text,text,boolean)'
    ) is not null then
        perform realtime.send(
            jsonb_build_object(
                'roomId', room_id::text,
                'revision', event -> 'revision',
                'lastEventSequence', event -> 'eventSequence',
                'event', event
            ),
            'private_table_event',
            'private-table:' || room_id::text,
            true
        );
    end if;

    result := private_table_private.attach_sensitive_token(
        safe_result,
        token_kind,
        room_id,
        p_actor_id,
        token_reference,
        token_generation
    );
    return result;
end;
$$;

create or replace function public.private_table_snapshot(
    p_actor_id uuid,
    p_room_id uuid,
    p_session_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, private_table_private
as $$
declare
    result jsonb;
begin
    if not exists (
        select 1
        from public.private_table_room_members member
        join private_table_private.member_credentials credential
          using (room_id, actor_id)
        join public.private_table_rooms room on room.id = member.room_id
        where member.room_id = p_room_id
          and member.actor_id = p_actor_id
          and member.status not in ('left', 'disconnected')
          and room.status <> 'closed'
          and credential.session_id = p_session_id
    ) then
        perform private_table_private.raise_protocol_error(
            'stale_session',
            'session is missing or stale'
        );
    end if;

    result := private_table_private.snapshot(p_room_id, p_actor_id);
    if result is null then
        perform private_table_private.raise_protocol_error(
            'room_not_found',
            'room does not exist'
        );
    end if;
    return result;
end;
$$;

create or replace function public.private_table_purge_expired()
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
    deleted_count integer;
begin
    with deleted as (
        delete from public.private_table_rooms
        where status = 'closed'
          and delete_after <= statement_timestamp()
        returning 1
    )
    select count(*) into deleted_count from deleted;
    return deleted_count;
end;
$$;

revoke all on all functions in schema private_table_private
    from public, anon, authenticated;
grant execute on all functions in schema private_table_private
    to service_role;

revoke all on function public.private_table_dispatch(uuid, text, jsonb)
    from public, anon, authenticated;
revoke all on function public.private_table_snapshot(uuid, uuid, text)
    from public, anon, authenticated;
revoke all on function public.private_table_purge_expired()
    from public, anon, authenticated;

grant execute on function public.private_table_dispatch(uuid, text, jsonb)
    to service_role;
grant execute on function public.private_table_snapshot(uuid, uuid, text)
    to service_role;
grant execute on function public.private_table_purge_expired()
    to service_role;

alter table realtime.messages enable row level security;

create policy nardora_private_table_receive
on realtime.messages
for select
to authenticated
using (
    extension in ('broadcast', 'presence')
    and exists (
        select 1
        from public.private_table_room_members member
        where member.actor_id = (select auth.uid())
          and member.status <> 'left'
          and (select realtime.topic()) =
              'private-table:' || member.room_id::text
    )
);

-- Clients may publish only outcome-neutral Presence. Accepted room/game events
-- are sent by the trusted transaction; no client Broadcast INSERT is granted.
create policy nardora_private_table_presence_send
on realtime.messages
for insert
to authenticated
with check (
    extension = 'presence'
    and exists (
        select 1
        from public.private_table_room_members member
        where member.actor_id = (select auth.uid())
          and member.status <> 'left'
          and (select realtime.topic()) =
              'private-table:' || member.room_id::text
    )
);

comment on schema private_table_private is
    'Nardora server-only data. Never expose through the client API.';
comment on function public.private_table_dispatch(uuid, text, jsonb) is
    'Trusted private-table lifecycle dispatcher. Edge Function supplies verified actor ID.';
comment on function public.private_table_purge_expired() is
    'Deletes closed synthetic trial rooms after their 24-hour retention window.';
