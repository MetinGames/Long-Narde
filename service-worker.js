const CACHE_PREFIX = 'nardora-offline-';
const CACHE_VERSION = 'v6-2026-08-03';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

const PRECACHE_PATHS = [
    './',
    './index.html',
    './style.css',
    './manifest.webmanifest',
    './app.js',
    './assets/boards/anadolu-ustasi-board-v1.webp',
    './assets/branding/nardora-splash.css',
    './assets/branding/icons/nardora-icon.svg',
    './assets/branding/icons/nardora-192.png',
    './assets/branding/icons/nardora-512.png',
    './assets/branding/icons/nardora-maskable-512.png',
    './assets/branding/icons/apple-touch-icon.png',
    './assets/sounds/freesound_community-gamemisc_dice-roll-on-wood_jaku5-37414.mp3',
    './assets/sounds/sumaga123-wood-hit-432148.mp3',
    './engine/animations.js',
    './engine/appResumeController.js',
    './engine/appRuntimeState.js',
    './engine/assets.js',
    './engine/autoBearOff.js',
    './engine/board.js',
    './engine/bot.js',
    './engine/botCallbackController.js',
    './engine/botDifficultyController.js',
    './engine/botMoveFeedback.js',
    './engine/botTurnTouchFeedback.js',
    './engine/dice.js',
    './engine/feedbackModal.js',
    './engine/fullscreenController.js',
    './engine/game.js',
    './engine/gameFeedbackToast.js',
    './engine/howToPlayGuide.js',
    './engine/i18n.js',
    './engine/input.js',
    './engine/languageSelectors.js',
    './engine/layout.js',
    './engine/mobileThemeLabelController.js',
    './engine/nardoraSplash.js',
    './engine/noLegalMoveAutoPass.js',
    './engine/playerIdentity.js',
    './engine/playerStats.js',
    './engine/playerStatsModal.js',
    './engine/privateTableProtocol.js',
    './engine/pwa.js',
    './engine/renderer.js',
    './engine/restartButtonLock.js',
    './engine/runtimeDiagnostics.js',
    './engine/sound.js',
    './engine/startModeController.js',
    './engine/themes.js',
    './engine/timeoutController.js',
    './engine/uiManager.js',
    './engine/undoActionButtons.js',
    './engine/victoryMoment.js'
];

const scopedUrl = path => new URL(path, self.registration.scope).href;
const appShellUrl = scopedUrl('./index.html');

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        const requests = PRECACHE_PATHS.map(path => new Request(
            scopedUrl(path),
            { cache: 'reload' }
        ));
        await cache.addAll(requests);
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames
            .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map(name => caches.delete(name)));
        await self.clients.claim();
    })());
});

self.addEventListener('message', event => {
    if (event.data?.type === 'SKIP_WAITING') {
        void self.skipWaiting();
    }
});

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const requestUrl = new URL(request.url);
    if (requestUrl.origin !== self.location.origin) return;

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = request.mode === 'navigate'
            ? await cache.match(appShellUrl)
            : await cache.match(request);

        if (cachedResponse) return cachedResponse;
        return fetch(request);
    })());
});
