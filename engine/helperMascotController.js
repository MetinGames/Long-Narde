// engine/helperMascotController.js

export const HELPER_MASCOT_STORAGE_KEY =
    'nardora.helperMascot.state.v1';

const MINIMIZED_STATE = 'minimized';
const EXPANDED_STATE = 'expanded';

function getDefaultStorage() {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
}

export class HelperMascotController {
    constructor({
        root,
        toggleButton,
        panel,
        minimizeButton,
        bugLink,
        feedbackButton,
        guideButton,
        storage = getDefaultStorage(),
        onOpenFeedback = () => {},
        onOpenGuide = () => {},
        translate = key => key
    }) {
        this.root = root;
        this.toggleButton = toggleButton;
        this.panel = panel;
        this.minimizeButton = minimizeButton;
        this.bugLink = bugLink;
        this.feedbackButton = feedbackButton;
        this.guideButton = guideButton;
        this.storage = storage;
        this.onOpenFeedback = onOpenFeedback;
        this.onOpenGuide = onOpenGuide;
        this.translate = translate;
        this.isMinimized = true;
        this.started = false;

        this.boundOnKeyDown = event => {
            if (event.key !== 'Escape' || this.isMinimized) return;
            event.preventDefault?.();
            this.setMinimized(true, { focusToggle: true });
        };
    }

    getDocument() {
        return this.root?.ownerDocument ?? globalThis.document ?? null;
    }

    readStoredState() {
        try {
            return this.storage?.getItem(HELPER_MASCOT_STORAGE_KEY) ===
                EXPANDED_STATE
                ? EXPANDED_STATE
                : MINIMIZED_STATE;
        } catch {
            return MINIMIZED_STATE;
        }
    }

    persistState() {
        try {
            this.storage?.setItem(
                HELPER_MASCOT_STORAGE_KEY,
                this.isMinimized ? MINIMIZED_STATE : EXPANDED_STATE
            );
        } catch {
            // Local storage can be unavailable in private or restricted contexts.
        }
    }

    render() {
        if (!this.root) return;

        const expanded = !this.isMinimized;
        this.root.dataset.state = expanded
            ? EXPANDED_STATE
            : MINIMIZED_STATE;
        this.root.hidden = false;
        this.toggleButton?.setAttribute('aria-expanded', String(expanded));
        this.toggleButton?.setAttribute(
            'aria-label',
            this.translate(
                expanded ? 'helper.minimize' : 'helper.openLabel'
            )
        );

        if (this.panel) {
            this.panel.hidden = !expanded;
            this.panel.setAttribute('aria-hidden', String(!expanded));
        }
    }

    setMinimized(minimized, {
        persist = true,
        focusToggle = false
    } = {}) {
        this.isMinimized = Boolean(minimized);
        this.render();

        if (persist) {
            this.persistState();
        }

        if (focusToggle) {
            this.toggleButton?.focus?.();
        }

        return this.isMinimized;
    }

    bindEvents() {
        this.toggleButton?.addEventListener('click', () => {
            this.setMinimized(!this.isMinimized);
        });

        this.minimizeButton?.addEventListener('click', () => {
            this.setMinimized(true, { focusToggle: true });
        });

        this.bugLink?.addEventListener('click', () => {
            this.setMinimized(true);
        });

        this.feedbackButton?.addEventListener('click', () => {
            this.setMinimized(true);
            this.onOpenFeedback(this.feedbackButton);
        });

        this.guideButton?.addEventListener('click', () => {
            this.setMinimized(true);
            this.onOpenGuide(this.guideButton);
        });

        this.getDocument()?.addEventListener(
            'keydown',
            this.boundOnKeyDown
        );
    }

    start() {
        if (this.started) return this;
        this.started = true;
        this.bindEvents();
        this.setMinimized(
            this.readStoredState() !== EXPANDED_STATE,
            { persist: false }
        );
        return this;
    }

    refreshForLanguage() {
        this.render();
    }
}
