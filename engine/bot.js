// engine/bot.js

export class NardeBot {
    // Varsayılan olarak 'medium' zorlukla başlar. İleride UI'dan 'easy' veya 'hard' gönderebilirsin.
    constructor(playerNumber = 2, difficulty = 'medium') {
        this.playerNumber = playerNumber;
        this.difficulty = difficulty; 
    }

    makeDecision(game) {
        if (game.availableMoves.length === 0 || !game.hasValidMoves()) {
            return null;
        }

        let legalMoves = [];

        for (let fromSlot = 1; fromSlot <= 24; fromSlot++) {
            const slot = game.board.slots[fromSlot];

            if (slot.player === this.playerNumber && slot.count > 0) {
                
                const headSlot = game.board.getHeadSlot(this.playerNumber);
                
                // YENİ KURAL MOTORU ENTEGRASYONU: Bot artık baştan çıkış sınırına saygı duymak ZORUNDA!
                if (fromSlot === headSlot && !game.canMoveFromHead()) continue;

                const uniqueMoves = [...new Set(game.availableMoves)];
                for (let diceValue of uniqueMoves) {
                    if (!game.canUseDiceValue(diceValue)) continue;
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

        // Hamleleri puanına göre büyükten küçüğe sırala ve en iyisini seç
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

        // Pul toplama aşamasına gelindiyse, başka hiçbir şey düşünme, taşı çık!
        if (isBearOff) return 10000; 

        // --- ZORLUK SEVİYELERİ ---

        // 1. KOLAY SEVİYE: Sadece zar atar ve rastgele oynar.
        if (this.difficulty === 'easy') {
            return Math.random() * 100;
        }

        // 2. ORTA SEVİYE: Temel hayatta kalma mantığı
        // Kendi taşının üzerine gidip duvar (blok) örmek çok iyidir
        if (game.board.slots[to] && game.board.slots[to].count > 0 && game.board.slots[to].player === this.playerNumber) {
            score += 25; 
        }

        // Geride tek pul bırakmak tehlikelidir, duvar örmeyi zorlaştırır
        if (game.board.slots[from].count === 1) {
            score -= 15; 
        }

        // Baştan pul çıkıp oyuna dahil etmek avantajdır
        const headSlot = this.playerNumber === 1 ? 1 : 13;
        if (from === headSlot) {
            score += 20;
        }

        // İleriye gitmek ufak bir puandır
        score += (to > from ? to - from : (24 - from + to)) * 0.5;

        // Aynı puana sahip hamlelerde döngüye girmemesi için ufak bir rastgelelik
        score += Math.random() * 2;

        // 3. ZOR SEVİYE (MASTERMIND): Orta seviyenin üstüne ileri düzey taktikler ekler
        if (this.difficulty === 'hard') {
            // Rakibin hedef alanına (kendi toplama evimize) taş yığmayı agresifçe önceliklendir
            if (this.playerNumber === 1 && to > 15) score += 15;
            if (this.playerNumber === 2 && to > 3 && to < 13) score += 15;
            
            // Eğer bu hamle halihazırda var olan bir bloğun hemen yanına iniyorsa (6'lı prime kurma hazırlığı) ekstra puan ver
            const checkForward = game.board.calculateTargetSlot(this.playerNumber, to, 1);
            const checkBackward = game.board.calculateTargetSlot(this.playerNumber, to, -1);
            if (game.board.slots[checkForward]?.player === this.playerNumber) score += 10;
            if (game.board.slots[checkBackward]?.player === this.playerNumber) score += 10;
        }

        return score;
    }
}
