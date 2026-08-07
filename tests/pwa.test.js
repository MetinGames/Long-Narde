import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {
    activateWaitingServiceWorker,
    isServiceWorkerContextAllowed,
    reloadOnServiceWorkerControllerChange,
    registerNardoraServiceWorker,
    scheduleNardoraServiceWorkerRegistration
} from '../engine/pwa.js';

const root = path.resolve('./');

function readPngDimensions(filePath) {
    const image = fs.readFileSync(filePath);
    const signature = image.subarray(0, 8).toString('hex');
    assert.equal(signature, '89504e470d0a1a0a', `${filePath} is not a PNG`);
    return {
        width: image.readUInt32BE(16),
        height: image.readUInt32BE(20)
    };
}

function createServiceWorkerHarness() {
    const handlers = new Map();
    const addedRequests = [];
    const deletedCaches = [];
    let clientsClaimed = 0;
    let skipWaitingCalls = 0;

    const cache = {
        async addAll(requests) {
            addedRequests.push(...requests);
        },
        async match(request) {
            const url = typeof request === 'string' ? request : request.url;
            return url.endsWith('/index.html') ? { source: 'cache' } : null;
        }
    };

    class FakeRequest {
        constructor(url, options = {}) {
            this.url = url;
            this.method = options.method ?? 'GET';
            this.mode = options.mode ?? 'same-origin';
            this.cache = options.cache;
        }
    }

    const selfRef = {
        registration: {
            scope: 'https://example.test/Long-Narde/'
        },
        location: {
            origin: 'https://example.test'
        },
        clients: {
            async claim() {
                clientsClaimed += 1;
            }
        },
        async skipWaiting() {
            skipWaitingCalls += 1;
        },
        addEventListener(type, handler) {
            handlers.set(type, handler);
        }
    };

    const cachesRef = {
        async open() {
            return cache;
        },
        async keys() {
            return [
                'nardora-offline-v0',
                'nardora-offline-v1-2026-08-03',
                'nardora-offline-v2-2026-08-03',
                'nardora-offline-v3-2026-08-03',
                'nardora-offline-v4-2026-08-03',
                'nardora-offline-v5-2026-08-03',
                'nardora-offline-v6-2026-08-03',
                'unrelated-cache'
            ];
        },
        async delete(name) {
            deletedCaches.push(name);
            return true;
        }
    };

    const source = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
    vm.runInNewContext(source, {
        self: selfRef,
        caches: cachesRef,
        Request: FakeRequest,
        URL,
        fetch: async request => ({ source: 'network', request })
    });

    return {
        handlers,
        addedRequests,
        deletedCaches,
        get clientsClaimed() {
            return clientsClaimed;
        },
        get skipWaitingCalls() {
            return skipWaitingCalls;
        }
    };
}

