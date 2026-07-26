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
        let w = 0, b = 0;
        for (let i = 1; i <= 24; i++) {
            if (this.board.slots[i].player === 1) w += this.board.slots[i].count;
            if (this.board.slots[i].player === 2) b += this.board.slots[i].count;
        }
        if (w === 0) { this.gameStatus = 'GAME_OVER'; return 1; }
        if (b === 0) { this.gameStatus = 'GAME_OVER'; return 2; }
        return 0;
    }

    executeMove(fromSlot, diceValue) {
        if (this.gameStatus !== 'PLAYING') return false;
        const moveIndex = this.availableMoves.indexOf(diceValue);
        if (moveIndex === -1) return false;
        
        const headSlot = this.currentPlayer === 1 ? 1 : 13;
        
        if (fromSlot === headSlot && this.hasMovedFromHeadThisTurn) {
            const isSpecialDouble = this.dice.values[0] === this.dice.values[1] && 
                                   [3, 4, 6].includes(this.dice.values[0]);
            
            if (!isSpecialDouble) {
                return false;
            }
        }

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

    processPlayerInput(selectedId, targetId) {
        let steps = targetId - selectedId;
        if (this.currentPlayer === 2 && steps < 0) steps += 24;
        const allInHome = this.board.areAllPiecesInHomeBoard(this.currentPlayer);
        
        let isBearOffAttempt = false;
        if (this.currentPlayer === 1 && allInHome && (steps <= 0 || targetId >= 24)) isBearOffAttempt = true;
        if (this.currentPlayer === 2 && allInHome && (selectedId >= 7 && selectedId <= 12) && (targetId > 12 || targetId < 7)) isBearOffAttempt = true;

        if (isBearOffAttempt) {
            let chosenDiceValue = null; 
            const exactRequired = this.currentPlayer === 1 ? (25 - selectedId) : (13 - selectedId);
            if (this.availableMoves.includes(exactRequired)) { 
                chosenDiceValue = exactRequired; 
            } else {
                const sortedDice = [...this.availableMoves].sort((a, b) => b - a);
                for (let zar of sortedDice) { if (zar > exactRequired) { chosenDiceValue = zar; break; } }
            }
            if (chosenDiceValue !== null && this.executeMove(selectedId, chosenDiceValue)) return true;
        }

        // ÇİFT ZAR KONTROLÜ
        const isDouble = this.availableMoves.length >= 2 && this.availableMoves[0] === this.availableMoves[1];
        if (isDouble) {
            const zarDegeri = this.availableMoves[0];
            if (steps % zarDegeri === 0) {
                const katSayisi = steps / zarDegeri;
                if (katSayisi <= this.availableMoves.length) {
                    let aktifDurak = selectedId; let yolTemiz = true;
                    for (let i = 1; i <= katSayisi; i++) {
                        aktifDurak = this.board.calculateTargetSlot(this.currentPlayer, aktifDurak, zarDegeri);
                        if (!this.board.isValidMove(this.currentPlayer, selectedId, aktifDurak)) { yolTemiz = false; break; }
                    }
                    if (yolTemiz) {
                        let simDurak = selectedId;
                        for (let i = 1; i <= katSayisi; i++) {
                            const sonraki = this.board.calculateTargetSlot(this.currentPlayer, simDurak, zarDegeri);
                            this.executeMove(simDurak, zarDegeri); 
                            simDurak = sonraki;
                        }
                        return true;
                    }
                }
            }
        }

        if (this.availableMoves.includes(steps) && this.executeMove(selectedId, steps)) return true;
        
        // NORMAL FARKLI ZAR KOMBİNASYONU
        if (this.availableMoves.length >= 2 && !isDouble) {
            const zar1 = this.availableMoves[0]; 
            const zar2 = this.availableMoves[1];
            if (zar1 + zar2 === steps) {
                const araDurak1 = this.board.calculateTargetSlot(this.currentPlayer, selectedId, zar1);
                if (this.board.isValidMove(this.currentPlayer, selectedId, araDurak1)) {
                    this.executeMove(selectedId, zar1); 
                    this.executeMove(araDurak1, zar2);
                    return true;
                }
                
                const araDurak2 = this.board.calculateTargetSlot(this.currentPlayer, selectedId, zar2);
                if (this.board.isValidMove(this.currentPlayer, selectedId, araDurak2)) {
                    this.executeMove(selectedId, zar2); 
                    this.executeMove(araDurak2, zar1);
                    return true;
                }
            }
        }
        return false;
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
                    if (this.board.isValidMove(this.currentPlayer, fromSlot, toSlot)) return true;
                }
            }
        }
        return false;
    }
}