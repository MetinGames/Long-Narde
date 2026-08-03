const LOCAL_SERVICE_WORKER_HOSTS = new Set([
    'localhost',
    '127.0.0.1',
    '[::1]'
]);

export function isServiceWorkerContextAllowed(locationRef = globalThis.location) {
    if (!locationRef) return false;

    return locationRef.protocol === 'https:' ||
        LOCAL_SERVICE_WORKER_HOSTS.has(locationRef.hostname);
}

export function activateWaitingServiceWorker({
    registration,
    serviceWorkerContainer,
    locationRef
}) {
    if (
        !registration?.waiting ||
        !serviceWorkerContainer?.controller ||
        typeof registration.waiting.postMessage !== 'function'
    ) {
        return false;
    }

    let reloadRequested = false;
    serviceWorkerContainer.addEventListener('controllerchange', () => {
        if (reloadRequested) return;
        reloadRequested = true;
        locationRef?.reload?.();
    }, { once: true });

    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    return true;
}

export async function registerNardoraServiceWorker({
    navigatorRef = globalThis.navigator,
    locationRef = globalThis.location,
    scriptUrl = new URL('../service-worker.js', import.meta.url),
    scopeUrl = new URL('../', import.meta.url)
} = {}) {
    const serviceWorkerContainer = navigatorRef?.serviceWorker;
    if (
        !serviceWorkerContainer ||
        !isServiceWorkerContextAllowed(locationRef)
    ) {
        return null;
    }

    try {
        const registration = await serviceWorkerContainer.register(
            scriptUrl.href,
            {
                scope: scopeUrl.pathname,
                updateViaCache: 'none'
            }
        );

        const activatedWaitingWorker = activateWaitingServiceWorker({
            registration,
            serviceWorkerContainer,
            locationRef
        });

        if (!activatedWaitingWorker) {
            registration.update?.().catch(() => {});
        }

        return registration;
    } catch (error) {
        console.warn('[Nardora PWA] Service worker registration failed.', error);
        return null;
    }
}

export function scheduleNardoraServiceWorkerRegistration({
    windowRef = globalThis.window,
    documentRef = globalThis.document,
    register = registerNardoraServiceWorker
} = {}) {
    if (!windowRef || !documentRef) return false;

    const runRegistration = () => {
        void register();
    };

    if (documentRef.readyState === 'complete') {
        runRegistration();
    } else {
        windowRef.addEventListener('load', runRegistration, { once: true });
    }

    return true;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    scheduleNardoraServiceWorkerRegistration();
}
