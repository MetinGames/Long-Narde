import test from 'node:test';
import assert from 'node:assert/strict';
import { Board } from '../engine/board.js';
import { NardeGame } from '../engine/game.js';
import { NardeBot } from '../engine/bot.js';

function clearBoard(board) {
    for (let i = 1; i <= 24; i++) {
        board.slots[i] = { count: 0, player: null };
    }
    board.borneOff = { 1: 0, 2: 0 };
}

function prepareTurn(game, player, diceValues, movesLeft = diceValues) {
    game.currentPlayer = player;
    game.dice.values = [...diceValues];
    game.dice.movesLeft = [...movesLeft];
    game.availableMoves = [...movesLeft];
    game.headMovesThisTurn = 0;
    game.gameStatus = 'PLAYING';
}

test('yeni oyun bütün kural durumunu başlangıca sıfırlar', () => {
    const game = new NardeGame();
    game.board.borneOff = { 1: 8, 2: 4 };
    game.turnsCompleted = { 1: 5, 2: 6 };
    game.availableMoves = [6, 6];
    game.initGame();

    assert.equal(game.board.slots[1].count, 15);
    assert.equal(game.board.slots[13].count, 15);
    assert.deepEqual(game.board.borneOff, { 1: 0, 2: 0 });
    assert.deepEqual(game.turnsCompleted, { 1: 0, 2: 0 });
    assert.deepEqual(game.availableMoves, []);
    assert.deepEqual(game.dice.values, []);
});

test('ilk turdaki özel çiftte baştan iki pul çıkabilir', () => {
    const game = new NardeGame();
    game.initGame();
    prepareTurn(game, 1, [4, 4], [4, 4, 4, 4]);

    assert.equal(game.executeMove(1, 4), true);
    assert.equal(game.executeMove(1, 4), true);
    assert.equal(game.executeMove(1, 4), false);
});

test('özel çift sonraki turlarda ikinci baş puluna izin vermez', () => {
    const game = new NardeGame();
    game.initGame();
    game.turnsCompleted[1] = 1;
    prepareTurn(game, 1, [4, 4], [4, 4, 4, 4]);

    assert.equal(game.executeMove(1, 4), true);
    assert.equal(game.executeMove(1, 4), false);
});

test('siyah pul 24 sınırından 1 hanesine doğru sarılır', () => {
    const board = new Board();
    assert.equal(board.calculateTargetSlot(2, 23, 3), 2);
});

test('siyah ev bölgesinden toplarken yeniden 1 hanesine sarılmaz', () => {
    const board = new Board();
    assert.equal(board.calculateTargetSlot(2, 11, 3), 14);
});

test('rakibin bütün pullarını geride bırakan altılı blok yasaktır', () => {
    const board = new Board();
    clearBoard(board);
    for (let slot = 7; slot <= 11; slot++) {
        board.slots[slot] = { count: 1, player: 1 };
    }
    board.slots[6] = { count: 1, player: 1 };
    board.slots[13] = { count: 15, player: 2 };

    assert.equal(board.isValidMove(1, 6, 12), false);
});

test('rakibin ileride pulu varsa altılı blok kurulabilir', () => {
    const board = new Board();
    clearBoard(board);
    for (let slot = 2; slot <= 6; slot++) {
        board.slots[slot] = { count: 1, player: 1 };
    }
    board.slots[1] = { count: 1, player: 1 };
    board.slots[8] = { count: 1, player: 2 };

    assert.equal(board.isValidMove(1, 1, 7), true);
});

test('pul tam zar değeriyle toplanabilir', () => {
    const board = new Board();
    clearBoard(board);
    board.slots[24] = { count: 1, player: 1 };

    assert.equal(board.canBearOff(1, 24, 1), true);
});

test('daha geride pul yoksa büyük zarla toplama yapılabilir', () => {
    const board = new Board();
    clearBoard(board);
    board.slots[24] = { count: 1, player: 1 };

    assert.equal(board.canBearOff(1, 24, 6), true);
});

test('daha geride pul varsa büyük zarla toplama yapılamaz', () => {
    const board = new Board();
    clearBoard(board);
    board.slots[19] = { count: 1, player: 1 };
    board.slots[24] = { count: 1, player: 1 };

    assert.equal(board.canBearOff(1, 24, 6), false);
});

test('toplanan taş oyuncu bazında sayılır ve oyun biter', () => {
    const game = new NardeGame();
    clearBoard(game.board);
    game.board.slots[24] = { count: 1, player: 1 };
    game.board.borneOff[1] = 14;
    prepareTurn(game, 1, [1, 1], [1]);

    assert.equal(game.executeMove(24, 1), true);
    assert.equal(game.board.borneOff[1], 15);
    assert.equal(game.checkWinCondition(), 1);
});

test('geri alma toplanan taş sayısını da geri yükler', () => {
    const game = new NardeGame();
    clearBoard(game.board);
    game.board.slots[24] = { count: 1, player: 1 };
    game.board.borneOff[1] = 14;
    game.currentPlayer = 1;
    game.gameStatus = 'WAITING_FOR_DICE';
    game.dice.roll = () => {
        game.dice.values = [1, 1];
        game.dice.movesLeft = [1];
        return { values: [1, 1], movesLeft: [1] };
    };
    game.rollDice();

    assert.equal(game.executeMove(24, 1), true);
    assert.equal(game.board.borneOff[1], 15);
    assert.equal(game.undoTurnMoves(), true);
    assert.equal(game.board.borneOff[1], 14);
    assert.equal(game.board.slots[24].count, 1);
});

test('yalnız bir zar oynanabiliyorsa büyük zar zorunludur', () => {
    const game = new NardeGame();
    clearBoard(game.board);
    game.board.slots[24] = { count: 1, player: 1 };
    game.board.borneOff[1] = 14;
    prepareTurn(game, 1, [1, 2], [1, 2]);

    assert.deepEqual(game.getRequiredFirstDiceValues(), [2]);
    assert.equal(game.executeMove(24, 1), false);
    assert.equal(game.executeMove(24, 2), true);
});

test('iki zar oynanabiliyorsa iki sıra da yasal başlangıçtır', () => {
    const game = new NardeGame();
    clearBoard(game.board);
    game.board.slots[5] = { count: 1, player: 1 };
    prepareTurn(game, 1, [1, 2], [1, 2]);

    assert.deepEqual(
        [...game.getRequiredFirstDiceValues()].sort((a, b) => a - b),
        [1, 2]
    );
    assert.equal(game.executeMove(5, 1), true);
    assert.equal(game.executeMove(6, 2), true);
    assert.deepEqual(game.availableMoves, []);
});

test('bot zorunlu büyük zarı seçer', () => {
    const game = new NardeGame();
    const bot = new NardeBot(2, 'hard');
    clearBoard(game.board);
    game.board.slots[12] = { count: 1, player: 2 };
    game.board.borneOff[2] = 14;
    prepareTurn(game, 2, [1, 2], [1, 2]);

    const move = bot.makeDecision(game);
    assert.equal(move.from, 12);
    assert.equal(move.dice, 2);
});
