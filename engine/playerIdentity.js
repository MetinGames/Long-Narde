export const PLAYER_IDENTITY_SCHEMA_VERSION = 1;
export const PLAYER_IDENTITY_STORAGE_KEY = 'nardora.playerIdentity.v1';
export const LEGACY_PLAYER_IDENTITY_STORAGE_KEY = 'longNarde.playerProfile';
export const DEFAULT_AVATAR_ID = 'avatar-anatolia';

export const BUILT_IN_AVATARS = Object.freeze([
    { id: 'avatar-anatolia', glyph: '🧿', labelKey: 'avatar.anatolia' },
    { id: 'avatar-pottery', glyph: '🏺', labelKey: 'avatar.pottery' },
    { id: 'avatar-eagle', glyph: '🦅', labelKey: 'avatar.eagle' },
    { id: 'avatar-wolf', glyph: '🐺', labelKey: 'avatar.wolf' },
    { id: 'avatar-lion', glyph: '🦁', labelKey: 'avatar.lion' },
    { id: 'avatar-horse', glyph: '🐎', labelKey: 'avatar.horse' },
    { id: 'avatar-fox', glyph: '🦊', labelKey: 'avatar.fox' },
    { id: 'avatar-bear', glyph: '🐻', labelKey: 'avatar.bear' },
    { id: 'avatar-owl', glyph: '🦉', labelKey: 'avatar.owl' },
    { id: 'avatar-moon', glyph: '🌙', labelKey: 'avatar.moon' },
    { id: 'avatar-sun', glyph: '☀️', labelKey: 'avatar.sun' },
    { id: 'avatar-mountain', glyph: '⛰️', labelKey: 'avatar.mountain' },
    { id: 'avatar-sea', glyph: '🌊', labelKey: 'avatar.sea' },
    { id: 'avatar-robot', glyph: '🤖', labelKey: 'avatar.robot' },
    { id: 'avatar-dice', glyph: '🎲', labelKey: 'avatar.dice' }
]);

const avatarById = new Map(BUILT_IN_AVATARS.map(avatar => [avatar.id, avatar]));

function normalizeDisplayName(value) {
    const normalized = String(value ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 24);

    return normalized || 'Nardora Player';
}

function normalizeLocalId(value, idFactory) {
    const normalized = String(value ?? '').trim();
    if (/^local-[a-zA-Z0-9._:-]{4,58}$/.test(normalized)) {
        return normalized;
    }
    return idFactory();
}

function createRandomLocalId() {
    const randomUuid = globalThis.crypto?.randomUUID?.();
    if (randomUuid) return `local-${randomUuid}`;

    const timePart = Date.now().toString(36);
    const randomPart = Math.random().toString(36).slice(2, 12);
    return `local-${timePart}-${randomPart}`;
}

export function isBuiltInAvatarId(avatarId) {
    return avatarById.has(avatarId);
}

export function getBuiltInAvatar(avatarId) {
    return avatarById.get(avatarId) || avatarById.get(DEFAULT_AVATAR_ID);
}

export function createDefaultPlayerIdentity({ idFactory = createRandomLocalId } = {}) {
    return {
        schemaVersion: PLAYER_IDENTITY_SCHEMA_VERSION,
        id: idFactory(),
        displayName: 'Nardora Player',
        avatarId: DEFAULT_AVATAR_ID
    };
}

export function sanitizePlayerIdentity(raw, {
    idFactory = createRandomLocalId
} = {}) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const displayName = source.displayName ?? source.name;
    const avatarId = source.avatarId ?? source.avatar;

    return {
        schemaVersion: PLAYER_IDENTITY_SCHEMA_VERSION,
        id: normalizeLocalId(source.id, idFactory),
        displayName: normalizeDisplayName(displayName),
        avatarId: isBuiltInAvatarId(avatarId)
            ? avatarId
            : DEFAULT_AVATAR_ID
    };
}

export function toPrivateTableIdentity(identity, options = {}) {
    const sanitized = sanitizePlayerIdentity(identity, options);
    return {
        id: sanitized.id,
        displayName: sanitized.displayName,
        avatarId: sanitized.avatarId
    };
}

export class PlayerIdentityStore {
    constructor({
        storage = typeof localStorage !== 'undefined' ? localStorage : null,
        storageKey = PLAYER_IDENTITY_STORAGE_KEY,
        legacyStorageKey = LEGACY_PLAYER_IDENTITY_STORAGE_KEY,
        idFactory = createRandomLocalId
    } = {}) {
        this.storage = storage;
        this.storageKey = storageKey;
        this.legacyStorageKey = legacyStorageKey;
        this.idFactory = idFactory;
        this.memoryIdentity = null;
    }

    createDefault() {
        return createDefaultPlayerIdentity({ idFactory: this.idFactory });
    }

    sanitize(raw) {
        return sanitizePlayerIdentity(raw, { idFactory: this.idFactory });
    }

    load() {
        if (!this.storage) {
            if (!this.memoryIdentity) this.memoryIdentity = this.createDefault();
            return { ...this.memoryIdentity };
        }

        try {
            const current = this.storage.getItem(this.storageKey);
            const legacy = current
                ? null
                : this.storage.getItem(this.legacyStorageKey);
            const serialized = current || legacy;

            if (!serialized) {
                if (this.memoryIdentity) return { ...this.memoryIdentity };
                return this.save(this.createDefault());
            }

            const parsed = JSON.parse(serialized);
            const identity = this.sanitize(parsed);
            const needsMigration = Boolean(legacy) ||
                identity.schemaVersion !== parsed.schemaVersion;

            if (needsMigration) {
                this.save(identity);
                try {
                    this.storage.removeItem(this.legacyStorageKey);
                } catch {
                    // Migration cleanup failure must not block the profile.
                }
            }

            return identity;
        } catch {
            if (!this.memoryIdentity) this.memoryIdentity = this.createDefault();
            return { ...this.memoryIdentity };
        }
    }

    save(identity) {
        const sanitized = this.sanitize(identity);
        this.memoryIdentity = sanitized;

        if (this.storage) {
            try {
                this.storage.setItem(this.storageKey, JSON.stringify(sanitized));
            } catch {
                // Storage errors must not block local play.
            }
        }

        return { ...sanitized };
    }

    reset() {
        if (this.storage) {
            for (const key of [this.storageKey, this.legacyStorageKey]) {
                try {
                    this.storage.removeItem(key);
                } catch {
                    // Ignore storage cleanup failures.
                }
            }
        }

        this.memoryIdentity = this.createDefault();
        return this.save(this.memoryIdentity);
    }

    getPrivateTableIdentity() {
        return toPrivateTableIdentity(this.load(), {
            idFactory: this.idFactory
        });
    }
}
