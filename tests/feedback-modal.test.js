import test from 'node:test';
import assert from 'node:assert/strict';

import { FeedbackModal } from '../engine/feedbackModal.js';
import { applyTranslations, getLanguage, setLanguage } from '../engine/i18n.js';

class FakeDocument {
    constructor(elements = []) {
        this.activeElement = null;
        this.listeners = new Map();
        this.documentElement = { lang: 'en' };
        this.title = '';
        this.elements = elements;
    }

    addEventListener(type, listener) {
        this.listeners.set(type, listener);
    }

    removeEventListener(type, listener) {
        if (this.listeners.get(type) === listener) {
            this.listeners.delete(type);
        }
    }

    emitKeydown(event) {
        const listener = this.listeners.get('keydown');
        if (listener) {
            listener(event);
        }
    }

    querySelectorAll(selector) {
        if (selector === '[data-i18n]') {
            return this.elements.filter(element => element.dataset?.i18n);
        }
        if (selector === '[data-i18n-title]') {
            return this.elements.filter(element => element.dataset?.i18nTitle);
        }
        if (selector === '[data-i18n-aria-label]') {
            return this.elements.filter(element => element.dataset?.i18nAriaLabel);
        }
        return [];
    }
}

class FakeClassList {
    constructor() {
        this.values = new Set();
    }

    add(name) {
        this.values.add(name);
    }

    remove(name) {
        this.values.delete(name);
    }

    contains(name) {
        return this.values.has(name);
    }
}

class FakeElement {
    constructor(doc, { tagName = 'div', i18n = null, aria = null, href = null } = {}) {
        this.ownerDocument = doc;
        this.tagName = tagName;
        this.style = {};
        this.hidden = false;
        this.disabled = false;
        this.textContent = '';
        this.listeners = new Map();
        this.attributes = new Map();
        this.classList = new FakeClassList();
        this.dataset = {};
        this.href = href;
        if (i18n) this.dataset.i18n = i18n;
        if (aria) this.dataset.i18nAriaLabel = aria;
    }

    addEventListener(type, listener) {
        this.listeners.set(type, listener);
    }

    removeEventListener(type, listener) {
        if (this.listeners.get(type) === listener) {
            this.listeners.delete(type);
        }
    }

    click() {
        const listener = this.listeners.get('click');
        if (listener) listener({ target: this, currentTarget: this });
    }

    focus() {
        this.ownerDocument.activeElement = this;
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    getAttribute(name) {
        return this.attributes.get(name) || null;
    }

    querySelectorAll(selector) {
        if (selector.includes('button') || selector.includes('[href]')) {
            return this.focusables || [];
        }
        return [];
    }
}

function createFixture() {
    const doc = new FakeDocument();
    const modal = new FakeElement(doc, { tagName: 'div', aria: 'ui.feedbackModalLabel' });
    const openButton = new FakeElement(doc, { tagName: 'button' });
    const closeButton = new FakeElement(doc, { tagName: 'button' });
    const bugLink = new FakeElement(doc, { tagName: 'a', i18n: 'ui.feedbackBug', href: 'https://github.com/MetinGames/Long-Narde/issues/new?template=bug_report.yml' });
    const featureLink = new FakeElement(doc, { tagName: 'a', i18n: 'ui.feedbackFeature', href: 'https://github.com/MetinGames/Long-Narde/issues/new?template=feature_request.yml' });
    const title = new FakeElement(doc, { tagName: 'h3', i18n: 'ui.feedbackTitle' });
    const intro = new FakeElement(doc, { tagName: 'p', i18n: 'ui.feedbackIntro' });
    const note = new FakeElement(doc, { tagName: 'p', i18n: 'ui.feedbackSigninNote' });

    modal.focusables = [closeButton, bugLink, featureLink];
    modal.children = [title, intro, closeButton, bugLink, featureLink, note];

    doc.elements = [title, intro, note, modal, openButton, closeButton, bugLink, featureLink];

    return {
        doc,
        modal,
        openButton,
        closeButton,
        bugLink,
        featureLink,
        title,
        intro,
        note
    };
}

test('feedback modal opens and closes without starting gameplay runtime', () => {
    const fixture = createFixture();
    const previousDocument = globalThis.document;
    globalThis.document = fixture.doc;

    const modal = new FeedbackModal({
        modal: fixture.modal,
        openButton: fixture.openButton,
        closeButtons: [fixture.closeButton]
    });

    let timerCalls = 0;
    const previousSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = () => {
        timerCalls++;
        return 1;
    };

    try {
        fixture.openButton.click();
        assert.equal(fixture.modal.style.display, 'flex');
        assert.equal(fixture.modal.getAttribute('aria-hidden'), 'false');
        assert.equal(timerCalls, 0);
        assert.equal(fixture.doc.activeElement, fixture.closeButton);

        fixture.modal.click();
        assert.equal(fixture.modal.style.display, 'none');
        assert.equal(fixture.modal.getAttribute('aria-hidden'), 'true');
        assert.equal(fixture.doc.activeElement, fixture.openButton);
    } finally {
        globalThis.setTimeout = previousSetTimeout;
        globalThis.document = previousDocument;
        modal.close({ returnFocus: false });
    }
});

test('feedback modal traps focus, closes on Escape, and does not add duplicate listeners', () => {
    const fixture = createFixture();
    const previousDocument = globalThis.document;
    globalThis.document = fixture.doc;

    const modal = new FeedbackModal({
        modal: fixture.modal,
        openButton: fixture.openButton,
        closeButtons: [fixture.closeButton]
    });

    const openListenerCount = fixture.openButton.listeners.size;
    const closeListenerCount = fixture.closeButton.listeners.size;

    try {
        fixture.openButton.click();
        fixture.featureLink.focus();
        let prevented = false;
        fixture.doc.emitKeydown({
            key: 'Tab',
            shiftKey: false,
            preventDefault() {
                prevented = true;
            }
        });

        assert.equal(prevented, true);
        assert.equal(fixture.doc.activeElement, fixture.closeButton);

        fixture.doc.emitKeydown({
            key: 'Escape',
            preventDefault() {}
        });

        assert.equal(fixture.modal.getAttribute('aria-hidden'), 'true');
        assert.equal(fixture.doc.activeElement, fixture.openButton);

        fixture.openButton.click();
        fixture.closeButton.click();
        assert.equal(fixture.openButton.listeners.size, openListenerCount);
        assert.equal(fixture.closeButton.listeners.size, closeListenerCount);
    } finally {
        globalThis.document = previousDocument;
        modal.close({ returnFocus: false });
    }
});

test('feedback modal text refreshes with language changes', () => {
    const fixture = createFixture();
    const previousDocument = globalThis.document;
    const previousLanguage = getLanguage();
    globalThis.document = fixture.doc;

    try {
        setLanguage('en');
        applyTranslations(fixture.doc);
        assert.equal(fixture.title.textContent, 'Your Feedback Matters');
        assert.equal(fixture.intro.textContent, 'Report a bug or suggest an improvement.');

        setLanguage('ru');
        applyTranslations(fixture.doc);
        assert.equal(fixture.title.textContent, 'Ваши отзывы важны');
        assert.equal(fixture.note.textContent, 'Возможно, потребуется вход через GitHub-аккаунт.');
    } finally {
        setLanguage(previousLanguage);
        globalThis.document = previousDocument;
    }
});
