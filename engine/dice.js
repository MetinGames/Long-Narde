// engine/dice.js

export class Dice {
    constructor() {
        this.values = [];
        this.movesLeft = [];
    }

    roll() {
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        this.values = [die1, die2];
        this.movesLeft = die1 === die2
            ? [die1, die1, die1, die1]
            : [die1, die2];

        return {
            values: [...this.values],
            movesLeft: [...this.movesLeft]
        };
    }

    useMove(moveValue) {
        const index = this.movesLeft.indexOf(moveValue);
        if (index === -1) return false;

        this.movesLeft.splice(index, 1);
        return true;
    }

    reset() {
        this.values = [];
        this.movesLeft = [];
    }

    hasMoves() {
        return this.movesLeft.length > 0;
    }
}
