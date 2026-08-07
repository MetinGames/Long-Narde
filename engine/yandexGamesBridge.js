const YANDEX_SDK_URL = '/sdk.js';

export function isYandexGamesEnvironment(locationLike = globalThis.location) {
    const hostname = String(locationLike?.hostname || '').toLowerCase();
    const params = new URLSearchParams(locationLike?.search || '');
    return hostname === 'yandex.com' ||
        hostname.endsWith('.yandex.com') ||
        hostname.endsWith('.yandex.ru') ||
        hostname.endsWith('.yandex.net') ||
        params.get('platform') === 'yandex';
}

export function loadYandexGamesSdk({
    documentRef = globalThis.document,
    yaGames = globalThis.YaGames,
    source = YANDEX_SDK_URL
} = {}) {
    if (yaGames?.init) return Promise.resolve(yaGames);
    if (!documentRef?.createElement) return Promise.resolve(null);

    return new Promise(resolve => {
        const existing = documentRef.querySelector?.('script[data-yandex-games-sdk]');
        const script = existing || documentRef.createElement('script');
        const settle = () => resolve(globalThis.YaGames || null);

        script.addEventListener?.('load', settle, { once: true });
        script.addEventListener?.('error', () => resolve(null), { once: true });

        if (!existing) {
            script.src = source;
            script.async = true;
            script.dataset.yandexGamesSdk = 'true';
            documentRef.head?.append(script);
        }
    });
}

export function createYandexGamesBridge({
    documentRef = globalThis.document,
    locationLike = globalThis.location,
    loadSdk = loadYandexGamesSdk
} = {}) {
    let sdk = null;
    let inputBlocked = false;

    const setInputBlocked = blocked => {
        inputBlocked = Boolean(blocked);
        const body = documentRef?.body;
        const gameContainer = documentRef?.getElementById?.('game-container');

        if (body) {
            body.toggleAttribute('data-platform-input-blocked', inputBlocked);
        }
        if (gameContainer) {
            gameContainer.inert = inputBlocked;
            gameContainer.setAttribute('aria-busy', String(inputBlocked));
        }
    };

    const initialize = async () => {
        if (!isYandexGamesEnvironment(locationLike)) return null;
        documentRef?.body?.setAttribute('data-platform', 'yandex');

        try {
            const yaGames = await loadSdk({ documentRef });
            sdk = yaGames?.init ? await yaGames.init() : null;
            return sdk;
        } catch {
            sdk = null;
            return null;
        }
    };

    const markReady = () => {
        try {
            sdk?.features?.LoadingAPI?.ready?.();
        } catch {
            // Platform telemetry never blocks the game.
        }
    };

    const setGameplayActive = active => {
        try {
            const gameplay = sdk?.features?.GameplayAPI;
            if (active) gameplay?.start?.();
            else gameplay?.stop?.();
        } catch {
            // Platform telemetry never blocks the game.
        }
    };

    const showFullscreenAd = () => new Promise(resolve => {
        if (!sdk?.adv?.showFullscreenAdv || inputBlocked) {
            resolve(false);
            return;
        }

        setGameplayActive(false);
        setInputBlocked(true);
        let settled = false;
        const finish = wasShown => {
            if (settled) return;
            settled = true;
            setInputBlocked(false);
            setGameplayActive(true);
            resolve(Boolean(wasShown));
        };

        try {
            sdk.adv.showFullscreenAdv({
                callbacks: {
                    onClose: finish,
                    onError: () => finish(false)
                }
            });
        } catch {
            finish(false);
        }
    });

    return {
        initialize,
        isInputBlocked: () => inputBlocked,
        markReady,
        setGameplayActive,
        showFullscreenAd
    };
}
