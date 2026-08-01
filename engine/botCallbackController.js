export function createBotCallbackController({
    scheduleCallback
}) {
    let isScheduled = false;
    let isExecuting = false;

    function reset() {
        isScheduled = false;
        isExecuting = false;
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
                    return result.finally(() => {
                        isExecuting = false;
                    });
                }

                isExecuting = false;
                return result;
            } catch (error) {
                isExecuting = false;
                throw error;
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