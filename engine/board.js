// engine/board.js

export class Board {
    constructor() {
        // 24 haneli tahta. İndeksler 1'den 24'e kadar. (0. indeks kullanılmaz)
        this.slots = Array(25).fill(null).map(() => ({
            count: 0,   // Hanedeki pul sayısı
            player: null // Pulun sahibi (1: Beyaz, 2: Siyah, null: Boş)
        }));
    }

    setupInitialPieces() {
        for (let i = 1; i <= 24; i++) {
            this.slots[i] = { count: 0, player: null };
        }

        // BEYAZ OYUNCU (1): 1. Haneye 15 Pul
        this.slots[1] = { count: 15, player: 1 };

        // SİYAH OYUNCU (2): 13. Haneye 15 Pul
        this.slots[13] = { count: 15, player: 2 };
    }

    movePiece(from, to) {
        if (this.slots[from].count <= 0) return false;

        const player = this.slots[from].player;

        // Eski haneden pul düşür
        this.slots[from].count--;
        if (this.slots[from].count === 0) {
            this.slots[from].player = null;
        }

        // Taş toplama hamlesi kontrolü (Bear-off)
        const isBearingOff = (player === 1 && to > 24) || (player === 2 && to > 12 && from <= 12);
        
        if (isBearingOff) {
            return true; // Pul tahtadan başarıyla çıkarıldı
        }

        // Normal haneye pul ekle
        this.slots[to].count++;
        this.slots[to].player = player;

        return true;
    }

    // YENİLENDİ: Döngüsel (Wrap-around) 6'lı blok kontrolü eklendi
    wouldCreateIllegalPrime(player, fromSlot, toSlot) {
        // Hedef hamle yapılmış gibi sanal bir tahta dizisi oluşturuyoruz
        const simulatedSlots = this.slots.map(slot => ({ ...slot }));
        
        simulatedSlots[fromSlot].count--;
        if (simulatedSlots[fromSlot].count === 0) simulatedSlots[fromSlot].player = null;
        
        // Eğer pul toplanıyorsa blok oluşamaz
        const isBearingOff = (player === 1 && toSlot > 24) || (player === 2 && toSlot > 12 && fromSlot <= 12);
        if (!isBearingOff) {
            simulatedSlots[toSlot].count++;
            simulatedSlots[toSlot].player = player;
        }

        // 24 haneyi döngüsel olarak kontrol et
        for (let start = 1; start <= 24; start++) {
            let consecutive = 0;
            let primeEndSlot = -1;

            for (let offset = 0; offset < 6; offset++) {
                let checkSlot = start + offset;
                if (checkSlot > 24) checkSlot -= 24; // Siyah için 24'ten 1'e dönüş

                if (simulatedSlots[checkSlot].count > 0 && simulatedSlots[checkSlot].player === player) {
                    consecutive++;
                    primeEndSlot = checkSlot;
                } else {
                    break; // Zincir kırıldı
                }
            }

            // Eğer 6'lı bir duvar oluştuysa, rakibin önünde pulu var mı diye bak
            if (consecutive === 6) {
                const opponent = player === 1 ? 2 : 1;
                let opponentAhead = false;
                
                for (let i = 1; i <= 24; i++) {
                    if (simulatedSlots[i].player === opponent && simulatedSlots[i].count > 0) {
                        if (player === 1 && i > primeEndSlot) {
                            opponentAhead = true;
                            break;
                        }
                        if (player === 2) {
                            // Siyahın döngüsel (relative) pozisyon hesabı
                            const relOpponent = (i >= 13) ? (i - 12) : (i + 12);
                            const relPrimeEnd = (primeEndSlot >= 13) ? (primeEndSlot - 12) : (primeEndSlot + 12);
                            if (relOpponent > relPrimeEnd) {
                                opponentAhead = true;
                                break;
                            }
                        }
                    }
                }
                
                // Rakibin önünde hiç pulu yoksa (yani tamamen hapsedildiyse) bu hamle YASAKTIR.
                if (!opponentAhead) return true; 
            }
        }
        return false; 
    }

    isValidMove(player, from, to) {
        if (this.slots[from].player !== player || this.slots[from].count === 0) return false;

        const isBearingOff = (player === 1 && to > 24) || (player === 2 && to > 12 && from <= 12);
        
        if (isBearingOff) {
            return this.areAllPiecesInHomeBoard(player);
        }

        if (from < 1 || from > 24 || to < 1 || to > 24) return false;

        // Hedef hanede rakip oyuncu var mı? (Narde'da vurma yoktur)
        if (this.slots[to].player !== null && this.slots[to].player !== player) {
            return false; 
        }

        // 6'lı İllegal Blok (Prime) Kontrolü
        if (this.wouldCreateIllegalPrime(player, from, to)) {
            return false;
        }

        return true;
    }

    areAllPiecesInHomeBoard(player) {
        if (player === 1) {
            // Beyaz ev: 19-24
            for (let i = 1; i <= 18; i++) {
                if (this.slots[i].player === 1 && this.slots[i].count > 0) return false;
            }
        } else {
            // Siyah ev: 7-12
            for (let i = 1; i <= 24; i++) {
                if (i >= 7 && i <= 12) continue; 
                if (this.slots[i].player === 2 && this.slots[i].count > 0) return false;
            }
        }
        return true;
    }

    calculateTargetSlot(player, from, steps) {
        if (player === 1) {
            return from + steps;
        } else {
            let target = from + steps;
            if (from <= 24 && target > 24) {
                target = target - 24;
            }
            return target;
        }
    }
}