test('manifest exposes installable metadata and correctly sized icons', () => {
    const manifest = JSON.parse(fs.readFileSync(
        path.join(root, 'manifest.webmanifest'),
        'utf8'
    ));

    assert.equal(manifest.name, 'Nardora: Long Narde Game');
    assert.equal(manifest.short_name, 'Nardora');
    assert.equal(manifest.start_url, './');
    assert.equal(manifest.scope, './');
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.prefer_related_applications, false);

    const requiredIcons = new Map([
        ['192x192', 'any'],
        ['512x512', 'any']
    ]);

    for (const [size, purpose] of requiredIcons) {
        const icon = manifest.icons.find(candidate =>
            candidate.sizes === size && candidate.purpose === purpose
        );
        assert.ok(icon, `Missing ${size} ${purpose} icon`);
        const filePath = path.join(root, icon.src.replace(/^\.\//, ''));
        assert.ok(fs.existsSync(filePath), `Missing icon file ${icon.src}`);

        const expectedSize = Number(size.split('x')[0]);
        assert.deepEqual(readPngDimensions(filePath), {
            width: expectedSize,
            height: expectedSize
        });
    }

    const maskable = manifest.icons.find(icon => icon.purpose === 'maskable');
    assert.ok(maskable, 'Missing maskable icon');
    assert.deepEqual(
        readPngDimensions(path.join(root, maskable.src.replace(/^\.\//, ''))),
        { width: 512, height: 512 }
    );
});

test('index links PWA metadata and the service worker bootstrap', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.match(html, /<link rel="manifest" href="\.\/manifest\.webmanifest">/);
    assert.match(html, /<meta name="theme-color" content="#3b2415">/);
    assert.match(html, /<link rel="apple-touch-icon" href="\.\/assets\/branding\/icons\/apple-touch-icon\.png">/);
    assert.match(html, /<link rel="stylesheet" href="theme-manager\.css">/);
    assert.match(html, /<link rel="stylesheet" href="checker-color-picker\.css">/);
    assert.match(html, /<link rel="stylesheet" href="game-helpers\.css">/);
    assert.match(html, /<link rel="stylesheet" href="helper-mascot\.css">/);
    assert.match(html, /<script type="module" src="\.\/engine\/pwa\.js"><\/script>/);
});

test('service worker precaches the complete local-play shell atomically', async () => {
    const harness = createServiceWorkerHarness();
    assert.deepEqual(
        [...harness.handlers.keys()].sort(),
        ['activate', 'fetch', 'install', 'message']
    );

    let installPromise;
    harness.handlers.get('install')({
        waitUntil(promise) {
            installPromise = promise;
        }
    });
    await installPromise;
    assert.equal(harness.skipWaitingCalls, 1);

    const cachedPaths = harness.addedRequests.map(request => {
        assert.equal(request.cache, 'reload');
        return new URL(request.url).pathname.replace('/Long-Narde/', '');
    });

    const cachedFilePaths = cachedPaths.filter(Boolean);
    for (const relativePath of cachedFilePaths) {
        assert.ok(
            fs.existsSync(path.join(root, relativePath)),
            `Precached file does not exist: ${relativePath}`
        );
    }

    const engineFiles = fs.readdirSync(path.join(root, 'engine'))
        .filter(fileName => fileName.endsWith('.js'))
        .map(fileName => `engine/${fileName}`)
        .sort();
    assert.deepEqual(
        cachedFilePaths.filter(filePath => filePath.startsWith('engine/')).sort(),
        engineFiles
    );
});

test('service worker removes only old Nardora caches and claims clients', async () => {
    const harness = createServiceWorkerHarness();
    let activatePromise;
    harness.handlers.get('activate')({
        waitUntil(promise) {
            activatePromise = promise;
        }
    });
    await activatePromise;

    assert.deepEqual(harness.deletedCaches, [
        'nardora-offline-v0',
        'nardora-offline-v1-2026-08-03',
        'nardora-offline-v2-2026-08-03',
        'nardora-offline-v3-2026-08-03',
        'nardora-offline-v4-2026-08-03',
        'nardora-offline-v5-2026-08-03',
        'nardora-offline-v6-2026-08-03'
    ]);
    assert.equal(harness.clientsClaimed, 1);

    harness.handlers.get('message')({ data: { type: 'IGNORE' } });
    assert.equal(harness.skipWaitingCalls, 0);
    harness.handlers.get('message')({ data: { type: 'SKIP_WAITING' } });
    await Promise.resolve();
    assert.equal(harness.skipWaitingCalls, 1);
});

test('service worker serves cached app shell for same-origin navigation only', async () => {
    const harness = createServiceWorkerHarness();
    let responsePromise;
    harness.handlers.get('fetch')({
        request: {
            method: 'GET',
            mode: 'navigate',
            url: 'https://example.test/Long-Narde/'
        },
        respondWith(promise) {
            responsePromise = promise;
        }
    });
    assert.deepEqual(await responsePromise, { source: 'cache' });

    let externalIntercepted = false;
    harness.handlers.get('fetch')({
        request: {
            method: 'GET',
            mode: 'cors',
            url: 'https://github.com/MetinGames/Long-Narde/issues'
        },
        respondWith() {
            externalIntercepted = true;
        }
    });
    assert.equal(externalIntercepted, false);
});

test('PWA registration is limited to secure or local contexts', () => {
    assert.equal(isServiceWorkerContextAllowed({
        protocol: 'https:',
        hostname: 'metingames.github.io'
    }), true);
    assert.equal(isServiceWorkerContextAllowed({
        protocol: 'http:',
        hostname: '127.0.0.1'
    }), true);
    assert.equal(isServiceWorkerContextAllowed({
        protocol: 'http:',
        hostname: 'example.test'
    }), false);
});

test('registration uses Pages-safe scope and activates an already waiting update', async () => {
    const controllerChangeListeners = [];
    const messages = [];
    let reloads = 0;
    let registeredUrl;
    let registeredOptions;
    const registration = {
        waiting: {
            postMessage(message) {
                messages.push(message);
            }
        },
        update() {
            throw new Error('waiting updates should activate before another update check');
        }
    };
    const serviceWorkerContainer = {
        controller: {},
        async register(url, options) {
            registeredUrl = url;
            registeredOptions = options;
            return registration;
        },
        addEventListener(type, listener, options) {
            controllerChangeListeners.push({ type, listener, options });
        }
    };
    const locationRef = {
        protocol: 'https:',
        hostname: 'metingames.github.io',
        reload() {
            reloads += 1;
        }
    };

    const result = await registerNardoraServiceWorker({
        navigatorRef: { serviceWorker: serviceWorkerContainer },
        locationRef,
        scriptUrl: new URL('https://metingames.github.io/Long-Narde/service-worker.js'),
        scopeUrl: new URL('https://metingames.github.io/Long-Narde/')
    });

    assert.equal(result, registration);
    assert.equal(
        registeredUrl,
        'https://metingames.github.io/Long-Narde/service-worker.js'
    );
    assert.deepEqual(registeredOptions, {
        scope: '/Long-Narde/',
        updateViaCache: 'none'
    });
    assert.deepEqual(messages, [{ type: 'SKIP_WAITING' }]);
    assert.equal(controllerChangeListeners.length, 1);
    assert.equal(controllerChangeListeners[0].type, 'controllerchange');
    assert.deepEqual(controllerChangeListeners[0].options, { once: true });

    controllerChangeListeners[0].listener();
    controllerChangeListeners[0].listener();
    assert.equal(reloads, 1);
});

test('active pages reload once when a newly installed worker takes control', () => {
    const controllerChangeListeners = [];
    let reloads = 0;
    const serviceWorkerContainer = {
        controller: {},
        addEventListener(type, listener, options) {
            controllerChangeListeners.push({ type, listener, options });
        }
    };
    const locationRef = {
        reload() {
            reloads += 1;
        }
    };

    assert.equal(reloadOnServiceWorkerControllerChange({
        serviceWorkerContainer,
        locationRef
    }), true);
    assert.equal(reloadOnServiceWorkerControllerChange({
        serviceWorkerContainer,
        locationRef
    }), false);
    assert.equal(controllerChangeListeners.length, 1);
    assert.equal(controllerChangeListeners[0].type, 'controllerchange');
    assert.deepEqual(controllerChangeListeners[0].options, { once: true });

    controllerChangeListeners[0].listener();
    controllerChangeListeners[0].listener();
    assert.equal(reloads, 1);
});

test('registration and scheduling fail safely without blocking the game', async () => {
    const warned = [];
    const originalWarn = console.warn;
    console.warn = (...args) => warned.push(args);

    try {
        const result = await registerNardoraServiceWorker({
            navigatorRef: {
                serviceWorker: {
                    async register() {
                        throw new Error('registration blocked');
                    }
                }
            },
            locationRef: {
                protocol: 'https:',
                hostname: 'example.test'
            },
            scriptUrl: new URL('https://example.test/service-worker.js'),
            scopeUrl: new URL('https://example.test/')
        });
        assert.equal(result, null);
        assert.equal(warned.length, 1);
    } finally {
        console.warn = originalWarn;
    }

    let loadListener;
    let registrations = 0;
    const scheduled = scheduleNardoraServiceWorkerRegistration({
        windowRef: {
            addEventListener(type, listener, options) {
                assert.equal(type, 'load');
                assert.deepEqual(options, { once: true });
                loadListener = listener;
            }
        },
        documentRef: { readyState: 'loading' },
        register() {
            registrations += 1;
        }
    });
    assert.equal(scheduled, true);
    assert.equal(registrations, 0);
    loadListener();
    assert.equal(registrations, 1);
});

test('waiting update helper ignores incomplete registrations', () => {
    assert.equal(activateWaitingServiceWorker({
        registration: {},
        serviceWorkerContainer: { controller: {} },
        locationRef: {}
    }), false);
});
