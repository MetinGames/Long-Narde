const BODY_FULLSCREEN_CLASS = 'is-game-fullscreen';
const BODY_FOCUS_MODE_CLASS = 'is-game-focus-mode';
const ROOT_FULLSCREEN_CLASS = 'is-fullscreen-root-active';
const ROOT_FOCUS_MODE_CLASS = 'is-focus-mode-root';

const FULLSCREEN_OVERLAY_IDS = Object.freeze([
    'start-screen',
    'feedback-modal',
    'how-to-play-modal',
    'player-stats-modal',
    'game-over-overlay'
]);

const FULLSCREEN_ENTER_ICON_SVG = [
    '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">',
    '<path d="M6 2H2V6" />',
    '<path d="M10 2H14V6" />',
    '<path d="M2 10V14H6" />',
    '<path d="M14 10V14H10" />',
    '</svg>'
].join('');

const FULLSCREEN_EXIT_ICON_SVG = [
    '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">',
    '<path d="M2 6H6V2" />',
    '<path d="M14 6H10V2" />',
    '<path d="M2 10H6V14" />',
    '<path d="M14 10H10V14" />',
    '</svg>'
].join('');

function getFullscreenElement(documentRef) {
    if (!documentRef) return null;
    return documentRef.fullscreenElement || documentRef.webkitFullscreenElement || null;
}

function getBody(documentRef) {
    return documentRef?.body || null;
}

function getHtmlElement(documentRef) {
    return documentRef?.documentElement || null;
}

function safeCall(callback, ...args) {
    if (typeof callback !== 'function') return;
    callback(...args);
}

