// engine/renderer.js

export class Renderer {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        if (this.canvas) this.ctx = this.canvas.getContext('2d');
        
        this.currentPlayerText = document.getElementById('current-player');
        this.die1Text = document.getElementById('die1');
        this.die2Text = document.getElementById('die2');
        this.statusMessage = document.getElementById('status-message');

        this.boardWidth = 800; this.boardHeight = 600; this.borderSize = 20; this.barWidth = 30;
        this.highlightedSlots = [];
    }

    render(game, selectedSlotId = null) {
        if (!this.ctx) {
            this.canvas = document.getElementById('game-canvas');
            if (!this.canvas) return;
            this.ctx = this.canvas.getContext('2d');
        }

        this.calculateHighlights(game, selectedSlotId);

        this.ctx.clearRect(0, 0, this.boardWidth, this.boardHeight);
        this.ctx.fillStyle = '#8b5a2b'; this.ctx.fillRect(0, 0, this.boardWidth, this.boardHeight);
        this.ctx.fillStyle = '#1e4620'; this.ctx.fillRect(this.borderSize, this.borderSize, this.boardWidth - (this.borderSize * 2), this.boardHeight - (this.borderSize * 2));
        this.ctx.fillStyle = '#6d4219'; this.ctx.fillRect((this.boardWidth / 2) - (this.barWidth / 2), this.borderSize, this.barWidth, this.boardHeight - (this.borderSize * 2));

        const usableWidth = this.boardWidth - (this.borderSize * 2) - this.barWidth;
        const slotWidth = usableWidth / 12;
        const slotHeight = 220;

        for (let i = 13; i <= 24; i++) {
            const colIndex = i - 13; const x = this.getSlotX(colIndex, slotWidth);
            this.drawTriangle(x, this.borderSize, slotWidth, slotHeight, true, i, i % 2 === 0);
            if (this.highlightedSlots.includes(i)) this.drawHighlightGlow(x, this.borderSize, slotWidth, slotHeight, true);
            this.drawPieces(x, this.borderSize, slotWidth, game.board.slots[i], true, selectedSlotId === i);
        }

        for (let i = 12; i >= 1; i--) {
            const colIndex = 12 - i; const x = this.getSlotX(colIndex, slotWidth); const y = this.boardHeight - this.borderSize;
            this.drawTriangle(x, y, slotWidth, slotHeight, false, i, i % 2 === 0);
            if (this.highlightedSlots.includes(i)) this.drawHighlightGlow(x, y, slotWidth, slotHeight, false);
            this.drawPieces(x, y, slotWidth, game.board.slots[i], false, selectedSlotId === i);
        }

        if (this.currentPlayerText) this.currentPlayerText.textContent = game.currentPlayer === 1 ? 'Beyaz' : 'Siyah';
        if (game.dice.values && game.dice.values.length > 0) {
            if (this.die1Text) this.die1Text.textContent = game.dice.values[0];
            if (this.die2Text) this.die2Text.textContent = game.dice.values[1];
        } else {
            if (this.die1Text) this.die1Text.textContent = '-';
            if (this.die2Text) this.die2Text.textContent = '-';
        }
    }

    getSlotX(colIndex, slotWidth) {
        let x = this.borderSize + (colIndex * slotWidth);
        if (colIndex >= 6) x += this.barWidth;
        return x;
    }

    drawTriangle(x, y, width, height, isTop, slotId, isEven) {
        this.ctx.beginPath();
        if (isTop) { this.ctx.moveTo(x, y); this.ctx.lineTo(x + width, y); this.ctx.lineTo(x + (width / 2), y + height); }
        else { this.ctx.moveTo(x, y); this.ctx.lineTo(x + width, y); this.ctx.lineTo(x + (width / 2), y - height); }
        this.ctx.closePath();
        this.ctx.fillStyle = isEven ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.15)'; this.ctx.fill();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; this.ctx.font = '10px sans-serif';
        this.ctx.fillText(slotId, x + (width / 2) - 5, isTop ? y + height + 15 : y - height - 5);
    }

    drawHighlightGlow(x, y, width, height, isTop) {
        this.ctx.beginPath();
        if (isTop) { this.ctx.moveTo(x, y); this.ctx.lineTo(x + width, y); this.ctx.lineTo(x + (width / 2), y + height); }
        else { this.ctx.moveTo(x, y); this.ctx.lineTo(x + width, y); this.ctx.lineTo(x + (width / 2), y - height); }
        this.ctx.closePath();
        this.ctx.fillStyle = 'rgba(46, 204, 113, 0.35)'; this.ctx.fill();
    }

    // DÜZELTİLDİ: Benzersiz dinamik dizi taramasıyla birleşik zarları yakalar
    calculateHighlights(game, selectedSlotId) {
        this.highlightedSlots = [];
        if (selectedSlotId === null || game.gameStatus !== 'PLAYING') return;

        const headSlot = game.currentPlayer === 1 ? 1 : 13;
        if (selectedSlotId === headSlot && game.hasMovedFromHeadThisTurn) return;

        const isDouble = game.availableMoves.length >= 2 && game.availableMoves[0] === game.availableMoves[1];

        if (isDouble) {
            const zarDegeri = game.availableMoves[0];
            let aktifDurak = selectedSlotId;
            for (let i = 1; i <= game.availableMoves.length; i++) {
                aktifDurak = game.board.calculateTargetSlot(game.currentPlayer, aktifDurak, zarDegeri);
                if (game.board.isValidMove(game.currentPlayer, selectedSlotId, aktifDurak)) {
                    this.highlightedSlots.push(aktifDurak);
                } else { break; }
            }
        } else {
            const uniqueMoves = [...new Set(game.availableMoves)];
            
            for (let zar of uniqueMoves) {
                const target = game.board.calculateTargetSlot(game.currentPlayer, selectedSlotId, zar);
                if (game.board.isValidMove(game.currentPlayer, selectedSlotId, target)) {
                    this.highlightedSlots.push(target);
                }
            }
            
                       if (game.availableMoves.length >= 2) {
                const zar1 = game.availableMoves[0];
                const zar2 = game.availableMoves[1];

                // Önce birinci, sonra ikinci zar
                const toplamHedef1 = game.canPlayDiceSequence(
                    selectedSlotId,
                    [zar1, zar2]
                );

                // Önce ikinci, sonra birinci zar
                const toplamHedef2 = game.canPlayDiceSequence(
                    selectedSlotId,
                    [zar2, zar1]
                );

                if (
                    toplamHedef1 !== null &&
                    toplamHedef1 >= 1 &&
                    toplamHedef1 <= 24
                ) {
                    this.highlightedSlots.push(toplamHedef1);
                }

                if (
                    toplamHedef2 !== null &&
                    toplamHedef2 >= 1 &&
                    toplamHedef2 <= 24
                ) {
                    this.highlightedSlots.push(toplamHedef2);
                }

                // Aynı hedef iki defa eklendiyse teke indir.
                                this.highlightedSlots = [...new Set(this.highlightedSlots)];
            }
        }
    }

    drawPieces(x, y, slotWidth, slotData, isTop, isSelected) {
        if (!slotData || slotData.count === 0) return;
        const radius = (slotWidth / 2) - 2; const centerX = x + (slotWidth / 2);
        const maxVerticalArea = 200; let spacing = radius * 2;
        if (slotData.count * spacing > maxVerticalArea) spacing = maxVerticalArea / slotData.count;

        for (let i = 0; i < slotData.count; i++) {
            let centerY = isTop ? y + radius + 5 + (i * spacing) : y - radius - 5 - (i * spacing);
            if (isSelected && i === slotData.count - 1) {
                this.ctx.beginPath(); this.ctx.arc(centerX, centerY, radius + 4, 0, Math.PI * 2);
                this.ctx.fillStyle = '#e67e22'; this.ctx.fill();
            }
            this.ctx.beginPath(); this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            this.ctx.fillStyle = slotData.player === 1 ? '#f5f6fa' : '#2f3640'; this.ctx.fill();
            this.ctx.lineWidth = 2; this.ctx.strokeStyle = slotData.player === 1 ? '#dcdde1' : '#1e272e'; this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.arc(centerX, centerY, radius / 2, 0, Math.PI * 2);
            this.ctx.strokeStyle = slotData.player === 1 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'; this.ctx.stroke();
        }
    }

    updateStatus(message) { if (this.statusMessage) this.statusMessage.textContent = message; }
}
