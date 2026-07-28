// engine/dice.js

export class Dice {
    constructor() {
        this.values = []; // Son atılan zarların değerleri
        this.movesLeft = [];  // Bu zarlarla yapılabilecek kalan hamleler
    }

    // 1-6 arasında rastgele iki zar üretir
    roll() {
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        
        this.values = [die1, die2];

        // Narde Kuralı: Çift gelirse 4 defa oynanır, farklı gelirse 2 defa
        if (die1 === die2) {
            this.movesLeft = [die1, die1, die1, die1];
        } else {
            this.movesLeft = [die1, die2];
        }

        return {
            values: this.values,
            movesLeft: [...this.movesLeft] // Kopyasını dönüyoruz
        };
    }

    // Bir hamle yapıldığında o zarı listeden düşer
    useMove(moveValue) {
        const index = this.movesLeft.indexOf(moveValue);
        if (index !== -1) {
            this.movesLeft.splice(index, 1);
            return true;
        }
        return false; // Geçersiz hamle değeri girilirse
    }

    // Kalan hamle var mı kontrolü
    hasMoves() {
        return this.movesLeft.length > 0;
    }

    reset() {
        this.values = [];
        this.movesLeft = [];
    }
}
