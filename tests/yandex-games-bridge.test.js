import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createYandexGamesBridge,
    isYandexGamesEnvironment
} from '../engine/yandexGamesBridge.js';

function createDocumentDouble() {
    const attributes = new Map();
    const gameContainer = {
        inert: false,
        setAttribute: (name, value) => attributes.set(name, value)
    };
    const body = {
        setAttribute: (name, value) => attributes.set(name, value),
        toggleAttribute: (name, enabled) => {
            if (enabled) attributes.set(name, '');
            else attributes.delete(name);
        }
    };
    return {
        attributes,
        documentRef: {
            body,
            getElementById: id => id === 'game-container' ? gameContainer : null
        },
        gameContainer
    };
}

test('Yandex adapter activates only for Yandex hosts or an explicit platform flag', () => {
    assert.equal(isYandexGamesEnvironment({ hostname: 'metingames.github.io', search: '' }), false);
    assert.equal(isYandexGamesEnvironment({ hostname: 'games.yandex.com', search: '' }), true);
    assert.equal(isYandexGamesEnvironment({ hostname: 'example.test', search: '?platform=yandex' }), true);
});

test('fullscreen ads block controls and always restore gameplay on close', async () => {
    const calls = [];
    const { documentRef, gameContainer, attributes } = createDocumentDouble();
    const sdk = {
        adv: {
            showFullscreenAdv({ callbacks }) {
                calls.push('ad');
                assert.equal(gameContainer.inert, true);
                callbacks.onClose(true);
            }
        },
        features: {
            GameplayAPI: {
                start: () => calls.push('start'),
                stop: () => calls.push('stop')
            },
            LoadingAPI: { ready: () => calls.push('ready') }
        }
    };
    const bridge = createYandexGamesBridge({
        documentRef,
        locationLike: { hostname: 'games.yandex.com', search: '' },
        loadSdk: async () => ({ init: async () => sdk })
    });

    await bridge.initialize();
    bridge.markReady();
    assert.equal(await bridge.showFullscreenAd(), true);
    assert.equal(gameContainer.inert, false);
    assert.equal(attributes.has('data-platform-input-blocked'), false);
    assert.deepEqual(calls, ['ready', 'stop', 'ad', 'start']);
});

test('SDK and ad failures never leave game controls blocked', async () => {
    const { documentRef, gameContainer } = createDocumentDouble();
    const bridge = createYandexGamesBridge({
        documentRef,
        locationLike: { hostname: 'games.yandex.com', search: '' },
        loadSdk: async () => ({
            init: async () => ({
                adv: { showFullscreenAdv: () => { throw new Error('ad failed'); } }
            })
        })
    });

    await bridge.initialize();
    assert.equal(await bridge.showFullscreenAd(), false);
    assert.equal(gameContainer.inert, false);
});
