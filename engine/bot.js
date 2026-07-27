// engine/bot.js

export class NardeBot {
    constructor(playerNumber = 2, difficulty = 'medium', random = Math.random) {
        this.playerNumber = playerNumber;
        this.difficulty = difficulty;
        this.random = random;
    }

    makeDecision(game) {
        if (
            game.currentPlayer !== this.playerNumber ||
            game.availableMoves.length === 0 ||
            !game.hasValidMoves()
        ) {
            return null;
        }

        const legalMoves = [];

        for (let fromSlot = 1; fromSlot <= 24; fromSlot++) {
            const slot = game.board.slots[fromSlot];
            if (
                slot.player !== this.playerNumber ||
                slot.count <= 0
            ) {
                continue;
            }

            const legalFirstDice = [
                ...new Set(
                    game.getRuleCompliantDiceSequences(fromSlot)
                        .filter(sequence => sequence.length === 1)
                        .map(sequence => sequence[0])
                )
            ];

            for (const diceValue of legalFirstDice) {
                const result = game.simulateDiceSequence(
                    fromSlot,
                    [diceValue]
                );
                if (!result.valid) continue;

                let score = this.evaluateMove(
                    fromSlot,
                    result.targetSlot,
                    game,
                    result.borneOffCount > 0,
                    diceValue
                );

                if (this.difficulty === 'hard') {
                    score += this.evaluateHardPosition(
                        game,
                        fromSlot,
                        diceValue
                    );
                }

                legalMoves.push({
                    from: fromSlot,
                    dice: diceValue,
                    target: result.borneOffCount > 0
                        ? 25
                        : result.targetSlot,
                    score
                });
            }
        }

        if (legalMoves.length === 0) return null;

        legalMoves.sort((a, b) => b.score - a.score);
        return legalMoves[0];
    }

    getLongestPrime(game) {
        let longest = 0;
        let current = 0;

        for (let progress = 0; progress < 24; progress++) {
            const slotId = game.board.getSlotFromProgress(
                this.playerNumber,
                progress
            );
            const slot = game.board.slots[slotId];

            if (
                slot.player === this.playerNumber &&
                slot.count > 0
            ) {
                current++;
                longest = Math.max(longest, current);
            } else {
                current = 0;
            }
        }

        return longest;
    }

    evaluateHardPosition(game, fromSlot, diceValue) {
        const snapshot = game.createMoveStateSnapshot();

        try {
            if (!game.executeMove(fromSlot, diceValue, false)) {
                return Number.NEGATIVE_INFINITY;
            }

            let score = 0;
            let madePoints = 0;

            for (let slotId = 1; slotId <= 24; slotId++) {
                const slot = game.board.slots[slotId];
                if (
                    slot.player !== this.playerNumber ||
                    slot.count <= 0
                ) {
                    continue;
                }

                score += game.board.getProgress(
                    this.playerNumber,
                    slotId
                ) * slot.count * 0.15;

                if (slot.count >= 2) madePoints++;
                if (slot.count > 5) {
                    score -= (slot.count - 5) * 2;
                }
            }

            const longestPrime = this.getLongestPrime(game);
            score += madePoints * 6;
            score += longestPrime * longestPrime * 2;

            return score;
        } finally {
            game.restoreMoveState(snapshot);
        }
    }

    evaluateMove(
        from,
        to,
        game,
        isBearOff = false,
        diceValue = 0
    ) {
        if (isBearOff) return 10000;

        if (this.difficulty === 'easy') {
            return this.random() * 100;
        }

        let score = diceValue * 0.5;
        const target = game.board.slots[to];

        if (
            target &&
            target.count > 0 &&
            target.player === this.playerNumber
        ) {
            score += 25;
        }

        if (game.board.slots[from].count === 1) {
            score -= 15;
        }

        if (from === game.board.getHeadSlot(this.playerNumber)) {
            score += 20;
        }

        score += this.random() * 2;

        if (this.difficulty === 'hard') {
            if (this.playerNumber === 1 && to >= 19) {
                score += 15;
            }
            if (this.playerNumber === 2 && to >= 7 && to <= 12) {
                score += 15;
            }

            const checkForward = game.board.calculateTargetSlot(
                this.playerNumber,
                to,
                1
            );
            const checkBackward = game.board.calculateTargetSlot(
                this.playerNumber,
                to,
                -1
            );

            if (
                game.board.slots[checkForward]?.player ===
                this.playerNumber
            ) {
                score += 10;
            }
            if (
                game.board.slots[checkBackward]?.player ===
                this.playerNumber
            ) {
                score += 10;
            }
        }

        return score;
    }
}
