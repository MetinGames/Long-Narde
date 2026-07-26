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
        this.headMovesThisTurn = 0; // YENİ: Baştan kaç taş çıkıldığını sayan değişken
        this.turnSnapshot = null;
    }

    initGame() { 
        this.board.setupInitialPieces(); 
        this.currentPlayer = 1; 
        this.gameStatus = 'WAITING_FOR_DICE'; 
        this.headMovesThisTurn = 0; 
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
            headMovesBackup: this.headMovesThisTurn, 
            initialAvailableMoves: [...this.availableMoves] 
        };
        return rollResult.values;
    }

    undoTurnMoves() {
        if (!this.turnSnapshot || this.gameStatus !== 'PLAYING') return false;
        this.board.slots = JSON.parse(JSON.stringify(this.turnSnapshot.slotsBackup)); 
        this.headMovesThisTurn = this.turnSnapshot.headMovesBackup;
        this.availableMoves = [...this.turnSnapshot.initialAvailableMoves]; 
        this.dice.movesLeft = [...this.turnSnapshot.initialAvailableMoves];
        return true;
    }

    confirmTurnEnd() { 
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1; 
        this.availableMoves = []; 
        this.headMovesThisTurn = 0; 
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
        
        // YENİ: Baştan çıkış kuralları (Head Rule)
        if (fromSlot === headSlot) {
            if (this.headMovesThisTurn >= 1) {
                // Sadece 3-3, 4-4, 6-6 çift zarlarında ikinci taşı çıkmaya izin ver
                const isSpecialDouble = this.dice.values[0] === this.dice.values[1] && 
                                       [3, 4, 6].includes(this.dice.values[0]);
                
                // Eğer özel çift zar değilse veya zaten 2 taş çıkıldıysa, hamle geçersizdir.
                if (!isSpecialDouble || this.headMovesThisTurn >= 2) {
                    return false;
                }
            }
        }

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

            if (!this.executeMove(currentSlot, diceValue)) {
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
                const headSlot = this.currentPlayer === 1 ? 1 : 13;
                
                // YENİ: Geçerli hamle ararken de baştan çıkış sınırını kontrol et
                if (fromSlot === headSlot) {
                    if (this.headMovesThisTurn >= 1) {
                        const isSpecialDouble = this.dice.values[0] === this.dice.values[1] && 
                                               [3, 4, 6].includes(this.dice.values[0]);
                        if (!isSpecialDouble || this.headMovesThisTurn >= 2) continue;
                    }
                }
                
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