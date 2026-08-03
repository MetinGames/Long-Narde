export function createAppResumeController({
    documentRef = globalThis.document,
    windowRef = globalThis.window,
    onResume = () => {}
} = {}) {
    let active = false;

    const hasDocumentEvents =
        typeof documentRef?.addEventListener === 'function' &&
        typeof documentRef?.removeEventListener === 'function';
    const hasWindowEvents =
        typeof windowRef?.addEventListener === 'function' &&
        typeof windowRef?.removeEventListener === 'function';

    const synchronize = reason => {
        onResume(reason);
    };

    const handleVisibilityChange = () => {
        if (documentRef.visibilityState === 'visible') {
            synchronize('visibilitychange');
        }
    };
    const handleFocus = () => synchronize('focus');
    const handlePageShow = () => synchronize('pageshow');

    return {
        start() {
            if (active || !hasDocumentEvents || !hasWindowEvents) {
                return false;
            }

            documentRef.addEventListener(
                'visibilitychange',
                handleVisibilityChange
            );
            windowRef.addEventListener('focus', handleFocus);
            windowRef.addEventListener('pageshow', handlePageShow);
            active = true;
            return true;
        },

        stop() {
            if (!active) return false;

            documentRef.removeEventListener(
                'visibilitychange',
                handleVisibilityChange
            );
            windowRef.removeEventListener('focus', handleFocus);
            windowRef.removeEventListener('pageshow', handlePageShow);
            active = false;
            return true;
        },

        isActive() {
            return active;
        }
    };
}
