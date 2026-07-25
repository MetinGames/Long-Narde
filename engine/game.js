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
        this.hasMovedFromHeadThisTurn = false;
        this.turnSnapshot = null;
    }

    initGame() {
        this.board.setupInitialPieces();
        this.currentPlayer = 1;
        this.gameStatus = 'WAITING_FOR_DICE';
        this.hasMovedFromHeadThisTurn = false;
        this.turnSnapshot = null;
    }

    rollDice() {
        if (this.gameStatus !== 'WAITING_FOR_DICE') return null;

        const rollResult = this.dice.roll();
        this.availableMoves = [...rollResult.movesLeft];
        this.gameStatus = 'PLAYING';

        this.turnSnapshot = {
            slotsBackup: JSON.parse(JSON.stringify(this.board.slots)),
            hasMovedFromHeadBackup: this.hasMovedFromHeadThisTurn,
            initialAvailableMoves: [...this.availableMoves]
        };

        return rollResult.values;
    }

    undoTurnMoves() {
        if (!this.turnSnapshot || this.gameStatus !== 'PLAYING') return false;

        this.board.slots = JSON.parse(JSON.stringify(this.turnSnapshot.slotsBackup));
        this.hasMovedFromHeadThisTurn = this.turnSnapshot.hasMovedFromHeadBackup;
        this.availableMoves = [...this.turnSnapshot.initialAvailableMoves];
        this.dice.movesLeft = [...this.turnSnapshot.initialAvailableMoves];

        return true;
    }

    confirmTurnEnd() {
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.availableMoves = [];
        this.hasMovedFromHeadThisTurn = false;
        this.gameStatus = 'WAITING_FOR_DICE';
        this.turnSnapshot = null;
    }

    checkWinCondition() {
        let whiteCount = 0;
        let blackCount = 0;

        for (let i = 1; i <= 24; i++) {
            if (this.board.slots[i].player === 1) whiteCount += this.board.slots[i].count;
            if (this.board.slots[i].player === 2) blackCount += this.board.slots[i].count;
        }

        if (whiteCount === 0) { this.gameStatus = 'GAME_OVER'; return 1; }
        if (blackCount === 0) { this.gameStatus = 'GAME_OVER'; return 2; }
        return 0;
    }

    executeMove(fromSlot, diceValue) {
        if (this.gameStatus !== 'PLAYING') return false;

        const moveIndex = this.availableMoves.indexOf(diceValue);
        if (moveIndex === -1) return false;

        const headSlot = this.currentPlayer === 1 ? 1 : 13;
        if (fromSlot === headSlot && this.hasMovedFromHeadThisTurn) return false;

        const toSlot = this.board.calculateTargetSlot(this.currentPlayer, fromSlot, diceValue);

        if (!this.board.isValidMove(this.currentPlayer, fromSlot, toSlot)) return false;

        this.board.movePiece(fromSlot, toSlot);
        this.availableMoves.splice(moveIndex, 1);
        this.dice.useMove(diceValue);

        if (fromSlot === headSlot) {
            this.hasMovedFromHeadThisTurn = true;
        }

        return true;
    }

    // YENİ: app.js dosyasından gelen tıklama hedeflerini işleyen ana kural motoru
    processPlayerInput(selectedId, targetId) {
        let steps = targetId - selectedId;
        const allInHome = this.board.areAllPiecesInHomeBoard(1);
        let isBearOffAttempt = allInHome && (steps <= 0 || targetId >= 24);

        // A. TAŞ TOPLAMA SİMÜLASYONU
        if (isBearOffAttempt) {
            let chosenDiceValue = null;
            const exactRequired = 25 - selectedId;
            if (this.availableMoves.includes(exactRequired)) {
                chosenDiceValue = exactRequired;
            } else {
                const sortedDice = [...this.availableMoves].sort((a, b) => b - a);
                for (let zar of sortedDice) {
                    if (zar > exactRequired) { chosenDiceValue = zar; break; }
                }
            }
            if (chosenDiceValue !== null && this.executeMove(selectedId, chosenDiceValue)) {
                return true;
            }
        }

        // B. TEK ZARLA NORMAL HAMLE
        if (this.availableMoves.includes(steps) && this.executeMove(selectedId, steps)) {
            return true;
        } 
        
        // C. KOMBİNASYONLU ÇİFT ZAR HAMLESİ
        if (this.availableMoves.length >= 2) {
            for (let i = 0; i < this.availableMoves.length; i++) {
                for (let j = 0; j < this.availableMoves.length; j++) {
                    if (i === j) continue;
                    const zar1 = this.availableMoves[i];
                    const zar2 = this.availableMoves[j];
                    if (zar1 + zar2 === steps) {
                        const araDurak = this.board.calculateTargetSlot(1, selectedId, zar1);
                        if (this.board.isValidMove(1, selectedId, araDurak)) {
                            this.executeMove(selectedId, zar1);
                            this.executeMove(araDurak, zar2);
                            return true;
                        }
                    }
                }
            }
        }

        return false; // Hiçbir kurala uymadıysa hamle başarısızdır
    }

    hasValidMoves() {
        if (this.availableMoves.length === 0) return false;

        for (let fromSlot = 1; fromSlot <= 24; fromSlot++) {
            const slot = this.board.slots[fromSlot];
            if (slot.player === this.currentPlayer && slot.count > 0) {
                const headSlot = this.currentPlayer === 1 ? 1 : 13;
                if (fromSlot === headSlot && this.hasMovedFromHeadThisTurn) continue;

                const uniqueMoves = [...new Set(this.availableMoves)];
                for (let diceValue of uniqueMoves) {
                    const toSlot = this.board.calculateTargetSlot(this.currentPlayer, fromSlot, diceValue);
                    if (this.board.isValidMove(this.currentPlayer, fromSlot, toSlot)) {
                        return true; 
                    }
                }
            }
        }
        return false; 
    }
}
