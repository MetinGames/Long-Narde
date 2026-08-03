import test from 'node:test';
import assert from 'node:assert/strict';

import {
    BUILT_IN_AVATARS,
    DEFAULT_AVATAR_ID,
    LEGACY_PLAYER_IDENTITY_STORAGE_KEY,
    PLAYER_IDENTITY_SCHEMA_VERSION,
    PLAYER_IDENTITY_STORAGE_KEY,
    PlayerIdentityStore,
    sanitizePlayerIdentity,
    toPrivateTableIdentity
} from '../engine/playerIdentity.js';
import {
    InMemoryPrivateTableAdapter,
    TABLE_COMMAND,
    createPrivateTableCommand
} from '../engine/privateTableProtocol.js';

class FakeStorage {
    constructor(initial = {}) {
        this.store = { ...initial };
    }

    getItem(key) {
        return Object.prototype.hasOwnProperty.call(this.store, key)
            ? this.store[key]
            : null;
    }

    setItem(key, value) {
        this.store[key] = String(value);
    }

    removeItem(key) {
        delete this.store[key];
    }
}

class ThrowingStorage extends FakeStorage {
    getItem() {
        throw new Error('storage unavailable');
    }

    setItem() {
        throw new Error('storage unavailable');
    }
}

class ThrowingSetStorage extends FakeStorage {
    setItem() {
        throw new Error('storage full');
    }
}

const fixedIdFactory = () => 'local-test-player';

test('identity schema and built-in avatar catalog are stable and versioned', () => {
    assert.equal(PLAYER_IDENTITY_SCHEMA_VERSION, 1);
    assert.equal(PLAYER_IDENTITY_STORAGE_KEY, 'nardora.playerIdentity.v1');
    assert.equal(BUILT_IN_AVATARS.length, 15);
    assert.equal(new Set(BUILT_IN_AVATARS.map(avatar => avatar.id)).size, 15);
});

test('new local identity is persisted without remote or personal-data fields', () => {
    const storage = new FakeStorage();
    const store = new PlayerIdentityStore({ storage, idFactory: fixedIdFactory });

    const identity = store.load();
    assert.deepEqual(identity, {
        schemaVersion: 1,
        id: 'local-test-player',
        displayName: 'Nardora Player',
        avatarId: DEFAULT_AVATAR_ID
    });
    assert.deepEqual(JSON.parse(storage.store[PLAYER_IDENTITY_STORAGE_KEY]), identity);
});

test('display name and avatar are sanitized and unknown fields are discarded', () => {
    const identity = sanitizePlayerIdentity({
        schemaVersion: 99,
        id: 'local-existing-player',
        displayName: '   Metin    Usta   ',
        avatarId: 'avatar-eagle',
        email: 'must-not-persist@example.com',
        rating: 9999,
        photoUrl: 'https://example.com/photo.png'
    }, { idFactory: fixedIdFactory });

    assert.deepEqual(identity, {
        schemaVersion: 1,
        id: 'local-existing-player',
        displayName: 'Metin Usta',
        avatarId: 'avatar-eagle'
    });
    assert.equal('email' in identity, false);
    assert.equal('rating' in identity, false);
    assert.equal('photoUrl' in identity, false);
});

test('invalid values fall back safely and long names are bounded', () => {
    const identity = sanitizePlayerIdentity({
        id: '../unsafe',
        displayName: '123456789012345678901234567890',
        avatarId: 'custom-photo'
    }, { idFactory: fixedIdFactory });

    assert.equal(identity.id, 'local-test-player');
    assert.equal(identity.displayName, '123456789012345678901234');
    assert.equal(identity.avatarId, DEFAULT_AVATAR_ID);
});

test('legacy profile shape migrates into the versioned local identity key', () => {
    const storage = new FakeStorage({
        [LEGACY_PLAYER_IDENTITY_STORAGE_KEY]: JSON.stringify({
            id: 'local-legacy-player',
            name: 'Eski Oyuncu',
            avatar: 'avatar-wolf'
        })
    });
    const store = new PlayerIdentityStore({ storage, idFactory: fixedIdFactory });

    const identity = store.load();
    assert.equal(identity.displayName, 'Eski Oyuncu');
    assert.equal(identity.avatarId, 'avatar-wolf');
    assert.ok(storage.store[PLAYER_IDENTITY_STORAGE_KEY]);
    assert.equal(storage.store[LEGACY_PLAYER_IDENTITY_STORAGE_KEY], undefined);
});

test('broken or unavailable storage keeps a stable in-memory fallback', () => {
    const store = new PlayerIdentityStore({
        storage: new ThrowingStorage(),
        idFactory: fixedIdFactory
    });

    assert.deepEqual(store.load(), store.load());
    assert.equal(store.save({ displayName: 'Metin', avatarId: 'avatar-dice' }).displayName, 'Metin');
});

test('write-only storage failure does not rotate the local id on every load', () => {
    let counter = 0;
    const store = new PlayerIdentityStore({
        storage: new ThrowingSetStorage(),
        idFactory: () => `local-memory-player-${++counter}`
    });

    const first = store.load();
    const second = store.load();
    assert.equal(first.id, 'local-memory-player-1');
    assert.equal(second.id, first.id);
    assert.equal(counter, 1);
});

test('reset creates a fresh default identity and clears both storage keys', () => {
    let counter = 0;
    const storage = new FakeStorage({
        [LEGACY_PLAYER_IDENTITY_STORAGE_KEY]: '{}'
    });
    const store = new PlayerIdentityStore({
        storage,
        idFactory: () => `local-reset-player-${++counter}`
    });
    store.save({
        id: 'local-before-reset',
        displayName: 'Metin',
        avatarId: 'avatar-lion'
    });

    const reset = store.reset();
    assert.equal(reset.id, 'local-reset-player-1');
    assert.equal(reset.displayName, 'Nardora Player');
    assert.equal(reset.avatarId, DEFAULT_AVATAR_ID);
    assert.equal(storage.store[LEGACY_PLAYER_IDENTITY_STORAGE_KEY], undefined);
});

test('private-table projection exposes exactly the v1 identity boundary', () => {
    const projection = toPrivateTableIdentity({
        schemaVersion: 1,
        id: 'local-table-player',
        displayName: 'Metin',
        avatarId: 'avatar-dice',
        achievements: ['first-win'],
        stats: { wins: 42 }
    }, { idFactory: fixedIdFactory });

    assert.deepEqual(projection, {
        id: 'local-table-player',
        displayName: 'Metin',
        avatarId: 'avatar-dice'
    });

    const adapter = new InMemoryPrivateTableAdapter({
        now: () => 1000,
        idFactory: prefix => `${prefix}-identity-test`
    });
    const result = adapter.dispatch(createPrivateTableCommand({
        type: TABLE_COMMAND.CREATE_ROOM,
        actorId: projection.id,
        sessionId: 'session-local-profile',
        commandId: 'command-local-profile',
        idempotencyKey: 'create-local-profile',
        expectedRevision: 0,
        payload: { identity: projection }
    }));

    assert.deepEqual(result.snapshot.members[0].identity, projection);
});
