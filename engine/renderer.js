const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 1200;
canvas.height = 800;

export function initRenderer() {
    draw();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBoard();
}

function drawBoard() {
    // Tahtanın dış zemini
    ctx.fillStyle = "#d8a15b";
    ctx.fillRect(40, 40, 1120, 720);

    // Ortadaki bar
    ctx.fillStyle = "#5b3414";
    ctx.fillRect(570, 40, 60, 720);

    drawPoints();
}

function drawPoints() {
    const pointWidth = 85;
    const pointHeight = 300;

    const startX = 50;
    const topY = 50;
    const bottomY = 750;

    for (let i = 0; i < 12; i++) {
        const x = getPointX(i, startX, pointWidth);

        const color =
            i % 2 === 0
                ? "#7a2f20"
                : "#ead3a1";

        drawTriangle(
            x,
            topY,
            pointWidth,
            pointHeight,
            true,
            color
        );

        drawTriangle(
            x,
            bottomY,
            pointWidth,
            pointHeight,
            false,
            color
        );
    }
}

function getPointX(index, startX, pointWidth) {
    const barWidth = 60;

    if (index < 6) {
        return startX + index * pointWidth;
    }

    return (
        startX +
        index * pointWidth +
        barWidth
    );
}

function drawTriangle(
    x,
    y,
    width,
    height,
    pointsDown,
    color
) {
    ctx.beginPath();

    if (pointsDown) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + width, y);
        ctx.lineTo(x + width / 2, y + height);
    } else {
        ctx.moveTo(x, y);
        ctx.lineTo(x + width, y);
        ctx.lineTo(x + width / 2, y - height);
    }

    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();

    ctx.strokeStyle = "#3b2415";
    ctx.lineWidth = 2;
    ctx.stroke();
}