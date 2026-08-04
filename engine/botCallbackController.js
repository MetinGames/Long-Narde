export function createBotCallbackController({
    scheduleCallback,
    onError = null
}) {
    let isScheduled = false;
    let isExecuting = false;

    function reset() {
        isScheduled = false;
        isExecuting = false;
    }

    function recover(error) {
        if (typeof onError === 'function') {
            return onError(error);
        }

        throw error;
    }

    function scheduleNext(callback, delay = 550) {
        if (isScheduled) {
            return null;
        }

        isScheduled = true;

        return scheduleCallback(() => {
            isScheduled = false;
            isExecuting = true;

            try {
                const result = callback();
                if (result && typeof result.then === 'function') {
                    return result
                        .catch(recover)
                        .finally(() => {
                            isExecuting = false;
                        });
                }

                isExecuting = false;
                return result;
            } catch (error) {
                isExecuting = false;
                return recover(error);
            }
        }, delay);
    }

    return {
        reset,
        scheduleNext,
        isScheduled() {
            return isScheduled;
        },
        isExecuting() {
            return isExecuting;
        }
    };
}
