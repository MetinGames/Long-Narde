export function createStartModeController({
    availableModes = [],
    unavailableModes = [],
    onStart = () => false,
    onUnavailable = () => {}
} = {}) {
    let active = false;
    let startLocked = false;
    const listeners = [];

    const bindableAvailableModes = availableModes.filter(({ button }) =>
        typeof button?.addEventListener === 'function' &&
        typeof button?.removeEventListener === 'function'
    );
    const bindableUnavailableModes = unavailableModes.filter(({ button }) =>
        typeof button?.addEventListener === 'function' &&
        typeof button?.removeEventListener === 'function'
    );

    function bind(button, handler) {
        button.addEventListener('click', handler);
        listeners.push({ button, handler });
    }

    return {
        start() {
            if (active || bindableAvailableModes.length === 0) {
                return false;
            }

            for (const { mode, button } of bindableAvailableModes) {
                bind(button, event => {
                    event?.preventDefault?.();
                    if (startLocked) return;

                    const started = onStart(mode, event);
                    if (started) startLocked = true;
                });
            }

            for (const { mode, button } of bindableUnavailableModes) {
                bind(button, event => {
                    event?.preventDefault?.();
                    onUnavailable(mode, event);
                });
            }

            active = true;
            return true;
        },

        reset() {
            startLocked = false;
        },

        stop() {
            if (!active) return false;

            for (const { button, handler } of listeners.splice(0)) {
                button.removeEventListener('click', handler);
            }
            startLocked = false;
            active = false;
            return true;
        },

        isActive() {
            return active;
        },

        isStartLocked() {
            return startLocked;
        }
    };
}
