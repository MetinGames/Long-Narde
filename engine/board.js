// engine/board.js

export const points = [];

const BOARD = {
    x: 80,
    y: 60,
    width: 1040,
    height: 680,
    triangleWidth: 80
};

export function createBoard() {

    points.length = 0;

    // Alt sıra (0-11)
    for (let i = 0; i < 12; i++) {

        let x = BOARD.x;

        if (i < 6) {
            x += (11 - i) * BOARD.triangleWidth;
        } else {
            x += (10 - i) * BOARD.triangleWidth - 40;
        }

        points.push({
            id: i,
            x: x,
            y: BOARD.y + BOARD.height,
            top: false,
            pieces: []
        });

    }

    // Üst sıra (12-23)
    for (let i = 12; i < 24; i++) {

        let index = i - 12;

        let x = BOARD.x;

        if (index < 6) {
            x += index * BOARD.triangleWidth;
        } else {
            x += (index + 1) * BOARD.triangleWidth + 40;
        }

        points.push({
            id: i,
            x: x,
            y: BOARD.y,
            top: true,
            pieces: []
        });

    }

}