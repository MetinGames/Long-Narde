import test from 'node:test';
import assert from 'node:assert/strict';

import {
    MOBILE_THEME_LABEL_QUERY,
    createMobileThemeLabelController
} from '../engine/mobileThemeLabelController.js';

class FakeEventTarget {
    constructor() {
        this.listeners = new Map();
    }

    addEventListener(type, listener) {
        const listeners = this.listeners.get(type) ?? new Set();
        listeners.add(listener);
        this.listeners.set(type, listeners);
    }

    removeEventListener(type, listener) {
        this.listeners.get(type)?.delete(listener);
    }

    dispatch(type) {
        for (const listener of this.listeners.get(type) ?? []) {
            listener({ type, target: this });
        }
    }

    listenerCount(type) {
        return this.listeners.get(type)?.size ?? 0;
    }
}

class FakeSelect extends FakeEventTarget {
    constructor(options, value) {
        super();
        this.options = options;
        this.value = value;
    }

    get selectedOptions() {
        return this.options.filter(option => option.value === this.value);
    }

    select(value) {
        this.value = value;
        this.dispatch('change');
    }
}

class FakeMediaQueryList extends FakeEventTarget {
    constructor(matches) {
        super();
        this.matches = matches;
    }

    setMatches(matches) {
        this.matches = matches;
        this.dispatch('change');
    }
}

function createOptions() {
    return [
        { value: 'anatolian', textContent: 'Anatolian' },
        { value: 'walnut', textContent: 'Dark Walnut' }
    ];
}

test('mobile theme label compacts only the selected Anatolian option', () => {
    const options = createOptions();
    const select = new FakeSelect(options, 'anatolian');
    const mediaQueryList = new FakeMediaQueryList(true);
    let requestedQuery;
    const controller = createMobileThemeLabelController({
        select,
        windowRef: {
            matchMedia(query) {
                requestedQuery = query;
                return mediaQueryList;
            }
        }
    });

    assert.equal(controller.start(), true);
    assert.equal(requestedQuery, MOBILE_THEME_LABEL_QUERY);
    assert.equal(options[0].textContent, 'Anadolu');
    assert.equal(options[0].value, 'anatolian');
    assert.equal(options[1].textContent, 'Dark Walnut');

    select.select('walnut');
    assert.equal(options[0].textContent, 'Anatolian');
    assert.equal(options[1].textContent, 'Dark Walnut');

    select.select('anatolian');
    assert.equal(options[0].textContent, 'Anadolu');
});

test('media changes restore the full label outside compact landscape', () => {
    const options = createOptions();
    const select = new FakeSelect(options, 'anatolian');
    const mediaQueryList = new FakeMediaQueryList(true);
    const controller = createMobileThemeLabelController({
        select,
        windowRef: { matchMedia: () => mediaQueryList }
    });

    controller.start();
    mediaQueryList.setMatches(false);
    assert.equal(options[0].textContent, 'Anatolian');

    mediaQueryList.setMatches(true);
    assert.equal(options[0].textContent, 'Anadolu');
});

test('refresh preserves a newly translated full label for later restoration', () => {
    const options = createOptions();
    const select = new FakeSelect(options, 'anatolian');
    const mediaQueryList = new FakeMediaQueryList(true);
    const controller = createMobileThemeLabelController({
        select,
        windowRef: { matchMedia: () => mediaQueryList }
    });

    controller.start();
    options[0].textContent = 'Анатолия';
    assert.equal(controller.refresh(), true);
    assert.equal(options[0].textContent, 'Anadolu');

    mediaQueryList.setMatches(false);
    assert.equal(options[0].textContent, 'Анатолия');
});

test('start and stop own listeners without duplicates and support restart', () => {
    const options = createOptions();
    const select = new FakeSelect(options, 'anatolian');
    const mediaQueryList = new FakeMediaQueryList(true);
    const controller = createMobileThemeLabelController({
        select,
        windowRef: { matchMedia: () => mediaQueryList }
    });

    assert.equal(controller.start(), true);
    assert.equal(controller.start(), false);
    assert.equal(select.listenerCount('change'), 1);
    assert.equal(mediaQueryList.listenerCount('change'), 1);
    assert.equal(controller.isActive(), true);

    assert.equal(controller.stop(), true);
    assert.equal(controller.stop(), false);
    assert.equal(select.listenerCount('change'), 0);
    assert.equal(mediaQueryList.listenerCount('change'), 0);
    assert.equal(options[0].textContent, 'Anatolian');
    assert.equal(controller.isActive(), false);

    assert.equal(controller.start(), true);
    assert.equal(options[0].textContent, 'Anadolu');
});

test('legacy media listeners are removable and missing targets fail safely', () => {
    const options = createOptions();
    const select = new FakeSelect(options, 'anatolian');
    const legacyListeners = new Set();
    const legacyMediaQueryList = {
        matches: true,
        addEventListener() {
            throw new Error('modern change listener is unsupported');
        },
        removeEventListener() {},
        addListener(listener) {
            legacyListeners.add(listener);
        },
        removeListener(listener) {
            legacyListeners.delete(listener);
        }
    };
    const legacyController = createMobileThemeLabelController({
        select,
        windowRef: { matchMedia: () => legacyMediaQueryList }
    });

    assert.equal(legacyController.start(), true);
    assert.equal(legacyListeners.size, 1);
    assert.equal(legacyController.stop(), true);
    assert.equal(legacyListeners.size, 0);

    const missingController = createMobileThemeLabelController({
        select: null,
        windowRef: null
    });
    assert.equal(missingController.start(), false);
    assert.equal(missingController.refresh(), false);
    assert.equal(missingController.stop(), false);
});
