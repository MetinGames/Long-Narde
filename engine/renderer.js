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

    ctx.fillStyle = "#d8a15b";
    ctx.fillRect(40, 40, 1120, 720);

    ctx.fillStyle = "#5b3414";
    ctx.fillRect(570, 40, 60, 720);

}