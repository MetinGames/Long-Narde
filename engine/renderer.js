// engine/renderer.js

import { t } from './i18n.js';
import {
    BOARD_LAYOUT,
    getBearOffTrayRect,
    getCheckerRenderRect,
    getPointRenderRect
} from './layout.js';
import { getTheme } from './themes.js';
import {
    DEFAULT_THEME_ID,
    persistThemeId,
    readStoredThemeId,
    resolveThemeId
} from './rendererThemePreference.js';
import { assets } from './assets.js';
import {
    easeCheckerMoveProgress,
    interpolateCheckerPoint
} from './checkerMoveAnimation.js';
import {
    CHECKER_COLOR,
    getOppositeCheckerColor,
    normalizeCheckerColor
} from './checkerColorPreference.js';
import {
    canvasMatchesGeometry,
    getCanvasGeometry
} from './canvasGeometry.js';

function getNowMs() {
    return (
        typeof performance !== 'undefined' && typeof performance.now === 'function'
            ? performance.now()
            : Date.now()
    );
}

export class Renderer {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.turnIndicator =
            document.getElementById('turn-indicator');
        this.currentPlayerText =
            document.getElementById('current-player');
        this.die1Text = document.getElementById('die1');
        this.die2Text = document.getElementById('die2');
        this.doubleRights = [
            document.getElementById('die-right-1'),
            document.getElementById('die-right-2'),
            document.getElementById('die-right-3'),
            document.getElementById('die-right-4')
        ];
        this.diceDisplay =
            document.getElementById('dice-display');
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
        this.victoryMomentState = null;
        this.checkerMoveAnimationState = null;
        this.botMoveHighlightState = null;
        this.pointNumbersVisible = false;
        this.humanCheckerColor = CHECKER_COLOR.WHITE;

