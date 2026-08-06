import test from 'node:test';
import assert from 'node:assert/strict';
import { createSoundPreferenceController } from '../engine/soundPreferenceController.js';

class FakeElement {
    constructor() {
        this.listeners = new Map();
        this.attributes = new Map();
        this.classList = { toggle: (name, active) => { this.mutedClass = name === 'is-muted' && active; } };
        this.value = '';
        this.disabled = false;
    }
    addEventListener(type, listener) { this.listeners.set(type, listener); }
    removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    async emit(type, value) { await this.listeners.get(type)?.({ target: value ?? this }); }
}

test('ses kontrolu mute ve volume durumunu erisilebilir olarak senkronlar', async () => {
    let enabled = true;
    let volume = 0.75;
    const sound = {
        isEnabled: () => enabled,
        getVolume: () => volume,
        toggleEnabled: async () => { enabled = !enabled; },
        setVolume: value => { volume = value; }
    };
    const button = new FakeElement();
    const slider = new FakeElement();
    const controller = createSoundPreferenceController({ sound, muteButton: button, volumeInput: slider, translate: key => `t:${key}` });

    controller.start();
    controller.start();
    assert.equal(slider.value, '75');
    assert.equal(button.attributes.get('aria-pressed'), 'false');
    assert.equal(button.listeners.size, 1);

    await button.emit('click');
    assert.equal(slider.disabled, true);
    assert.equal(button.attributes.get('aria-label'), 't:ui.unmuteSound');

    await button.emit('click');
    slider.value = '35';
    await slider.emit('input');
    assert.equal(volume, 0.35);

    controller.stop();
    assert.equal(button.listeners.size, 0);
});
