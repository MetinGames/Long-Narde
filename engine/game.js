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
        this.dice.reset();
        this.currentPlayer = 1; 
        this.gameStatus = 'WAITING_FOR_DICE'; 
        this.availableMoves = [];
        this.headMovesThisTurn = 0;
        this.turnsCompleted = { 1: 0, 2: 0 };
        this.turnSnapshot = null; 
    }

    rollDice() {
        if (this.gameStatus !== 'WAITING_FOR_DICE') return null;
        const rollResult = this.dice.roll();
        this.availableMoves = [...rollResult.movesLeft]; 
        this.gameStatus = 'PLAYING';
        this.headMovesThisTurn = 0; // Her zar atıldığında baştan çıkış sayısı sıfırlanır
        this.turnSnapshot = { 
            slotsBackup: JSON.parse(JSON.stringify(this.board.slots)), 
            borneOffBackup: { ...this.board.borneOff },
            headMovesBackup: this.headMovesThisTurn, 
            initialAvailableMoves: [...this.availableMoves] 
        };
        return rollResult.values;
    }

    undoTurnMoves() {
        if (!this.turnSnapshot || this.gameStatus !== 'PLAYING') return false;
        this.board.slots = JSON.parse(JSON.stringify(this.turnSnapshot.slotsBackup)); 
        this.board.borneOff = { ...this.turnSnapshot.borneOffBackup };
        this.headMovesThisTurn = this.turnSnapshot.headMovesBackup;
        this.availableMoves = [...this.turnSnapshot.initialAvailableMoves]; 
        this.dice.movesLeft = [...this.turnSnapshot.initialAvailableMoves];
        return true;
    }

    confirmTurnEnd() { 
        this.turnsCompleted[this.currentPlayer]++;
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1; 
        this.availableMoves = []; 
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

    createRuleStateSnapshot() {
        return {
            slots: JSON.parse(JSON.stringify(this.board.slots)),
            borneOff: { ...this.board.borneOff },
            availableMoves: [...this.availableMoves],
            diceMovesLeft: [...this.dice.movesLeft],
            headMovesThisTurn: this.headMovesThisTurn
        };
    }

    restoreRuleState(snapshot) {
        this.board.slots = JSON.parse(JSON.stringify(snapshot.slots));
        this.board.borneOff = { ...snapshot.borneOff };
        this.availableMoves = [...snapshot.availableMoves];
        this.dice.movesLeft = [...snapshot.diceMovesLeft];
        this.headMovesThisTurn = snapshot.headMovesThisTurn;
    }

    getMaximumPlayableMoveCount() {
        let maximum = 0;
        const uniqueMoves = [...new Set(this.availableMoves)];

        for (const diceValue of uniqueMoves) {
            for (let fromSlot = 1; fromSlot <= 24; fromSlot++) {
                const snapshot = this.createRuleStateSnapshot();
                if (this.executeMove(fromSlot, diceValue, false)) {
                    maximum = Math.max(
                        maximum,
                        1 + this.getMaximumPlayableMoveCount()
                    );
                }
                this.restoreRuleState(snapshot);
            }
        }

        return maximum;
    }

    getRequiredFirstDiceValues() {
        const branchLengths = new Map();
        const uniqueMoves = [...new Set(this.availableMoves)];

        for (const diceValue of uniqueMoves) {
            let bestForDice = 0;
            for (let fromSlot = 1; fromSlot <= 24; fromSlot++) {
                const snapshot = this.createRuleStateSnapshot();
                if (this.executeMove(fromSlot, diceValue, false)) {
                    bestForDice = Math.max(
                        bestForDice,
                        1 + this.getMaximumPlayableMoveCount()
                    );
                }
                this.restoreRuleState(snapshot);
            }
            if (bestForDice > 0) branchLengths.set(diceValue, bestForDice);
        }

        if (branchLengths.size === 0) return [];

        const maximum = Math.max(...branchLengths.values());
        let required = [...branchLengths.entries()]
            .filter(([, length]) => length === maximum)
            .map(([diceValue]) => diceValue);

        // İki farklı zardan yalnız biri oynanabiliyorsa büyük zar zorunludur.
        if (maximum === 1 && required.length > 1) {
            required = [Math.max(...required)];
        }

        return required;
    }

    canUseDiceValue(diceValue) {
        return this.getRequiredFirstDiceValues().includes(diceValue);
    }

    executeMove(fromSlot, diceValue, enforceDiceUsage = true) {
        if (this.gameStatus !== 'PLAYING') return false;
        const moveIndex = this.availableMoves.indexOf(diceValue);
        if (moveIndex === -1) return false;
        if (enforceDiceUsage && !this.canUseDiceValue(diceValue)) return false;
        
        const headSlot = this.board.getHeadSlot(this.currentPlayer);
        
        // YENİ: Baştan çıkış kuralları (Head Rule)
        if (fromSlot === headSlot && !this.canMoveFromHead()) return false;

        const toSlot = this.board.calculateTargetSlot(this.currentPlayer, fromSlot, diceValue);
        if (!this.board.isValidMove(this.currentPlayer, fromSlot, toSlot)) return false;

        this.board.movePiece(fromSlot, toSlot);
        this.availableMoves.splice(moveIndex, 1); 
        this.dice.useMove(diceValue);
        
        if (fromSlot === headSlot) {
            this.headMovesThisTurn++; // Çıkan taşı say
        }
        return true;
    }

    canPlayDiceSequence(fromSlot, diceValues) {
        const slotsBackup = JSON.parse(JSON.stringify(this.board.slots));
        const borneOffBackup = { ...this.board.borneOff };
        const availableMovesBackup = [...this.availableMoves];
        const diceMovesBackup = [...this.dice.movesLeft];
        const headMoveBackup = this.headMovesThisTurn;

        let currentSlot = fromSlot;
        let sequenceIsValid = true;

        for (let i = 0; i < diceValues.length; i++) {
            const diceValue = diceValues[i];
            const targetSlot = this.board.calculateTargetSlot(
                this.currentPlayer,
                currentSlot,
                diceValue
            );

            if (!this.executeMove(currentSlot, diceValue, false)) {
                sequenceIsValid = false;
                break;
            }

            currentSlot = targetSlot;

            if (
                (currentSlot < 1 || currentSlot > 24) &&
                i < diceValues.length - 1
            ) {
                sequenceIsValid = false;
                break;
            }
        }

        this.board.slots = slotsBackup;
        this.board.borneOff = borneOffBackup;
        this.availableMoves = availableMovesBackup;
        this.dice.movesLeft = diceMovesBackup;
        this.headMovesThisTurn = headMoveBackup;

        return sequenceIsValid ? currentSlot : null;
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
        
        if (this.availableMoves.length >= 2 && !isDouble) {
            const zar1 = this.availableMoves[0];
            const zar2 = this.availableMoves[1];

            const oynamaSiraları = [
                [zar1, zar2],
                [zar2, zar1]
            ];

            for (const zarSirasi of oynamaSiraları) {
                const toplamHedef = this.canPlayDiceSequence(
                    selectedId,
                    zarSirasi
                );

                if (toplamHedef === targetId) {
                    let aktifHane = selectedId;

                    for (const zar of zarSirasi) {
                        const sonrakiHane = this.board.calculateTargetSlot(
                            this.currentPlayer,
                            aktifHane,
                            zar
                        );

                        this.executeMove(aktifHane, zar);
                        aktifHane = sonrakiHane;
                    }

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
                const headSlot = this.board.getHeadSlot(this.currentPlayer);
                
                // YENİ: Geçerli hamle ararken de baştan çıkış sınırını kontrol et
                if (fromSlot === headSlot && !this.canMoveFromHead()) continue;
                
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