        this.prepareCanvas();
    }

    setHumanCheckerColor(color) {
        this.humanCheckerColor = normalizeCheckerColor(color);
        return this.humanCheckerColor;
    }

    getHumanCheckerColor() {
        return normalizeCheckerColor(this.humanCheckerColor);
    }

    getCheckerColorForPlayer(player) {
        return player === 1
            ? this.getHumanCheckerColor()
            : getOppositeCheckerColor(this.getHumanCheckerColor());
    }

    updateTurnIndicator(currentPlayer) {
        const checkerColor = this.getCheckerColorForPlayer(currentPlayer);
        const playerKey = `player.${checkerColor}`;
        const playerName = t(playerKey);

        if (this.currentPlayerText) {
            this.currentPlayerText.textContent = playerName;
            this.currentPlayerText.dataset.i18n = playerKey;
        }

        if (!this.turnIndicator) return;

        const isWhiteTurn = checkerColor === CHECKER_COLOR.WHITE;
        this.turnIndicator.classList.toggle(
            'is-white-turn',
            isWhiteTurn
        );
        this.turnIndicator.classList.toggle(
            'is-dark-turn',
            !isWhiteTurn
        );
        this.turnIndicator.dataset.activePlayer =
            isWhiteTurn ? 'white' : 'black';
        this.turnIndicator.setAttribute(
            'aria-label',
            `${t('ui.turn')} ${playerName}`
        );
    }

    prepareCanvas() {
        if (!this.canvas) return;

        const geometry = this.getCanvasGeometry();
        this.pixelRatio = geometry.pixelRatio;
        this.canvas.width = geometry.backingWidth;
        this.canvas.height = geometry.backingHeight;
        this.canvas.style.aspectRatio =
            `${this.boardWidth} / ${this.boardHeight}`;
        this.canvas.dataset.logicalWidth = geometry.logicalWidth;
        this.canvas.dataset.logicalHeight = geometry.logicalHeight;
        this.canvas.dataset.pixelRatio = geometry.pixelRatio;
        this.canvas.dataset.backingWidth = geometry.backingWidth;
        this.canvas.dataset.backingHeight = geometry.backingHeight;

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

    getCanvasGeometry() {
        return getCanvasGeometry({
            logicalWidth: this.boardWidth,
            logicalHeight: this.boardHeight,
            pixelRatio:
                typeof window === 'undefined'
                    ? 1
                    : window.devicePixelRatio
        });
    }

    syncCanvasGeometry() {
        const geometry = this.getCanvasGeometry();
        if (
            this.pixelRatio === geometry.pixelRatio &&
            canvasMatchesGeometry(this.canvas, geometry)
        ) {
            return false;
        }

        this.prepareCanvas();
        return true;
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

        const savedThemeId = readStoredThemeId();
        this.setTheme(savedThemeId || DEFAULT_THEME_ID);
    }

    setTheme(themeId) {
        const resolvedThemeId = resolveThemeId(themeId);
        this.theme = getTheme(resolvedThemeId);
        this.boardArtwork =
            this.theme.artwork
                ? assets.getImage('board.anatolian')
                : null;

        persistThemeId(this.theme.id);
        this.staticBoardDirty = true;
    }

    startVictoryMoment({
        winner,
        durationMs,
        settleDurationMs,
        flashDurationMs,
        reducedMotion
    }) {
        this.victoryMomentState = {
            winner,
            durationMs,
            settleDurationMs,
            flashDurationMs,
            reducedMotion,
            progress: 0
        };
    }

    setVictoryMomentProgress(progress) {
        if (!this.victoryMomentState) return;
        this.victoryMomentState.progress = Math.max(
            0,
            Math.min(1, progress)
        );
    }

    clearVictoryMoment() {
        this.victoryMomentState = null;
    }

    startCheckerMoveAnimation(payload) {
        if (!payload) {
            this.checkerMoveAnimationState = null;
            return;
        }

        this.checkerMoveAnimationState = {
            ...payload,
            progress: 0
        };
    }

    setCheckerMoveAnimationProgress(progress) {
        if (!this.checkerMoveAnimationState) return;
        this.checkerMoveAnimationState.progress = Math.max(
            0,
            Math.min(1, Number(progress) || 0)
        );
    }

    clearCheckerMoveAnimation() {
        this.checkerMoveAnimationState = null;
    }

    setBotMoveHighlight({
        fromSlot,
        targetSlot,
        reducedMotion = false,
        durationMs = 1200
    }) {
        if (
            !Number.isInteger(fromSlot) ||
            !Number.isInteger(targetSlot)
        ) {
            this.botMoveHighlightState = null;
            return;
        }

        const safeDuration = Math.max(0, Number(durationMs) || 0);
        this.botMoveHighlightState = {
            fromSlot,
            targetSlot,
            reducedMotion,
            expiresAt: getNowMs() + safeDuration
        };
    }

    clearBotMoveHighlight() {
        this.botMoveHighlightState = null;
    }

    setPointNumbersVisible(isVisible) {
        const nextValue = Boolean(isVisible);
        if (this.pointNumbersVisible === nextValue) return;

        this.pointNumbersVisible = nextValue;
        this.staticBoardDirty = true;
    }

    arePointNumbersVisible() {
        return this.pointNumbersVisible;
    }

    resolveActiveBotMoveHighlight(nowMs = getNowMs()) {
        if (!this.botMoveHighlightState) return null;

        if (nowMs >= this.botMoveHighlightState.expiresAt) {
            this.botMoveHighlightState = null;
            return null;
        }

        return this.botMoveHighlightState;
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
            trayArea: playfield.tray,
            centerPointInset: playfield.centerPointInset
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
        const geometry = getCanvasGeometry({
            logicalWidth: this.boardWidth,
            logicalHeight: this.boardHeight,
            pixelRatio: this.pixelRatio
        });
        canvas.width = geometry.backingWidth;
        canvas.height = geometry.backingHeight;

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
            const pointRect = getPointRenderRect(
                columnIndex,
                boardLayout
            );
            this.drawMastermindTriangle(
                pointRect.x,
                playfield.top,
                pointRect.width,
                pointHeight,
                true,
                slotId,
                slotId % 2 === 0
            );
        }

        for (let slotId = 13; slotId <= 24; slotId++) {
            const columnIndex = slotId - 13;
            const pointRect = getPointRenderRect(
                columnIndex,
                boardLayout
            );
            this.drawMastermindTriangle(
                pointRect.x,
                playfield.bottom,
                pointRect.width,
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

        this.syncCanvasGeometry();

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

        const botMoveHighlight =
            this.resolveActiveBotMoveHighlight();

        if (botMoveHighlight) {
            this.drawBotMoveHighlight(botMoveHighlight, {
                boardLayout,
                playfield,
                pointHeight
            });
        }

        for (let slotId = 12; slotId >= 1; slotId--) {
            const columnIndex = 12 - slotId;
            const pointRect = getPointRenderRect(
                columnIndex,
                boardLayout
            );
            const checkerRect = getCheckerRenderRect(
                columnIndex,
                boardLayout
            );

            if (this.highlightedSlots.includes(slotId)) {
                this.drawHighlightGlow(
                    pointRect.x,
                    playfield.top,
                    pointRect.width,
                    pointHeight,
                    true
                );
            }
            this.drawMastermindPieces(
                checkerRect.x,
                playfield.top,
                checkerRect.width,
                this.getAnimatedSlotData(
                    slotId,
                    game.board.slots[slotId]
                ),
                true,
                selectedSlotId === slotId
            );
        }

        for (let slotId = 13; slotId <= 24; slotId++) {
            const columnIndex = slotId - 13;
            const pointRect = getPointRenderRect(
                columnIndex,
                boardLayout
            );
            const checkerRect = getCheckerRenderRect(
                columnIndex,
                boardLayout
            );
            const y = playfield.bottom;

            if (this.highlightedSlots.includes(slotId)) {
                this.drawHighlightGlow(
                    pointRect.x,
                    y,
                    pointRect.width,
                    pointHeight,
                    false
                );
            }
            this.drawMastermindPieces(
                checkerRect.x,
                y,
                checkerRect.width,
                this.getAnimatedSlotData(
                    slotId,
                    game.board.slots[slotId]
                ),
                false,
                selectedSlotId === slotId
            );
        }

        this.drawBearOffTrays(game);

        this.drawCheckerMoveAnimation({
            boardLayout,
            playfield
        });

        this.updateTurnIndicator(game.currentPlayer);

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
            this.updateDoubleMoveRights(0, false);
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
            const usedMoveRights =
                Math.max(0, 4 - movesLeft);

            this.setDieUsed(this.die1Text, allUsed);
            this.setDieUsed(this.die2Text, allUsed);
            this.updateDoubleMoveRights(
                usedMoveRights,
                true
            );

            const title = allUsed
                ? t('status.dieAllUsed')
                : t('status.movesLeft', { count: movesLeft });
            if (this.die1Text) this.die1Text.title = title;
            if (this.die2Text) this.die2Text.title = title;
            return;
        }

        this.updateDoubleMoveRights(0, false);

        this.setDieUsed(
            this.die1Text,
            !remaining.includes(die1)
        );
        this.setDieUsed(
            this.die2Text,
            !remaining.includes(die2)
        );
    }

    updateDoubleMoveRights(usedMoveRights, isVisible) {
        if (this.diceDisplay) {
            this.diceDisplay.classList.toggle(
                'is-double-roll',
                isVisible
            );
        }

        this.doubleRights.forEach((indicator, index) => {
            if (!indicator) return;
            const isSpent = index < usedMoveRights;
            indicator.classList.toggle('is-spent', isSpent);
        });
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

        if (!this.pointNumbersVisible) return;

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

    getSlotHighlightAnchor(slotId, boardLayout, playfield, pointHeight) {
        if (slotId === 25) {
            const trayRect = getBearOffTrayRect(2, boardLayout);
            return {
                type: 'tray',
                x: trayRect.x + (trayRect.width / 2),
                y: trayRect.y + (trayRect.height / 2),
                radius: Math.min(trayRect.width, trayRect.height) * 0.45,
                trayRect
            };
        }

        if (slotId < 1 || slotId > 24) return null;

        const isTop = slotId <= 12;
        const columnIndex = isTop
            ? 12 - slotId
            : slotId - 13;
        const pointRect = getPointRenderRect(columnIndex, boardLayout);
        const y = isTop ? playfield.top : playfield.bottom;

        return {
            type: 'slot',
            isTop,
            x: pointRect.x,
            y,
            slotWidth: pointRect.width,
            pointHeight
        };
    }

    drawBotMoveHighlight(state, { boardLayout, playfield, pointHeight }) {
        const fromAnchor = this.getSlotHighlightAnchor(
            state.fromSlot,
            boardLayout,
            playfield,
            pointHeight
        );
        const targetAnchor = this.getSlotHighlightAnchor(
            state.targetSlot,
            boardLayout,
            playfield,
            pointHeight
        );

        if (fromAnchor) {
            this.drawBotMoveMarker(fromAnchor, {
                isSource: true,
                reducedMotion: state.reducedMotion
            });
        }

        if (targetAnchor) {
            this.drawBotMoveMarker(targetAnchor, {
                isSource: false,
                reducedMotion: state.reducedMotion
            });
        }
    }

    drawBotMoveMarker(anchor, { isSource, reducedMotion }) {
        this.ctx.save();

        const fillAlpha = isSource ? 0.16 : 0.23;
        const strokeAlpha = isSource ? 0.30 : 0.42;
        this.ctx.fillStyle = `rgba(247, 203, 112, ${fillAlpha})`;
        this.ctx.strokeStyle = `rgba(255, 227, 160, ${strokeAlpha})`;
        this.ctx.lineWidth = reducedMotion ? 1.3 : 1.8;

        if (anchor.type === 'tray') {
            const rect = anchor.trayRect;
            this.ctx.fillRect(
                rect.x + 4,
                rect.y + 4,
                rect.width - 8,
                rect.height - 8
            );
            this.ctx.strokeRect(
                rect.x + 4,
                rect.y + 4,
                rect.width - 8,
                rect.height - 8
            );
            this.ctx.restore();
            return;
        }

        this.ctx.beginPath();
        if (anchor.isTop) {
            this.ctx.moveTo(anchor.x, anchor.y);
            this.ctx.lineTo(anchor.x + anchor.slotWidth, anchor.y);
            this.ctx.lineTo(
                anchor.x + (anchor.slotWidth / 2),
                anchor.y + anchor.pointHeight
            );
        } else {
            this.ctx.moveTo(anchor.x, anchor.y);
            this.ctx.lineTo(anchor.x + anchor.slotWidth, anchor.y);
            this.ctx.lineTo(
                anchor.x + (anchor.slotWidth / 2),
                anchor.y - anchor.pointHeight
            );
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();
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
                this.ctx.fillStyle = this.theme.interaction.selected;
                this.ctx.shadowColor = this.theme.interaction.selected;
                this.ctx.shadowBlur = 12;
                this.ctx.fill();
                this.ctx.shadowBlur = 0; // Gölgeyi sıfırla
            }
            
            this.drawCheckerBody({
                centerX,
                centerY,
                radius,
                player: slotData.player
            });
        }
    }

    drawCheckerBody({ centerX, centerY, radius, player }) {
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);

        const checkerColor = this.getCheckerColorForPlayer(player);
        const checkerTokens = this.theme.checkers[checkerColor];
        const pieceGrad = this.ctx.createRadialGradient(
            centerX - 4,
            centerY - 4,
            2,
            centerX,
            centerY,
            radius
        );
        pieceGrad.addColorStop(0, checkerTokens.gradient[0]);
        pieceGrad.addColorStop(0.72, checkerTokens.gradient[1]);
        pieceGrad.addColorStop(1, checkerTokens.gradient[2]);
        this.ctx.fillStyle = pieceGrad;
        this.ctx.shadowColor = this.theme.checkers.shadow;
        this.ctx.shadowBlur = 4;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        this.ctx.lineWidth = 1.5;
        this.ctx.strokeStyle = checkerTokens.stroke;
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius * 0.55, 0, Math.PI * 2);
        this.ctx.strokeStyle = checkerTokens.insetStroke;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    getAnimatedSlotData(slotId, slotData) {
        const state = this.checkerMoveAnimationState;
        if (
            !state ||
            state.targetSlot !== slotId ||
            slotData?.player !== state.player ||
            slotData.count <= 0
        ) {
            return slotData;
        }

        return {
            ...slotData,
            count: Math.max(0, slotData.count - 1)
        };
    }

    getAnimatedCollectedCount(player, collected) {
        const state = this.checkerMoveAnimationState;
        if (state?.targetSlot === 25 && state.player === player) {
            return Math.max(0, collected - 1);
        }
        return collected;
    }

    getCheckerAnimationAnchor(
        slotId,
        stackCount,
        player,
        { boardLayout, playfield }
    ) {
        if (slotId === 25) {
            const trayRect = getBearOffTrayRect(player, boardLayout);
            const slices = this.getCollectedSliceLayout(stackCount, trayRect);
            const slice = slices[slices.length - 1];
            if (!slice) return null;

            return {
                x: slice.x + (slice.width / 2),
                y: slice.y + (slice.height / 2),
                radius: Math.max(5, Math.min(13, slice.width / 2))
            };
        }

        if (slotId < 1 || slotId > 24 || stackCount <= 0) return null;
        const isTop = slotId <= 12;
        const columnIndex = isTop
            ? 12 - slotId
            : slotId - 13;
        const checkerRect = getCheckerRenderRect(columnIndex, boardLayout);
        const radius = (checkerRect.width / 2) - 2;
        const maxVerticalArea = 200;
        let spacing = radius * 2;
        if (stackCount * spacing > maxVerticalArea) {
            spacing = maxVerticalArea / stackCount;
        }

        const index = stackCount - 1;
        return {
            x: checkerRect.x + (checkerRect.width / 2),
            y: isTop
                ? playfield.top + radius + 5 + (index * spacing)
                : playfield.bottom - radius - 5 - (index * spacing),
            radius
        };
    }

    drawCheckerMoveAnimation(layout) {
        const state = this.checkerMoveAnimationState;
        if (!state) return;

        const from = this.getCheckerAnimationAnchor(
            state.fromSlot,
            state.sourceCountBefore,
            state.player,
            layout
        );
        const target = this.getCheckerAnimationAnchor(
            state.targetSlot,
            state.targetCountAfter,
            state.player,
            layout
        );
        if (!from || !target) return;

        const point = interpolateCheckerPoint({
            from,
            target,
            progress: state.progress,
            liftPx: state.liftPx
        });
        const eased = easeCheckerMoveProgress(state.progress);
        const radius = from.radius + ((target.radius - from.radius) * eased);

        this.ctx.save();
        this.ctx.globalAlpha = 0.96;
        this.drawCheckerBody({
            centerX: point.x,
            centerY: point.y,
            radius,
            player: state.player
        });
        this.ctx.restore();
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
        this.ctx.shadowColor = this.theme.interaction.focusGlow;
        this.ctx.shadowBlur = 18;
        this.ctx.strokeStyle = this.theme.interaction.focus;
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);
        this.ctx.shadowBlur = 0;

        this.ctx.fillStyle = this.theme.interaction.focusFill;
        this.ctx.fillRect(x + 3, y + 3, width - 6, height - 6);

        this.ctx.fillStyle = this.theme.interaction.focusText;
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

    getCollectedSliceLayout(collected, trayRect) {
        const safeCollected = Math.max(
            0,
            Math.min(15, collected)
        );
        const laneWidth = Math.max(
            16,
            Math.min(28, trayRect.width - 14)
        );
        const laneX =
            trayRect.x + ((trayRect.width - laneWidth) / 2);
        const laneTop = trayRect.y + 12;
        const laneBottom = trayRect.y + trayRect.height - 12;
        const laneHeight = Math.max(20, laneBottom - laneTop);
        const sliceStep = Math.max(
            5,
            Math.min(8, Math.floor((laneHeight - 4) / 15))
        );
        const stackBottom = laneBottom - 2;
        const slices = [];

        for (let i = 0; i < safeCollected; i++) {
            const y = stackBottom - ((i + 1) * sliceStep);
            slices.push({
                x: laneX,
                y,
                width: laneWidth,
                height: sliceStep - 1
            });
        }

        return slices;
    }

    drawCollectedSlices(player, collected, trayRect) {
        const slices = this.getCollectedSliceLayout(
            collected,
            trayRect
        );

        const victoryState = this.victoryMomentState;
        const isWinnerTray =
            victoryState &&
            victoryState.winner === player &&
            collected > 0;
        let animatedSliceIndex = -1;
        let settleOffset = 0;

        if (isWinnerTray) {
            const settleProgress = Math.min(
                1,
                victoryState.progress /
                Math.max(0.001, victoryState.settleDurationMs / victoryState.durationMs)
            );
            settleOffset = (1 - settleProgress) * 7;
            animatedSliceIndex = slices.length - 1;
        }

        for (let index = 0; index < slices.length; index++) {
            const slice = slices[index];
            const y =
                index === animatedSliceIndex
                    ? slice.y - settleOffset
                    : slice.y;
            const grad = this.ctx.createLinearGradient(
                slice.x,
                y,
                slice.x + slice.width,
                y + slice.height
            );

            const checkerColor = this.getCheckerColorForPlayer(player);
            const checkerTokens = this.theme.checkers[checkerColor];
            if (checkerColor === CHECKER_COLOR.WHITE) {
                grad.addColorStop(0, checkerTokens.collectedGradient[0]);
                grad.addColorStop(1, checkerTokens.collectedGradient[1]);
                this.ctx.strokeStyle = 'rgba(90, 64, 32, 0.65)';
            } else {
                grad.addColorStop(0, checkerTokens.collectedGradient[0]);
                grad.addColorStop(1, checkerTokens.collectedGradient[1]);
                this.ctx.strokeStyle = 'rgba(218, 189, 137, 0.25)';
            }

            this.ctx.fillStyle = grad;
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.42)';
            this.ctx.shadowBlur = 2;
            this.ctx.shadowOffsetY = 1;
            const cornerRadius = Math.min(
                3,
                slice.height / 2
            );
            const canDrawRoundedSlice =
                typeof this.ctx.roundRect === 'function';

            if (canDrawRoundedSlice) {
                this.ctx.beginPath();
                this.ctx.roundRect(
                    slice.x,
                    y,
                    slice.width,
                    slice.height,
                    cornerRadius
                );
                this.ctx.fill();
            } else {
                this.ctx.fillRect(
                    slice.x,
                    y,
                    slice.width,
                    slice.height
                );
            }
            this.ctx.shadowBlur = 0;
            this.ctx.shadowOffsetY = 0;
            this.ctx.lineWidth = 0.7;
            if (canDrawRoundedSlice) {
                this.ctx.stroke();
            } else {
                this.ctx.strokeRect(
                    slice.x,
                    y,
                    slice.width,
                    slice.height
                );
            }

            this.ctx.fillStyle = checkerColor === CHECKER_COLOR.WHITE
                ? 'rgba(255, 249, 225, 0.52)'
                : 'rgba(255, 255, 255, 0.16)';
            this.ctx.fillRect(
                slice.x + 2,
                y + 1,
                Math.max(1, slice.width - 4),
                1
            );
        }
    }

    drawVictoryTrayFlash(trayRect) {
        const state = this.victoryMomentState;
        if (!state) return;

        const flashWindow = Math.max(
            0.001,
            state.flashDurationMs / state.durationMs
        );
        if (state.progress >= flashWindow) return;

        const intensity = 1 - (state.progress / flashWindow);
        const centerX = trayRect.x + (trayRect.width / 2);
        const centerY = trayRect.y + (trayRect.height / 2);
        const maxRadius = Math.max(trayRect.width, trayRect.height) * 0.78;
        const ringRadius = (Math.max(trayRect.width, trayRect.height) * 0.52) + (8 * (1 - intensity));

        this.ctx.save();
        this.ctx.shadowColor = `rgba(255, 214, 122, ${0.36 * intensity})`;
        this.ctx.shadowBlur = state.reducedMotion ? 5 : 10;

        const halo = this.ctx.createRadialGradient(
            centerX,
            centerY,
            0,
            centerX,
            centerY,
            maxRadius
        );
        halo.addColorStop(0, `rgba(255, 233, 166, ${0.28 * intensity})`);
        halo.addColorStop(0.62, `rgba(255, 208, 109, ${0.16 * intensity})`);
        halo.addColorStop(1, 'rgba(255, 208, 109, 0)');
        this.ctx.fillStyle = halo;
        this.ctx.fillRect(
            trayRect.x - 3,
            trayRect.y - 3,
            trayRect.width + 6,
            trayRect.height + 6
        );

        this.ctx.strokeStyle = `rgba(255, 223, 150, ${0.30 * intensity})`;
        this.ctx.lineWidth = state.reducedMotion ? 1.1 : 1.5;
        this.ctx.beginPath();
        this.ctx.ellipse(
            centerX,
            centerY,
            ringRadius * 0.48,
            ringRadius,
            0,
            0,
            Math.PI * 2
        );
        this.ctx.stroke();
        this.ctx.restore();
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
        this.drawCollectedSlices(
            2,
            this.getAnimatedCollectedCount(2, bCollected),
            blackTray
        );

        if (
            this.victoryMomentState &&
            this.victoryMomentState.winner === 2
        ) {
            this.drawVictoryTrayFlash(blackTray);
        }

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
        this.drawCollectedSlices(
            1,
            this.getAnimatedCollectedCount(1, wCollected),
            whiteTray
        );

        if (
            this.victoryMomentState &&
            this.victoryMomentState.winner === 1
        ) {
            this.drawVictoryTrayFlash(whiteTray);
        }

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
