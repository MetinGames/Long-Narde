// engine/animations.js

export class DiceRollAnimation {
    constructor({ frames = 10, interval = 70 } = {}) {
        this.frames = frames;
        this.interval = interval;
        this.intervalId = null;
    }

    start(die1Element, die2Element, onComplete) {
        this.stop();

        let frame = 0;
        this.intervalId = setInterval(() => {
            if (die1Element) {
                die1Element.textContent =
                    Math.floor(Math.random() * 6) + 1;
            }
            if (die2Element) {
                die2Element.textContent =
                    Math.floor(Math.random() * 6) + 1;
            }

            frame++;
            if (frame < this.frames) return;

            this.stop();
            if (typeof onComplete === 'function') {
                onComplete();
            }
        }, this.interval);
    }

    stop() {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    get isRunning() {
        return this.intervalId !== null;
    }
}
