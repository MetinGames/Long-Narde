// engine/pieces.js

import { points } from "./board.js";

export const pieces = [];

const PIECES_PER_PLAYER = 15;

/**
 * Yeni bir taş oluşturur.
 */
function createPiece(id, player, pointId) {
    return {
        id,
        player,
        pointId,
        selected: false
    };
}

/**
 * Taşı belirtilen haneye yerleştirir.
 */
function placePiece(piece, pointId) {
    const point = points[pointId];

    if (!point) {
        console.error(`Hane bulunamadı: ${pointId}`);
        return;
    }

    piece.pointId = pointId;
    point.pieces.push(piece);
}

/**
 * Long Narde başlangıç taşlarını oluşturur.
 */
export function createInitialPieces() {
    pieces.length = 0;

    // Board yeniden oluşturulduysa haneleri temizler.
    for (const point of points) {
        point.pieces.length = 0;
    }

    let pieceId = 0;

    // Beyaz oyuncunun 15 taşı
    for (let i = 0; i < PIECES_PER_PLAYER; i++) {
        const piece = createPiece(pieceId++, "white", 0);

        pieces.push(piece);
        placePiece(piece, 0);
    }

    // Siyah oyuncunun 15 taşı
    for (let i = 0; i < PIECES_PER_PLAYER; i++) {
        const piece = createPiece(pieceId++, "black", 12);

        pieces.push(piece);
        placePiece(piece, 12);
    }
}