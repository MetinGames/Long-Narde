// engine/game.js
import { Board } from './board.js';
import { Dice } from './dice.js';

export class NardeGame {
    constructor() {
        this.board = new Board();
        this.dice = new Dice();
        this.currentPlayer = 1;
        this.gameStatus = 'WAITING_FOR_DICE';
        this.availableMoves = [];
        this.headMovesThisTurn = 0;
        this.turnsCompleted = { 1: 0, 2: 0 };
        this.turnSnapshot = null;
    }

    initGame() {
        this.board.setupInitialPieces();
        this.dice.values = [];
        this.dice.movesLeft = [];
        this.currentPlayer = 1;
        this.gameStatus = 'WAITING_FOR_DICE';
        this.availableMoves = [];
        this.headMovesThisTurn = 0;
        this.turnsCompleted = { 1: 0, 2: 0 };
        this.turnSnapshot = null;
    }

    isCurrentPlayersFirstTurn() {
        return this.turnsCompleted[this.currentPlayer] === 0;
    }

    getHeadMoveLimit() {
        const isDouble =
            this.dice.values.length === 2 &&
            this.dice.values[0] === this.dice.values[1];
        const isSpecialOpeningDouble =
            isDouble && [3, 4, 6].includes(this.dice.values[0]);

        return this.isCurrentPlayersFirstTurn() && isSpecialOpeningDouble
            ? 2
            : 1;
    }

    canMoveFromHead() {
        return this.headMovesThisTurn < this.getHeadMoveLimit();
    }

    rollDice() {
        if (this.gameStatus !== 'WAITING_FOR_DICE') return null;

        const rollResult = this.dice.roll();
        this.availableMoves = [...rollResult.movesLeft];
        this.gameStatus = 'PLAYING';
        this.headMovesThisTurn = 0;
        this.turnSnapshot = {
            slotsBackup: JSON.parse(JSON.stringify(this.board.slots)),
            borneOffBackup: { ...this.board.borneOff },
            headMovesBackup: 0,
            initialAvailableMoves: [...this.availableMoves]
        };

        return rollResult.values;
    }

    undoTurnMoves() {
        if (!this.turnSnapshot || this.gameStatus !== 'PLAYING') return false;

        this.board.slots = JSON.parse(
            JSON.stringify(this.turnSnapshot.slotsBackup)
        );
        this.board.borneOff = { ...this.turnSnapshot.borneOffBackup };
        this.headMovesThisTurn = this.turnSnapshot.headMovesBackup;
        this.availableMoves = [
            ...this.turnSnapshot.initialAvailableMoves
        ];
        this.dice.movesLeft = [
            ...this.turnSnapshot.initialAvailableMoves
        ];

        return true;
    }

    confirmTurnEnd() {
        const endingPlayer = this.currentPlayer;
        this.turnsCompleted[endingPlayer]++;
        this.currentPlayer = endingPlayer === 1 ? 2 : 1;
        this.availableMoves = [];
        this.dice.movesLeft = [];
        this.headMovesThisTurn = 0;
        this.gameStatus = 'WAITING_FOR_DICE';
        this.turnSnapshot = null;
    }

    checkWinCondition() {
        if (this.board.hasPlayerWon(1)) {
            this.gameStatus = 'GAME_OVER';
            return 1;
        }

        if (this.board.hasPlayerWon(2)) {
            this.gameStatus = 'GAME_OVER';
            return 2;
        }

        return 0;
    }

    executeMove(fromSlot, diceValue) {
        if (this.gameStatus !== 'PLAYING') return false;

        const moveIndex = this.availableMoves.indexOf(diceValue);
        if (moveIndex === -1) return false;

        const headSlot = this.board.getHeadSlot(this.currentPlayer);
        if (fromSlot === headSlot && !this.canMoveFromHead()) {
            return false;
        }

        const toSlot = this.board.calculateTargetSlot(
            this.currentPlayer,
            fromSlot,
            diceValue
        );

        if (!this.board.isValidMove(this.currentPlayer, fromSlot, toSlot)) {
            return false;
        }

        if (!this.board.movePiece(fromSlot, toSlot)) return false;

        this.availableMoves.splice(moveIndex, 1);
        this.dice.useMove(diceValue);

        if (fromSlot === headSlot) {
            this.headMovesThisTurn++;
        }

        return true;
    }

