// engine/dice.js

export class Dice {
    constructor() {
        this.values = [];
    }

    roll() {
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        this.values = [die1, die2];

        const moves = die1 === die2
            ? [die1, die1, die1, die1]
            : [die1, die2];

        return {
            values: [...this.values],
            moves
        };
    }

    reset() {
        this.values = [];
    }
}