export function createFullscreenController({
    rootElement,
    toggleButton,
    iconElement = null,
    labelElement = null,
    documentRef = typeof document !== 'undefined' ? document : null,
    windowRef = typeof window !== 'undefined' ? window : null,
    translate = key => key,
    runtimeDiagnostics = null,
    onLayoutChange = () => {},
    overlayIds = FULLSCREEN_OVERLAY_IDS
} = {}) {
    const root = rootElement || null;
    const button = toggleButton || null;

    if (!root || !button || !documentRef) {
        return {
            enter: async () => false,
            exit: async () => false,
            toggle: async () => false,
            isActive: () => false,
            refreshLabels: () => false,
            dispose: () => {}
        };
    }

    let cssFallbackActive = false;
    let transitionInFlight = false;
    let listenersBound = false;
    const disposers = [];
    let previousBodyOverflow = null;
    let previousHtmlOverflow = null;

    function record(eventType, detail = '') {
        runtimeDiagnostics?.recordStateChange?.(eventType, detail);
    }

    function setViewportCssVars() {
        const width = Number.isFinite(windowRef?.innerWidth) ? windowRef.innerWidth : 0;
        const height = Number.isFinite(windowRef?.innerHeight) ? windowRef.innerHeight : 0;
        root.style.setProperty('--fs-vw', `${Math.max(0, width)}px`);
        root.style.setProperty('--fs-vh', `${Math.max(0, height)}px`);
    }

    function canUseStandardApi() {
        return typeof root.requestFullscreen === 'function';
    }

    function canUseWebkitApi() {
        return typeof root.webkitRequestFullscreen === 'function';
    }

    function supportsNativeEnter() {
        return canUseStandardApi() || canUseWebkitApi();
    }

    function isNativeFullscreenActive() {
        const fullscreenElement = getFullscreenElement(documentRef);
        return Boolean(fullscreenElement && (fullscreenElement === root || fullscreenElement.contains?.(root)));
    }

    function isActive() {
        return isNativeFullscreenActive() || cssFallbackActive;
    }

    function setBodyScrollLocked(isLocked) {
        const body = getBody(documentRef);
        const html = getHtmlElement(documentRef);

        if (!body || !html) return;

        if (isLocked) {
            if (previousBodyOverflow === null) {
                previousBodyOverflow = body.style.overflow;
            }
            if (previousHtmlOverflow === null) {
                previousHtmlOverflow = html.style.overflow;
            }

            body.style.overflow = 'hidden';
            html.style.overflow = 'hidden';
        } else {
            if (previousBodyOverflow !== null) {
                body.style.overflow = previousBodyOverflow;
                previousBodyOverflow = null;
            } else {
                body.style.removeProperty('overflow');
            }

            if (previousHtmlOverflow !== null) {
                html.style.overflow = previousHtmlOverflow;
                previousHtmlOverflow = null;
            } else {
                html.style.removeProperty('overflow');
            }
        }
    }

    function applyVisualState() {
        const active = isActive();
        const body = getBody(documentRef);

        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));

        root.classList.toggle(ROOT_FULLSCREEN_CLASS, active);
        root.classList.toggle(ROOT_FOCUS_MODE_CLASS, cssFallbackActive);

        if (body) {
            body.classList.toggle(BODY_FULLSCREEN_CLASS, active);
            body.classList.toggle(BODY_FOCUS_MODE_CLASS, cssFallbackActive);
        }

        setBodyScrollLocked(active);
        setViewportCssVars();
        refreshLabels();
    }

    function refreshLabels() {
        const active = isActive();
        const label = active
            ? translate('ui.exitFullscreen')
            : translate('ui.enterFullscreen');

        button.setAttribute('aria-label', label);

        if (labelElement) {
            labelElement.textContent = label;
        }

        if (iconElement) {
            iconElement.setAttribute(
                'data-icon-state',
                active ? 'exit' : 'enter'
            );
            iconElement.innerHTML = active
                ? FULLSCREEN_EXIT_ICON_SVG
                : FULLSCREEN_ENTER_ICON_SVG;
        }

        return label;
    }

    function enterCssFallback() {
        cssFallbackActive = true;
        applyVisualState();
        record('fullscreen-enter', 'mode=css-fallback');
        safeCall(onLayoutChange, { active: true, mode: 'css-fallback' });
    }

    function exitCssFallback() {
        if (!cssFallbackActive) return;
        cssFallbackActive = false;
        applyVisualState();
        record('fullscreen-exit', 'mode=css-fallback');
        safeCall(onLayoutChange, { active: false, mode: 'css-fallback' });
    }

    function handleNativeFullscreenChange() {
        if (!isNativeFullscreenActive() && cssFallbackActive) {
            return;
        }

        applyVisualState();

        if (isNativeFullscreenActive()) {
            record('fullscreen-enter', 'mode=native');
            safeCall(onLayoutChange, { active: true, mode: 'native' });
            return;
        }

        record('fullscreen-exit', 'mode=native');
        safeCall(onLayoutChange, { active: false, mode: 'native' });
    }

    function handleLayoutSignal() {
        setViewportCssVars();
        safeCall(onLayoutChange, {
            active: isActive(),
            mode: cssFallbackActive ? 'css-fallback' : isNativeFullscreenActive() ? 'native' : 'none'
        });
    }

    function handleEscapeForFallback(event) {
        if (!cssFallbackActive) return;
        if (event?.key !== 'Escape') return;
        event.preventDefault?.();
        void exit();
    }

    async function requestNativeFullscreen() {
        if (canUseStandardApi()) {
            await root.requestFullscreen();
            return true;
        }

        if (canUseWebkitApi()) {
            await root.webkitRequestFullscreen();
            return true;
        }

        return false;
    }

    async function exitNativeFullscreen() {
        if (typeof documentRef.exitFullscreen === 'function') {
            await documentRef.exitFullscreen();
            return true;
        }

        if (typeof documentRef.webkitExitFullscreen === 'function') {
            await documentRef.webkitExitFullscreen();
            return true;
        }

        return false;
    }

    async function enter() {
        if (transitionInFlight) return false;
        if (isActive()) return true;

        transitionInFlight = true;
        try {
            if (!supportsNativeEnter()) {
                enterCssFallback();
                return true;
            }

            try {
                await requestNativeFullscreen();
                // Browser may dispatch fullscreenchange asynchronously; update state immediately too.
                applyVisualState();
                return true;
            } catch (error) {
                record('fullscreen-error', `enter-failed=${error?.name || 'unknown'}`);
                enterCssFallback();
                return true;
            }
        } finally {
            transitionInFlight = false;
        }
    }

    async function exit() {
        if (transitionInFlight) return false;
        if (!isActive()) return true;

        transitionInFlight = true;
        try {
            if (cssFallbackActive) {
                exitCssFallback();
                return true;
            }

            if (!isNativeFullscreenActive()) {
                applyVisualState();
                return true;
            }

            try {
                const exited = await exitNativeFullscreen();
                if (!exited) {
                    record('fullscreen-error', 'exit-not-supported');
                }
                applyVisualState();
                return exited;
            } catch (error) {
                record('fullscreen-error', `exit-failed=${error?.name || 'unknown'}`);
                applyVisualState();
                return false;
            }
        } finally {
            transitionInFlight = false;
        }
    }

    async function toggle() {
        return isActive() ? exit() : enter();
    }

    function appendDisposer(target, type, handler, options) {
        if (!target?.addEventListener) return;
        target.addEventListener(type, handler, options);
        disposers.push(() => target.removeEventListener?.(type, handler, options));
    }

    function moveOverlayElementsIntoRoot() {
        for (const overlayId of overlayIds) {
            const element = documentRef.getElementById?.(overlayId);
            if (!element || element === root || root.contains(element)) continue;
            root.appendChild(element);
        }
    }

    function bind() {
        if (listenersBound) return;
        listenersBound = true;

        moveOverlayElementsIntoRoot();

        appendDisposer(button, 'click', event => {
            event.preventDefault();
            void toggle();
        });

        appendDisposer(button, 'keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                void toggle();
            }
        });

        appendDisposer(documentRef, 'fullscreenchange', handleNativeFullscreenChange);
        appendDisposer(documentRef, 'webkitfullscreenchange', handleNativeFullscreenChange);
        appendDisposer(documentRef, 'keydown', handleEscapeForFallback);
        appendDisposer(windowRef, 'resize', handleLayoutSignal, { passive: true });
        appendDisposer(windowRef, 'orientationchange', handleLayoutSignal, { passive: true });

        applyVisualState();
    }

    function dispose() {
        for (const disposer of disposers.splice(0)) {
            disposer();
        }

        listenersBound = false;

        cssFallbackActive = false;
        transitionInFlight = false;
        applyVisualState();
    }

    bind();

    return {
        enter,
        exit,
        toggle,
        isActive,
        refreshLabels,
        dispose
    };
}
