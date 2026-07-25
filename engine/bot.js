// engine/bot.js

export class NardeBot {
    constructor(playerNumber = 2) {
        this.playerNumber = playerNumber; // Bot genellikle 2. oyuncudur (Siyah)
    }

    // Botun hamle kararını veren ana fonksiyon
    makeDecision(game) {
        // Eğer eldeki zarlar bittiyse veya yasal hamle kalmadıysa hamle yapma
        if (game.availableMoves.length === 0 || !game.hasValidMoves()) {
            return null; // Sıra bitmeli
        }

        // 1. Aşama: Tüm yasal olarak yapılabilecek hamleleri listele
        let legalMoves = [];

        for (let fromSlot = 1; fromSlot <= 24; fromSlot++) {
            const slot = game.board.slots[fromSlot];

            // Hane bota aitse ve içinde pul varsa
            if (slot.player === this.playerNumber && slot.count > 0) {
                
                // Narde Baş kuralı kontrolü
                const headSlot = this.playerNumber === 1 ? 1 : 13;
                if (fromSlot === headSlot && game.hasMovedFromHeadThisTurn) {
                    continue; 
                }

                // Eldeki zarları tara
                const uniqueMoves = [...new Set(game.availableMoves)];
                for (let diceValue of uniqueMoves) {
                    const toSlot = game.board.calculateTargetSlot(this.playerNumber, fromSlot, diceValue);
                    
                    if (game.board.isValidMove(this.playerNumber, fromSlot, toSlot)) {
                        // Geçerli bir hamle bulduk, listeye ekle
                        legalMoves.push({
                            from: fromSlot,
                            dice: diceValue,
                            score: this.evaluateMove(fromSlot, toSlot, game) // Hamleye puan ver
                        });
                    }
                }
            }
        }

        // Eğer hiçbir yasal hamle bulunamadıysa
        if (legalMoves.length === 0) return null;

        // 2. Aşama: Hamleleri puanlarına göre büyükten küçüğe sırala ve en iyisini seç
        legalMoves.sort((a, b) => b.score - a.score);
        return legalMoves[0]; // En yüksek puanlı hamleyi dön
    }

    // Bir hamlenin stratejik olarak ne kadar iyi olduğunu puanlayan basit yapay zeka mantığı
    evaluateMove(from, to, game) {
        let score = 0;

        // Kural A: Güvenli hane oluşturma veya pulları üst üste bindirme (Tavla taktiği)
        if (game.board.slots[to].count > 0 && game.board.slots[to].player === this.playerNumber) {
            score += 10; // Kendi taşımızın üzerine basıyorsak güvenlidir, puan ver
        }

        // Kural B: Baş (Head) noktasından taş çıkarmaya makul bir öncelik ver
        const headSlot = this.playerNumber === 1 ? 1 : 13;
        if (from === headSlot) {
            score += 5;
        }

        // Kural C: Taş toplama aşamasındaysak taş toplamaya devasa öncelik ver
        const isBearOff = to > 24 || (this.playerNumber === 2 && to > 12 && from <= 12);
        if (isBearOff) {
            score += 100; // Taş toplamak her zaman en iyisidir!
        }

        // Küçük bir rastgelelik ekleyelim ki bot her seferinde robotik olarak tamamen aynı oynamasın
        score += Math.random() * 3;

        return score;
    }
}
