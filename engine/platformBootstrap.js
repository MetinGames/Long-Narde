import { createYandexGamesBridge } from './yandexGamesBridge.js';

export function bootstrapPlatform(options = {}) {
    const bridge = createYandexGamesBridge(options);
    const ready = bridge.initialize();

    return {
        ...bridge,
        ready,
        async markGameReady() {
            await ready;
            bridge.markReady();
        }
    };
}
