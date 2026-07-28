// engine/renderer.js

export class Renderer {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        if (this.canvas) this.ctx = this.canvas.getContext('2d');
        
        this.currentPlayerText = document.getElementById('current-player');
        this.die1Text = document.getElementById('die1');
        this.die2Text = document.getElementById('die2');
        this.statusMessage = document.getElementById('status-message');

        this.boardWidth = 800; 
        this.boardHeight = 600; 
        this.borderSize = 20; 
        this.barWidth = 30;
        this.trayWidth = 55; 
        this.highlightedSlots = [];
    }

    render(game, selectedSlotId = null) {
        if (!this.ctx) {
            this.canvas = document.getElementById('game-canvas');
            if (!this.canvas) return;
            this.ctx = this.canvas.getContext('2d');
        }

        this.calculateHighlights(game, selectedSlotId);

        // --- LÜKS MASİF CEVİZ DIŞ ÇERÇEVE ---
        this.ctx.clearRect(0, 0, this.boardWidth, this.boardHeight);
        
        const frameGrad = this.ctx.createLinearGradient(0, 0, this.boardWidth, this.boardHeight);
        frameGrad.addColorStop(0, '#2b170b');
        frameGrad.addColorStop(0.5, '#1a0e06');
        frameGrad.addColorStop(1, '#382010');
        this.ctx.fillStyle = frameGrad;
        this.ctx.fillRect(0, 0, this.boardWidth, this.boardHeight);
        
        // İç Tahta (Kadife Dokulu Derin Kahve Zemin)
        const innerWidth = this.boardWidth - (this.borderSize * 2) - this.trayWidth;
        const boardGrad = this.ctx.createLinearGradient(this.borderSize, this.borderSize, this.borderSize + innerWidth, this.boardHeight);
        boardGrad.addColorStop(0, '#2e1c10');
        boardGrad.addColorStop(1, '#1b1008');
        this.ctx.fillStyle = boardGrad;
        this.ctx.fillRect(this.borderSize, this.borderSize, innerWidth, this.boardHeight - (this.borderSize * 2));
        
        // Orta Bar (Masif İşlemeli Ahşap Sütun)
        const barX = this.borderSize + (innerWidth / 2) - (this.barWidth / 2);
        const barGrad = this.ctx.createLinearGradient(barX, this.borderSize, barX + this.barWidth, this.boardHeight);
        barGrad.addColorStop(0, '#190e07');
        barGrad.addColorStop(0.5, '#2d1b0f');
        barGrad.addColorStop(1, '#120a05');
        this.ctx.fillStyle = barGrad;
        this.ctx.fillRect(barX, this.borderSize, this.barWidth, this.boardHeight - (this.borderSize * 2));

        // Bar Üstüne İnce Altın Çizgi Gölgeleri
        this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.15)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(barX, this.borderSize, this.barWidth, this.boardHeight - (this.borderSize * 2));

        const usableWidth = innerWidth - this.barWidth;
        const slotWidth = usableWidth / 12;
        const slotHeight = 220;

        // Üst Haneler (1-12)
        for (let i = 12; i >= 1; i--) {
            const colIndex = 12 - i; 
            const x = this.getSlotX(colIndex, slotWidth, innerWidth);
            this.drawMastermindTriangle(x, this.borderSize, slotWidth, slotHeight, true, i, i % 2 === 0);
            if (this.highlightedSlots.includes(i)) this.drawHighlightGlow(x, this.borderSize, slotWidth, slotHeight, true);
            this.drawMastermindPieces(x, this.borderSize, slotWidth, game.board.slots[i], true, selectedSlotId === i);
        }

        // Alt Haneler (13-24)
        for (let i = 13; i <= 24; i++) {
            const colIndex = i - 13; 
            const x = this.getSlotX(colIndex, slotWidth, innerWidth); 
            const y = this.boardHeight - this.borderSize;
            this.drawMastermindTriangle(x, y, slotWidth, slotHeight, false, i, i % 2 === 0);
            if (this.highlightedSlots.includes(i)) this.drawHighlightGlow(x, y, slotWidth, slotHeight, false);
            this.drawMastermindPieces(x, y, slotWidth, game.board.slots[i], false, selectedSlotId === i);
        }

        // Toplama Tepsileri ve Pip Sayacı
        this.drawBearOffTrays(game);

        // UI Metin Güncellemeleri
        if (this.currentPlayerText) this.currentPlayerText.textContent = game.currentPlayer === 1 ? 'Beyaz' : 'Siyah';
        if (game.dice.values && game.dice.values.length > 0) {
            if (this.die1Text) this.die1Text.textContent = game.dice.values[0];
            if (this.die2Text) this.die2Text.textContent = game.dice.values[1];
        } else {
            if (this.die1Text) this.die1Text.textContent = '-';
            if (this.die2Text) this.die2Text.textContent = '-';
        }
    }

    getSlotX(colIndex, slotWidth, innerWidth) {
        let x = this.borderSize + (colIndex * slotWidth);
        if (colIndex >= 6) x += this.barWidth;
        return x;
    }

    // SEDEF KAKMALI VE ALTIN YALDIZLI MASTERMIND ÜÇGENLERİ
    drawMastermindTriangle(x, y, width, height, isTop, slotId, isEven) {
        this.ctx.beginPath();
        if (isTop) { 
            this.ctx.moveTo(x, y); 
            this.ctx.lineTo(x + width, y); 
            this.ctx.lineTo(x + (width / 2), y + height); 
        } else { 
            this.ctx.moveTo(x, y); 
            this.ctx.lineTo(x + width, y); 
            this.ctx.lineTo(x + (width / 2), y - height); 
        }
        this.ctx.closePath();
        
        // Sedef ve Maun Kontrast Geçişleri
        const triGrad = this.ctx.createLinearGradient(x, y, x + width, y + (isTop ? height : -height));
        if (isEven) {
            triGrad.addColorStop(0, '#594028');
            triGrad.addColorStop(1, '#3b2818');
        } else {
            triGrad.addColorStop(0, '#1d120a');
            triGrad.addColorStop(1, '#2c1b0f');
        }
        this.ctx.fillStyle = triGrad;
        this.ctx.fill();
        
        // Altın Sarısı İnce Kakma Çerçeve
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
        this.ctx.stroke();

        // Hane Numaraları (Ağırbaşlı Altın Tonu)
        this.ctx.fillStyle = '#d4af37'; 
        this.ctx.font = 'bold 10px sans-serif';
        this.ctx.fillText(slotId, x + (width / 2) - 6, isTop ? y + height + 15 : y - height - 5);
    }

    drawHighlightGlow(x, y, width, height, isTop) {
        this.ctx.beginPath();
        if (isTop) { this.ctx.moveTo(x, y); this.ctx.lineTo(x + width, y); this.ctx.lineTo(x + (width / 2), y + height); }
        else { this.ctx.moveTo(x, y); this.ctx.lineTo(x + width, y); this.ctx.lineTo(x + (width / 2), y - height); }
        this.ctx.closePath();
        this.ctx.fillStyle = 'rgba(212, 175, 55, 0.45)';
        this.ctx.fill();
    }

    // CİLALI, PARLAK FİDİŞİ VE ABANOZ PULLAR
    drawMastermindPieces(x, y, slotWidth, slotData, isTop, isSelected) {
        if (!slotData || slotData.count === 0) return;
        const radius = (slotWidth / 2) - 2; 
        const centerX = x + (slotWidth / 2);
        const maxVerticalArea = 200; 
        let spacing = radius * 2;
        
        if (slotData.count * spacing > maxVerticalArea) spacing = maxVerticalArea / slotData.count;

        for (let i = 0; i < slotData.count; i++) {
            let centerY = isTop ? y + radius + 5 + (i * spacing) : y - radius - 5 - (i * spacing);
            
            // Seçili Taş Altın Işık Efekti
            if (isSelected && i === slotData.count - 1) {
                this.ctx.beginPath(); 
                this.ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
                this.ctx.fillStyle = '#f39c12'; 
                this.ctx.shadowColor = '#f39c12';
                this.ctx.shadowBlur = 12;
                this.ctx.fill();
                this.ctx.shadowBlur = 0; // Gölgeyi sıfırla
            }
            
            // Pul Gövdesi (Gradyanlı Cilalı Doku)
            this.ctx.beginPath(); 
            this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            
            const pieceGrad = this.ctx.createRadialGradient(centerX - 4, centerY - 4, 2, centerX, centerY, radius);
            if (slotData.player === 1) {
                pieceGrad.addColorStop(0, '#ffffff');
                pieceGrad.addColorStop(0.7, '#e6dec1');
                pieceGrad.addColorStop(1, '#b5a982');
            } else {
                pieceGrad.addColorStop(0, '#4a4a4a');
                pieceGrad.addColorStop(0.7, '#212121');
                pieceGrad.addColorStop(1, '#0a0a0a');
            }
            this.ctx.fillStyle = pieceGrad;
            this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
            this.ctx.shadowBlur = 4;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            
            // Kenar Çerçevesi
            this.ctx.lineWidth = 1.5; 
            this.ctx.strokeStyle = slotData.player === 1 ? '#d4af37' : '#555555'; 
            this.ctx.stroke();
            
            // Pulun İçindeki El Oyması Halka Detayı
            this.ctx.beginPath(); 
            this.ctx.arc(centerX, centerY, radius * 0.55, 0, Math.PI * 2);
            this.ctx.strokeStyle = slotData.player === 1 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)'; 
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
    }

    calculatePipCount(game) {
        let whitePips = 0;
        let blackPips = 0;
        for (let i = 1; i <= 24; i++) {
            const slot = game.board.slots[i];
            if (slot.player === 1) {
                whitePips += (25 - i) * slot.count;
            } else if (slot.player === 2) {
                let dist = (i >= 13) ? (25 - i + 12) : (13 - i);
                blackPips += dist * slot.count;
            }
        }
        return { whitePips, blackPips };
    }

    drawBearOffTrays(game) {
        let wCount = 0, bCount = 0;
        for (let i = 1; i <= 24; i++) {
            if (game.board.slots[i].player === 1) wCount += game.board.slots[i].count;
            if (game.board.slots[i].player === 2) bCount += game.board.slots[i].count;
        }
        const wCollected = 15 - wCount;
        const bCollected = 15 - bCount;
        const pips = this.calculatePipCount(game);

        const trayX = this.boardWidth - this.borderSize - this.trayWidth + 5;
        const trayHeight = (this.boardHeight - (this.borderSize * 2)) / 2 - 10;
        
        // Siyah Tepsisi (Üst Sağ)
        this.ctx.fillStyle = 'rgba(15, 8, 3, 0.85)';
        this.ctx.fillRect(trayX, this.borderSize, this.trayWidth, trayHeight);
        if (game.currentPlayer === 2 && this.highlightedSlots.includes(25)) {
            this.ctx.fillStyle = 'rgba(212, 175, 55, 0.5)';
            this.ctx.fillRect(trayX, this.borderSize, this.trayWidth, trayHeight);
        }
        this.ctx.fillStyle = '#d4af37';
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.fillText(`${bCollected}/15`, trayX + 10, this.borderSize + trayHeight / 2 - 10);
        
        this.ctx.fillStyle = '#e67e22';
        this.ctx.fillText(`${pips.blackPips} 🎯`, trayX + 8, this.borderSize + trayHeight / 2 + 10);

        // Beyaz Tepsisi (Alt Sağ)
        this.ctx.fillStyle = 'rgba(15, 8, 3, 0.85)';
        this.ctx.fillRect(trayX, this.borderSize + trayHeight + 20, this.trayWidth, trayHeight);
        if (game.currentPlayer === 1 && this.highlightedSlots.includes(25)) {
            this.ctx.fillStyle = 'rgba(212, 175, 55, 0.5)';
            this.ctx.fillRect(trayX, this.borderSize + trayHeight + 20, this.trayWidth, trayHeight);
        }
        this.ctx.fillStyle = '#d4af37';
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.fillText(`${wCollected}/15`, trayX + 10, this.borderSize + trayHeight + 20 + trayHeight / 2 - 10);
        
        this.ctx.fillStyle = '#e67e22';
        this.ctx.fillText(`${pips.whitePips} 🎯`, trayX + 8, this.borderSize + trayHeight + 20 + trayHeight / 2 + 10);
    }

    calculateHighlights(game, selectedSlotId) {
        this.highlightedSlots = [];
        if (selectedSlotId === null || game.gameStatus !== 'PLAYING') return;

        const headSlot = game.currentPlayer === 1 ? 1 : 13;
        if (selectedSlotId === headSlot && !game.canMoveFromHead()) return;

        const uniqueMoves = [...new Set(game.availableMoves)];
        
        for (let zar of uniqueMoves) {
            if (!game.canUseDiceValue(zar)) continue;
            const target = game.board.calculateTargetSlot(game.currentPlayer, selectedSlotId, zar);
            if (game.board.isValidMove(game.currentPlayer, selectedSlotId, target)) {
                const isBearOff = (game.currentPlayer === 1 && target > 24) || 
                                  (game.currentPlayer === 2 && target > 12 && selectedSlotId <= 12);
                if (isBearOff) this.highlightedSlots.push(25); 
                else this.highlightedSlots.push(target);
            }
        }
        
        if (game.availableMoves.length >= 2) {
            const isDouble = game.availableMoves[0] === game.availableMoves[1];
            
            if (isDouble) {
                const zarDegeri = game.availableMoves[0];
                for (let adet = 1; adet <= game.availableMoves.length; adet++) {
                    const zarSirasi = Array(adet).fill(zarDegeri);
                    const toplamHedef = game.canPlayDiceSequence(selectedSlotId, zarSirasi);
                    
                    if (toplamHedef !== null) {
                        const isBearOff = (game.currentPlayer === 1 && toplamHedef > 24) || 
                                          (game.currentPlayer === 2 && toplamHedef > 12 && selectedSlotId <= 12);
                        if (isBearOff) this.highlightedSlots.push(25);
                        else if (toplamHedef >= 1 && toplamHedef <= 24) this.highlightedSlots.push(toplamHedef);
                    }
                }
            } else {
                const zar1 = game.availableMoves[0];
                const zar2 = game.availableMoves[1];

                const toplamHedef1 = game.canPlayDiceSequence(selectedSlotId, [zar1, zar2]);
                const toplamHedef2 = game.canPlayDiceSequence(selectedSlotId, [zar2, zar1]);

                if (toplamHedef1 !== null) {
                    const isBearOff = (game.currentPlayer === 1 && toplamHedef1 > 24) || (game.currentPlayer === 2 && toplamHedef1 > 12 && selectedSlotId <= 12);
                    if (isBearOff) this.highlightedSlots.push(25);
                    else if (toplamHedef1 >= 1 && toplamHedef1 <= 24) this.highlightedSlots.push(toplamHedef1);
                }

                if (toplamHedef2 !== null) {
                    const isBearOff = (game.currentPlayer === 1 && toplamHedef2 > 24) || (game.currentPlayer === 2 && toplamHedef2 > 12 && selectedSlotId <= 12);
                    if (isBearOff) this.highlightedSlots.push(25);
                    else if (toplamHedef2 >= 1 && toplamHedef2 <= 24) this.highlightedSlots.push(toplamHedef2);
                }
            }
        }
        this.highlightedSlots = [...new Set(this.highlightedSlots)];
    }

    updateStatus(message) { if (this.statusMessage) this.statusMessage.textContent = message; }
}
