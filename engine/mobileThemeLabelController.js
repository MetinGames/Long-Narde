export const MOBILE_THEME_LABEL_QUERY =
    '(max-width: 900px) and (orientation: landscape)';

const DEFAULT_COMPACT_LABELS = Object.freeze({
    anatolian: 'Anadolu'
});

export function createMobileThemeLabelController({
    select = null,
    windowRef = globalThis.window,
    mediaQuery = MOBILE_THEME_LABEL_QUERY,
    compactLabels = DEFAULT_COMPACT_LABELS
} = {}) {
    let active = false;
    let mediaQueryList = null;
    let mediaListenerMode = null;
    let compactedOption = null;
    let originalLabel = null;
    let appliedCompactLabel = null;

    const hasSelectEvents =
        typeof select?.addEventListener === 'function' &&
        typeof select?.removeEventListener === 'function';

    function getSelectedOption() {
        const selectedOption = select?.selectedOptions?.[0];
        if (selectedOption) return selectedOption;

        return Array.from(select?.options ?? []).find(option =>
            option.selected || option.value === select?.value
        ) ?? null;
    }

    function restoreLabel() {
        if (!compactedOption) return;

        if (compactedOption.textContent === appliedCompactLabel) {
            compactedOption.textContent = originalLabel;
        }

        compactedOption = null;
        originalLabel = null;
        appliedCompactLabel = null;
    }

    function applyCompactLabel() {
        restoreLabel();
        if (!mediaQueryList?.matches) return;

        const selectedOption = getSelectedOption();
        const compactLabel = compactLabels?.[selectedOption?.value];
        if (!selectedOption || typeof compactLabel !== 'string') return;

        compactedOption = selectedOption;
        originalLabel = selectedOption.textContent;
        appliedCompactLabel = compactLabel;
        selectedOption.textContent = compactLabel;
    }

    const handleMediaChange = () => applyCompactLabel();
    const handleSelectionChange = () => applyCompactLabel();

    function bindMediaListener(candidate) {
        if (
            typeof candidate?.addEventListener === 'function' &&
            typeof candidate?.removeEventListener === 'function'
        ) {
            try {
                candidate.addEventListener('change', handleMediaChange);
                mediaListenerMode = 'event';
                return true;
            } catch {
                // Older MediaQueryList implementations may expose but reject it.
            }
        }

        if (
            typeof candidate?.addListener === 'function' &&
            typeof candidate?.removeListener === 'function'
        ) {
            candidate.addListener(handleMediaChange);
            mediaListenerMode = 'legacy';
            return true;
        }

        return false;
    }

    function unbindMediaListener() {
        if (mediaListenerMode === 'event') {
            mediaQueryList.removeEventListener('change', handleMediaChange);
        } else if (mediaListenerMode === 'legacy') {
            mediaQueryList.removeListener(handleMediaChange);
        }
        mediaListenerMode = null;
    }

    return {
        start() {
            if (
                active ||
                !hasSelectEvents ||
                typeof windowRef?.matchMedia !== 'function'
            ) {
                return false;
            }

            try {
                mediaQueryList = windowRef.matchMedia(mediaQuery);
                if (!bindMediaListener(mediaQueryList)) {
                    mediaQueryList = null;
                    return false;
                }
                select.addEventListener('change', handleSelectionChange);
            } catch {
                unbindMediaListener();
                mediaQueryList = null;
                return false;
            }

            active = true;
            applyCompactLabel();
            return true;
        },

        refresh() {
            if (!active) return false;
            applyCompactLabel();
            return true;
        },

        stop() {
            if (!active) return false;

            select.removeEventListener('change', handleSelectionChange);
            unbindMediaListener();
            restoreLabel();
            mediaQueryList = null;
            active = false;
            return true;
        },

        isActive() {
            return active;
        }
    };
}
