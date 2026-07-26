export class NardeBot {
    constructor(playerNumber = 2) {
        this.playerNumber = playerNumber;
    }

    makeDecision(game) {
        if (game.availableMoves.length === 0 || !game.hasValidMoves()) {
            return null;
        }

        let legalMoves = [];

        for (let fromSlot = 1; fromSlot <= 24; fromSlot++) {
            const slot = game.board.slots[fromSlot];

            if (slot.player === this.playerNumber && slot.count > 0) {
                
                const headSlot = this.playerNumber === 1 ? 1 : 13;
                if (fromSlot === headSlot && game.hasMovedFromHeadThisTurn) {
                    const isSpecialDouble = game.dice.values[0] === game.dice.values[1] && 
                                           [3, 4, 6].includes(game.dice.values[0]);
                    if (!isSpecialDouble) {
                        continue; 
                    }
                }

                const uniqueMoves = [...new Set(game.availableMoves)];
                for (let diceValue of uniqueMoves) {
                    const toSlot = game.board.calculateTargetSlot(this.playerNumber, fromSlot, diceValue);
                    
                    if (game.board.isValidMove(this.playerNumber, fromSlot, toSlot)) {
                        legalMoves.push({
                            from: fromSlot,
                            dice: diceValue,
                            score: this.evaluateMove(fromSlot, toSlot, game)
                        });
                    }
                }
            }
        }

        if (legalMoves.length === 0) return null;

        legalMoves.sort((a, b) => b.score - a.score);
        return legalMoves[0]; 
    }

    evaluateMove(from, to, game) {
        let score = 0;

        const allInHome = game.board.areAllPiecesInHomeBoard(this.playerNumber);
        const isBearOff = allInHome && (
            (this.playerNumber === 1 && to >= 25) || 
            (this.playerNumber === 2 && (to > 12 && from <= 12 || to >= 25))
        );

        if (isBearOff) return 1000; 

        if (game.board.slots[to] && game.board.slots[to].count > 0 && game.board.slots[to].player === this.playerNumber) {
            score += 25; 
        }

        if (game.board.slots[from].count === 1) score -= 15; 

        const headSlot = this.playerNumber === 1 ? 1 : 13;
        if (from === headSlot) score += 10;

        score += (to > from ? to - from : (24 - from + to)) * 0.5;
        score += Math.random() * 2;

        return score;
    }
}