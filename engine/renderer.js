// engine/renderer.js

import { t } from './i18n.js';
import {
    BOARD_LAYOUT,
    getBearOffTrayRect,
    getSlotX,
    getSlotWidthForColumn
} from './layout.js';
import { getTheme } from './themes.js';
import { assets } from './assets.js';

export class Renderer {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.currentPlayerText =
            document.getElementById('current-player');
        this.die1Text = document.getElementById('die1');
        this.die2Text = document.getElementById('die2');
        this.statusMessage =
            document.getElementById('status-message');

        this.boardWidth = BOARD_LAYOUT.width;
        this.boardHeight = BOARD_LAYOUT.height;
        this.borderSize = BOARD_LAYOUT.border;
        this.barWidth = BOARD_LAYOUT.bar;
        this.trayWidth = BOARD_LAYOUT.tray;
        this.slotHeight = BOARD_LAYOUT.slotHeight;
        this.pixelRatio = 1;
        this.theme = getTheme('walnut');
        this.boardArtwork = null;
        this.highlightedSlots = [];
        this.staticBoardCanvas = null;
        this.staticBoardDirty = true;

        this.prepareCanvas();
    }

    prepareCanvas() {
        if (!this.canvas) return;

        this.pixelRatio = Math.min(
            window.devicePixelRatio || 1,
            2
        );
        this.canvas.width =
            this.boardWidth * this.pixelRatio;
        this.canvas.height =
            this.boardHeight * this.pixelRatio;
        this.canvas.style.aspectRatio =
            `${this.boardWidth} / ${this.boardHeight}`;
        this.canvas.dataset.logicalWidth = this.boardWidth;
        this.canvas.dataset.logicalHeight = this.boardHeight;

        this.ctx = this.canvas.getContext('2d');
        this.ctx.setTransform(
            this.pixelRatio,
            0,
            0,
            this.pixelRatio,
            0,
            0
        );
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        this.staticBoardDirty = true;
    }

    async initialize() {
        try {
            await assets.loadImage(
                'board.anatolian',
                'boards/anadolu-ustasi-board-v1.webp'
            );
        } catch {
            // Görsel yüklenemezse çizim tabanlı tema çalışmaya devam eder.
        }

        const savedTheme =
            localStorage.getItem('narde-theme') || 'anatolian';
        this.setTheme(savedTheme);
    }

    setTheme(themeId) {
        this.theme = getTheme(themeId);
        this.boardArtwork =
            this.theme.artwork
                ? assets.getImage('board.anatolian')
                : null;

        localStorage.setItem('narde-theme', this.theme.id);
        this.staticBoardDirty = true;
    }

    getPlayfieldEdges() {
        return {
            top:
                this.theme.playfield?.top ??
                this.borderSize,
            bottom:
                this.theme.playfield?.bottom ??
                (this.boardHeight - this.borderSize)
        };
    }

    getBoardLayout() {
        const playfield = this.theme.playfield;

        if (!playfield?.leftField || !playfield?.rightField) {
            return BOARD_LAYOUT;
        }

        return {
            ...BOARD_LAYOUT,
            leftField: playfield.leftField,
            rightField: playfield.rightField,
            trayArea: playfield.tray
        };
    }

    drawBoardSurface(innerWidth, barX) {
        if (this.boardArtwork) {
            this.ctx.drawImage(
                this.boardArtwork,
                0,
                0,
                this.boardWidth,
                this.boardHeight
            );
            return;
        }

        const frameGrad = this.ctx.createLinearGradient(
            0,
            0,
            this.boardWidth,
            this.boardHeight
        );
        frameGrad.addColorStop(0, this.theme.frame[0]);
        frameGrad.addColorStop(0.5, this.theme.frame[1]);
        frameGrad.addColorStop(1, this.theme.frame[2]);
        this.ctx.fillStyle = frameGrad;
        this.ctx.fillRect(
            0,
            0,
            this.boardWidth,
            this.boardHeight
        );

        const boardGrad = this.ctx.createLinearGradient(
            this.borderSize,
            this.borderSize,
            this.borderSize + innerWidth,
            this.boardHeight
        );
        boardGrad.addColorStop(0, this.theme.board[0]);
        boardGrad.addColorStop(1, this.theme.board[1]);
        this.ctx.fillStyle = boardGrad;
        this.ctx.fillRect(
            this.borderSize,
            this.borderSize,
            innerWidth,
            this.boardHeight - (this.borderSize * 2)
        );

        const barGrad = this.ctx.createLinearGradient(
            barX,
            this.borderSize,
            barX + this.barWidth,
            this.boardHeight
        );
        barGrad.addColorStop(0, this.theme.bar[0]);
        barGrad.addColorStop(0.5, this.theme.bar[1]);
        barGrad.addColorStop(1, this.theme.bar[2]);
        this.ctx.fillStyle = barGrad;
        this.ctx.fillRect(
            barX,
            this.borderSize,
            this.barWidth,
            this.boardHeight - (this.borderSize * 2)
        );

        this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.15)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
            barX,
            this.borderSize,
            this.barWidth,
            this.boardHeight - (this.borderSize * 2)
        );
    }

    rebuildStaticBoard() {
        const canvas = document.createElement('canvas');
        canvas.width = this.boardWidth * this.pixelRatio;
        canvas.height = this.boardHeight * this.pixelRatio;

        const backgroundContext = canvas.getContext('2d');
        backgroundContext.setTransform(
            this.pixelRatio,
            0,
            0,
            this.pixelRatio,
            0,
            0
        );
        backgroundContext.imageSmoothingEnabled = true;
        backgroundContext.imageSmoothingQuality = 'high';

        const visibleContext = this.ctx;
        this.ctx = backgroundContext;

        const innerWidth =
            this.boardWidth -
            (this.borderSize * 2) -
            this.trayWidth;
        const barX =
            this.borderSize +
            (innerWidth / 2) -
            (this.barWidth / 2);
        const pointHeight =
            this.theme.pointHeight || this.slotHeight;
        const playfield = this.getPlayfieldEdges();
        const boardLayout = this.getBoardLayout();

        this.ctx.clearRect(
            0,
            0,
            this.boardWidth,
            this.boardHeight
        );
        this.drawBoardSurface(innerWidth, barX);

        for (let slotId = 12; slotId >= 1; slotId--) {
            const columnIndex = 12 - slotId;
            const slotWidth =
                getSlotWidthForColumn(columnIndex, boardLayout);
            const x = getSlotX(
                columnIndex,
                slotWidth,
                boardLayout
            );
            this.drawMastermindTriangle(
                x,
                playfield.top,
                slotWidth,
                pointHeight,
                true,
                slotId,
                slotId % 2 === 0
            );
        }

        for (let slotId = 13; slotId <= 24; slotId++) {
            const columnIndex = slotId - 13;
            const slotWidth =
                getSlotWidthForColumn(columnIndex, boardLayout);
            const x = getSlotX(
                columnIndex,
                slotWidth,
                boardLayout
            );
            this.drawMastermindTriangle(
                x,
                playfield.bottom,
                slotWidth,
                pointHeight,
                false,
                slotId,
                slotId % 2 === 0
            );
        }

        this.ctx = visibleContext;
        this.staticBoardCanvas = canvas;
        this.staticBoardDirty = false;
    }

    render(game, selectedSlotId = null) {
        if (!this.ctx) {
            this.canvas =
                document.getElementById('game-canvas');
            if (!this.canvas) return;
            this.prepareCanvas();
        }

        this.calculateHighlights(game, selectedSlotId);

        if (
            this.staticBoardDirty ||
            !this.staticBoardCanvas
        ) {
            this.rebuildStaticBoard();
        }

        this.ctx.clearRect(
            0,
            0,
            this.boardWidth,
            this.boardHeight
        );
        this.ctx.drawImage(
            this.staticBoardCanvas,
            0,
            0,
            this.staticBoardCanvas.width,
            this.staticBoardCanvas.height,
            0,
            0,
            this.boardWidth,
            this.boardHeight
        );

        const innerWidth =
            this.boardWidth -
            (this.borderSize * 2) -
            this.trayWidth;
        const pointHeight =
            this.theme.pointHeight || this.slotHeight;
        const playfield = this.getPlayfieldEdges();
        const boardLayout = this.getBoardLayout();

        for (let slotId = 12; slotId >= 1; slotId--) {
            const columnIndex = 12 - slotId;
            const slotWidth =
                getSlotWidthForColumn(columnIndex, boardLayout);
            const x = getSlotX(
                columnIndex,
                slotWidth,
                boardLayout
            );

            if (this.highlightedSlots.includes(slotId)) {
                this.drawHighlightGlow(
                    x,
                    playfield.top,
                    slotWidth,
                    pointHeight,
                    true
                );
            }
            this.drawMastermindPieces(
                x,
                playfield.top,
                slotWidth,
                game.board.slots[slotId],
                true,
                selectedSlotId === slotId
            );
        }

        for (let slotId = 13; slotId <= 24; slotId++) {
            const columnIndex = slotId - 13;
            const slotWidth =
                getSlotWidthForColumn(columnIndex, boardLayout);
            const x = getSlotX(
                columnIndex,
                slotWidth,
                boardLayout
            );
            const y = playfield.bottom;

            if (this.highlightedSlots.includes(slotId)) {
                this.drawHighlightGlow(
                    x,
                    y,
                    slotWidth,
                    pointHeight,
                    false
                );
            }
            this.drawMastermindPieces(
                x,
                y,
                slotWidth,
                game.board.slots[slotId],
                false,
                selectedSlotId === slotId
            );
        }

        this.drawBearOffTrays(game);

        if (this.currentPlayerText) {
            this.currentPlayerText.textContent =
                game.currentPlayer === 1
                    ? t('player.white')
                    : t('player.black');
        }

        if (
            game.dice.values &&
            game.dice.values.length > 0
        ) {
            if (this.die1Text) {
                this.die1Text.textContent =
                    game.dice.values[0];
            }
            if (this.die2Text) {
                this.die2Text.textContent =
                    game.dice.values[1];
            }
            this.updateDiceAvailability(game);
        } else {
            if (this.die1Text) this.die1Text.textContent = '-';
            if (this.die2Text) this.die2Text.textContent = '-';
            this.setDieUsed(this.die1Text, false);
            this.setDieUsed(this.die2Text, false);
        }
    }

    setDieUsed(element, isUsed) {
        if (!element) return;
        element.classList.toggle('used', isUsed);
    }

    updateDiceAvailability(game) {
        const [die1, die2] = game.dice.values;
        const remaining = game.availableMoves;

        if (die1 === die2) {
            const movesLeft = remaining.filter(
                value => value === die1
            ).length;
            const allUsed = movesLeft === 0;

            this.setDieUsed(this.die1Text, allUsed);
            this.setDieUsed(this.die2Text, allUsed);

            const title = allUsed
                ? 'Bu zarın tüm hamleleri kullanıldı'
                : `Kalan hamle: ${movesLeft}`;
            if (this.die1Text) this.die1Text.title = title;
            if (this.die2Text) this.die2Text.title = title;
            return;
        }

        this.setDieUsed(
            this.die1Text,
            !remaining.includes(die1)
        );
        this.setDieUsed(
            this.die2Text,
            !remaining.includes(die2)
        );
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
            triGrad.addColorStop(0, this.theme.lightPoint[0]);
            triGrad.addColorStop(1, this.theme.lightPoint[1]);
        } else {
            triGrad.addColorStop(0, this.theme.darkPoint[0]);
            triGrad.addColorStop(1, this.theme.darkPoint[1]);
        }
        this.ctx.fillStyle = triGrad;
        this.ctx.fill();
        
        // Altın Sarısı İnce Kakma Çerçeve
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeStyle = this.theme.pointStroke || 'rgba(212, 175, 55, 0.4)';
        this.ctx.stroke();

        // Hane Numaraları (Ağırbaşlı Altın Tonu)
        const numberY = isTop ? y + height + 16 : y - height - 7;
        const numberX = x + (width / 2);
        this.ctx.save();
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.font = 'bold 11px sans-serif';
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = 'rgba(39, 20, 8, 0.78)';
        this.ctx.strokeText(slotId, numberX, numberY);
        this.ctx.fillStyle = this.theme.numberColor || '#d4af37';
        this.ctx.fillText(slotId, numberX, numberY);
        this.ctx.restore();
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
                pieceGrad.addColorStop(0, '#f8efd9');
                pieceGrad.addColorStop(0.72, '#dfcfaa');
                pieceGrad.addColorStop(1, '#a98d60');
            } else {
                pieceGrad.addColorStop(0, '#554940');
                pieceGrad.addColorStop(0.72, '#27201c');
                pieceGrad.addColorStop(1, '#0d0a08');
            }
            this.ctx.fillStyle = pieceGrad;
            this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
            this.ctx.shadowBlur = 4;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            
            // Kenar Çerçevesi
            this.ctx.lineWidth = 1.5; 
            this.ctx.strokeStyle = slotData.player === 1 ? '#b99b61' : '#62554b'; 
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

    drawCollectPrompt(x, y, width, height) {
        this.ctx.save();
        this.ctx.shadowColor = '#f6c744';
        this.ctx.shadowBlur = 18;
        this.ctx.strokeStyle = '#ffd75e';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);
        this.ctx.shadowBlur = 0;

        this.ctx.fillStyle = 'rgba(246, 199, 68, 0.24)';
        this.ctx.fillRect(x + 3, y + 3, width - 6, height - 6);

        this.ctx.fillStyle = '#fff3b0';
        this.ctx.textAlign = 'center';
        this.ctx.font = 'bold 10px sans-serif';
        this.ctx.fillText(t('collect'), x + width / 2, y + height / 2 - 4);
        this.ctx.font = 'bold 22px sans-serif';
        this.ctx.fillText('→', x + width / 2, y + height / 2 + 22);
        this.ctx.restore();
    }

    drawTraySurface(x, y, width, height) {
        const trayGradient = this.ctx.createLinearGradient(
            x,
            y,
            x + width,
            y + height
        );
        const trayColors = this.theme.tray || ['#261308', '#120905'];
        trayGradient.addColorStop(0, trayColors[0]);
        trayGradient.addColorStop(1, trayColors[1]);
        this.ctx.fillStyle = trayGradient;
        this.ctx.fillRect(x, y, width, height);

        this.ctx.strokeStyle = 'rgba(215, 174, 92, 0.46)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);

        this.ctx.fillStyle = this.theme.trayInset || '#160b06';
        this.ctx.fillRect(x + 7, y + 8, width - 14, height - 16);
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.48)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x + 7, y + 8, width - 14, height - 16);
    }

    drawBearOffTrays(game) {
        const wCollected = game.board.borneOff?.[1] ?? 0;
        const bCollected = game.board.borneOff?.[2] ?? 0;
        const pips = this.calculatePipCount(game);

        const boardLayout = this.getBoardLayout();
        const blackTray =
            getBearOffTrayRect(2, boardLayout);
        const whiteTray =
            getBearOffTrayRect(1, boardLayout);
        const trayX = blackTray.x;
        const trayWidth = blackTray.width;
        const trayHeight = blackTray.height;
        const blackTrayY = blackTray.y;
        const whiteTrayY = whiteTray.y;
        const canCollect =
            this.highlightedSlots.includes(25);

        // Siyah toplama tepsisi
        this.drawTraySurface(
            trayX,
            blackTrayY,
            trayWidth,
            trayHeight
        );

        if (game.currentPlayer === 2 && canCollect) {
            this.drawCollectPrompt(
                trayX,
                blackTrayY,
                trayWidth,
                trayHeight
            );
        }

        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#d4af37';
        this.ctx.font = 'bold 14px sans-serif';
        this.ctx.fillText(
            `${bCollected}/15`,
            trayX + trayWidth / 2,
            blackTrayY + trayHeight / 2 - 10
        );
        this.ctx.fillStyle = '#e67e22';
        this.ctx.font = 'bold 13px sans-serif';
        this.ctx.fillText(
            `${pips.blackPips}`,
            trayX + trayWidth / 2,
            blackTrayY + trayHeight / 2 + 10
        );

        // Beyaz toplama tepsisi
        this.drawTraySurface(
            trayX,
            whiteTrayY,
            trayWidth,
            trayHeight
        );

        if (game.currentPlayer === 1 && canCollect) {
            this.drawCollectPrompt(
                trayX,
                whiteTrayY,
                trayWidth,
                trayHeight
            );
        }

        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#d4af37';
        this.ctx.font = 'bold 14px sans-serif';
        this.ctx.fillText(
            `${wCollected}/15`,
            trayX + trayWidth / 2,
            whiteTrayY + trayHeight / 2 - 10
        );
        this.ctx.fillStyle = '#e67e22';
        this.ctx.font = 'bold 13px sans-serif';
        this.ctx.fillText(
            `${pips.whitePips}`,
            trayX + trayWidth / 2,
            whiteTrayY + trayHeight / 2 + 10
        );
    }

    calculateHighlights(game, selectedSlotId) {
        this.highlightedSlots =
            selectedSlotId === null
                ? []
                : game.getLegalTargets(selectedSlotId);
    }

    updateStatus(message) { if (this.statusMessage) this.statusMessage.textContent = message; }
}
