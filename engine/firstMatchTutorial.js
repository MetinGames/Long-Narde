export const FIRST_MATCH_TUTORIAL_STORAGE_KEY =
    'nardora-first-match-tutorial-v1';

const SEEN_VALUE = 'seen';

function getDefaultStorage() {
    try {
        return globalThis.localStorage || null;
    } catch {
        return null;
    }
}

export function createFirstMatchTutorialController({
    guide,
    storage = getDefaultStorage()
} = {}) {
    let autoOpenAttempted = false;

    const hasBeenSeen = () => {
        if (!storage || typeof storage.getItem !== 'function') {
            return false;
        }

        try {
            return storage.getItem(
                FIRST_MATCH_TUTORIAL_STORAGE_KEY
            ) === SEEN_VALUE;
        } catch {
            return false;
        }
    };

    const markAsSeen = () => {
        if (!storage || typeof storage.setItem !== 'function') {
            return false;
        }

        try {
            storage.setItem(
                FIRST_MATCH_TUTORIAL_STORAGE_KEY,
                SEEN_VALUE
            );
            return true;
        } catch {
            return false;
        }
    };

    const openIfNeeded = (triggerElement = null) => {
        if (
            autoOpenAttempted ||
            hasBeenSeen() ||
            !guide ||
            typeof guide.open !== 'function'
        ) {
            return false;
        }

        autoOpenAttempted = true;
        const opened = guide.open(triggerElement);
        if (opened === false) return false;

        markAsSeen();
        return true;
    };

    return Object.freeze({
        hasBeenSeen,
        openIfNeeded
    });
}