    simulateDiceSequence(fromSlot, diceValues) {
        const backup = {
            slots: JSON.parse(JSON.stringify(this.board.slots)),
            borneOff: { ...this.board.borneOff },
            availableMoves: [...this.availableMoves],
            diceMoves: [...this.dice.movesLeft],
            headMoves: this.headMovesThisTurn
        };

        let currentSlot = fromSlot;
        let valid = true;
        let borneOffCount = 0;

        for (let i = 0; i < diceValues.length; i++) {
            const diceValue = diceValues[i];
            const targetSlot = this.board.calculateTargetSlot(
                this.currentPlayer,
                currentSlot,
                diceValue
            );
            const beforeBorneOff =
                this.board.borneOff[this.currentPlayer];

            if (!this.executeMove(currentSlot, diceValue)) {
                valid = false;
                break;
            }

            const wasBorneOff =
                this.board.borneOff[this.currentPlayer] > beforeBorneOff;
            if (wasBorneOff) {
                borneOffCount++;

                // Toplanan aynı pul kalan zarlarla tekrar oynanamaz.
                if (i < diceValues.length - 1) {
                    valid = false;
                }
                break;
            }

            currentSlot = targetSlot;
        }

        this.board.slots = backup.slots;
        this.board.borneOff = backup.borneOff;
        this.availableMoves = backup.availableMoves;
        this.dice.movesLeft = backup.diceMoves;
        this.headMovesThisTurn = backup.headMoves;

        return {
            valid,
            targetSlot: currentSlot,
            borneOffCount
        };
    }

    canPlayDiceSequence(fromSlot, diceValues) {
        const result = this.simulateDiceSequence(fromSlot, diceValues);
        return result.valid ? result.targetSlot : null;
    }

    executeDiceSequence(fromSlot, diceValues) {
        const simulation = this.simulateDiceSequence(
            fromSlot,
            diceValues
        );
        if (!simulation.valid) return false;

        let currentSlot = fromSlot;
        for (const diceValue of diceValues) {
            const targetSlot = this.board.calculateTargetSlot(
                this.currentPlayer,
                currentSlot,
                diceValue
            );
            const beforeBorneOff =
                this.board.borneOff[this.currentPlayer];

            if (!this.executeMove(currentSlot, diceValue)) {
                return false;
            }

            if (
                this.board.borneOff[this.currentPlayer] >
                beforeBorneOff
            ) {
                break;
            }

            currentSlot = targetSlot;
        }

        return true;
    }

    getAvailableDiceSequences() {
        const sequences = [];
        const seen = new Set();
        const moves = [...this.availableMoves];

        const build = (prefix, remaining) => {
            if (prefix.length > 0) {
                const key = prefix.join(',');
                if (!seen.has(key)) {
                    seen.add(key);
                    sequences.push([...prefix]);
                }
            }

            for (let i = 0; i < remaining.length; i++) {
                const next = remaining[i];
                const rest = [
                    ...remaining.slice(0, i),
                    ...remaining.slice(i + 1)
                ];
                build([...prefix, next], rest);
            }
        };

        build([], moves);
        return sequences.sort((a, b) => a.length - b.length);
    }

    findSequenceForTarget(fromSlot, targetId) {
        for (const sequence of this.getAvailableDiceSequences()) {
            const result = this.simulateDiceSequence(
                fromSlot,
                sequence
            );
            if (!result.valid) continue;

            if (targetId === 25 && result.borneOffCount === 1) {
                return sequence;
            }

            if (
                targetId >= 1 &&
                targetId <= 24 &&
                result.borneOffCount === 0 &&
                result.targetSlot === targetId
            ) {
                return sequence;
            }
        }

        return null;
    }

    processPlayerInput(selectedId, targetId) {
        if (
            this.gameStatus !== 'PLAYING' ||
            selectedId < 1 ||
            selectedId > 24
        ) {
            return false;
        }

        const sequence = this.findSequenceForTarget(
            selectedId,
            targetId
        );
        if (!sequence) return false;

        return this.executeDiceSequence(selectedId, sequence);
    }

    hasValidMoves() {
        if (this.availableMoves.length === 0) return false;

        const uniqueMoves = [...new Set(this.availableMoves)];
        for (let fromSlot = 1; fromSlot <= 24; fromSlot++) {
            const slot = this.board.slots[fromSlot];
            if (
                slot.player !== this.currentPlayer ||
                slot.count <= 0
            ) {
                continue;
            }

            for (const diceValue of uniqueMoves) {
                const result = this.simulateDiceSequence(
                    fromSlot,
                    [diceValue]
                );
                if (result.valid) return true;
            }
        }

        return false;
    }
}
