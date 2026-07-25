// engine/board.js

export class Board {
    constructor() {
        // 24 haneli tahta. İndeksler kolaylık olsun diye 1'den 24'e kadar olacak.
        // 0. indeksi kullanmayacağız, kafamız karışmasın.
        this.slots = Array(25).fill(null).map(() => ({
            count: 0,   // Hanedeki pul sayısı
            player: null // Pulun sahibi (1: Beyaz, 2: Siyah, null: Boş)
        }));
    }

    // Taşları Narde resmi kuralına göre başlangıç pozisyonuna getirir
    setupInitialPieces() {
        // Tüm tahtayı temizle
        for (let i = 1; i <= 24; i++) {
            this.slots[i] = { count: 0, player: null };
        }

        // BEYAZ OYUNCU (1) BAŞLANGICI: 1. Haneye 15 Pul (Beyazın Baş / Home noktası)
        this.slots[1] = { count: 15, player: 1 };

        // SİYAH OYUNCU (2) BAŞLANGICI: 13. Haneye 15 Pul (Siyahın Baş / Home noktası)
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

        // Eğer hamle bir taş toplama hamlesiyse (yani tahta dışına çıktıysa)
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
