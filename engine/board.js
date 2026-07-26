// engine/board.js

export class Board {
    constructor() {
        // 24 haneli tahta. İndeksler 1'den 24'e kadar.
        this.slots = Array(25).fill(null).map(() => ({
            count: 0,   // Hanedeki pul sayısı
            player: null // Pulun sahibi (1: Beyaz, 2: Siyah, null: Boş)
        }));
    }

    // Taşları Narde resmi kuralına göre başlangıç pozisyonuna getirir
    setupInitialPieces() {
        for (let i = 1; i <= 24; i++) {
            this.slots[i] = { count: 0, player: null };
        }

        // BEYAZ OYUNCU (1): 1. Haneye 15 Pul
        this.slots[1] = { count: 15, player: 1 };

        // SİYAH OYUNCU (2): 13. Haneye 15 Pul
        this.slots[13] = { count: 15, player: 2 };
        
        console.log("Narde resmi başlangıç dizilimi kuruldu.");
    }

    // Bir haneden pul alıp başka haneye koyma simülasyonu
    movePiece(from, to) {
        if (this.slots[from].count <= 0) return false;

        const player = this.slots[from].player;

        // Eski haneden pul düşür
        this.slots[from].count--;
        if (this.slots[from].count === 0) {
            this.slots[from].player = null;
        }

        // Taş toplama hamlesi kontrolü
        const isBearingOff = (player === 1 && to > 24) || (player === 2 && to > 12 && from <= 12);
        
        if (isBearingOff) {
            console.log(`Oyuncu ${player} bir pul topladı!`);
            return true; 
        }

        // Normal haneye pul ekle
        this.slots[to].count++;
        this.slots[to].player = player;

        return true;
    }

    // Yan yana 6'lı blok (Prime) ve rakip taş engeli kontrolü
    wouldCreateIllegalPrime(player, fromSlot, toSlot) {
        const currentCount = this.slots[toSlot] ? this.slots[toSlot].count : 0;
        const currentOwner = this.slots[toSlot] ? this.slots[toSlot].player : null;
        
        for (let start = 1; start <= 19; start++) {
            let consecutive = 0;
            for (let offset = 0; offset < 6; offset++) {
                const checkSlot = start + offset;
                if (checkSlot > 24) continue;

                const count = (checkSlot === toSlot) 
                    ? (currentOwner === player ? currentCount + 1 : 1) 
                    : (checkSlot === fromSlot ? this.slots[checkSlot].count - 1 : this.slots[checkSlot].count);
                const owner = (checkSlot === toSlot) ? player : this.slots[checkSlot].player;

                if (count > 0 && owner === player) {
                    consecutive++;
                } else {
                    consecutive = 0;
                }

                if (consecutive === 6) {
                    const opponent = player === 1 ? 2 : 1;
                    const primeEndSlot = checkSlot; 
                    let opponentAhead = false;
                    
                    for (let i = 1; i <= 24; i++) {
                        if (this.slots[i].player === opponent && this.slots[i].count > 0) {
                            if (player === 1 && i > primeEndSlot) opponentAhead = true;
                            if (player === 2) {
                                const relOpponent = (i >= 13) ? (i - 12) : (i + 12);
                                const relPrimeEnd = (primeEndSlot >= 13) ? (primeEndSlot - 12) : (primeEndSlot + 12);
                                if (relOpponent > relPrimeEnd) opponentAhead = true;
                            }
                        }
                    }
                    if (!opponentAhead) return true;
                }
            }
        }
        return false; 
    }

    // Bir hamlenin kurallara göre geçerli olup olmadığını kontrol eder
    isValidMove(player, from, to) {
        // 1. Seçilen hanede pul var mı ve oyuncunun kendisine mi ait?
        if (this.slots[from].player !== player || this.slots[from].count === 0) return false;

        // 2. TAŞ TOPLAMA KONTROLÜ
        const isBearingOff = (player === 1 && to > 24) || (player === 2 && to > 12 && from <= 12);
        
        if (isBearingOff) {
            return this.areAllPiecesInHomeBoard(player);
        }

        // 3. Normal Hamle Kontrolleri (Sınır dışı kontrolü)
        if (from < 1 || from > 24 || to < 1 || to > 24) return false;

        // 4. Hedef hanede rakip oyuncu var mı? (Narde'da tek pul bile olsa üzerine basılamaz!)
        if (this.slots[to].player !== null && this.slots[to].player !== player) {
            return false; 
        }

        // 5. 6'lı İllegal Blok (Prime) Kontrolü
        if (this.wouldCreateIllegalPrime(player, from, to)) {
            return false;
        }

        return true;
    }

    // Oyuncunun tüm taşları toplama alanına girdi mi kontrolü
    areAllPiecesInHomeBoard(player) {
        if (player === 1) {
            // Beyaz için toplama alanı: 19 - 24 arası haneler
            for (let i = 1; i <= 18; i++) {
                if (this.slots[i].player === 1 && this.slots[i].count > 0) return false;
            }
        } else {
            // Siyah için toplama alanı: 7 - 12 arası haneler
            for (let i = 1; i <= 24; i++) {
                if (i >= 7 && i <= 12) continue; 
                if (this.slots[i].player === 2 && this.slots[i].count > 0) return false;
            }
        }
        return true;
    }

    // Oyuncuların zar adımlarına göre hedef hanesini hesaplar
    calculateTargetSlot(player, from, steps) {
        if (player === 1) {
            return from + steps; // Beyaz düz ilerler
        } else {
            // Siyah döngüsel ilerler (13 -> 24 -> 1 -> 12)
            let target = from + steps;
            if (target > 24) {
                target = target - 24;
            }
            return target;
        }
    }
}