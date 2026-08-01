import test from 'node:test';
import assert from 'node:assert/strict';

import { NardeGame } from '../engine/game.js';
import { NardeBot } from '../engine/bot.js';

function prepareGame({
    player = 1,
    dice = [3, 5],
    pieces = []
} = {}) {
    const game = new NardeGame();

    for (let slotId = 1; slotId <= 24; slotId++) {
        game.board.slots[slotId] = {
            count: 0,
            player: null
        };
    }

    for (const { slot, count, owner } of pieces) {
        game.board.slots[slot] = {
            count,
            player: owner
        };
    }

    game.board.borneOff = { 1: 0, 2: 0 };
    game.currentPlayer = player;
    game.gameStatus = 'PLAYING';
    game.dice.values = [...dice];
    game.availableMoves = [...dice];
    game.headMovesThisTurn = 0;
    game.turnsCompleted = { 1: 1, 2: 1 };
    game.moveHistory = [];

    return game;
}

test('yalnız bir zar oynanabiliyorsa büyük zar zorunludur', () => {
    const game = prepareGame({
        pieces: [
            { slot: 1, count: 1, owner: 1 },
            { slot: 9, count: 1, owner: 2 }
        ]
    });

    assert.equal(game.getMaximumPlayableMoveCount(), 1);
    assert.deepEqual(game.getRequiredDiceValues(), [5]);
    assert.equal(game.processPlayerInput(1, 4), false);
    assert.equal(game.processPlayerInput(1, 6), true);
    assert.deepEqual(game.availableMoves, [3]);
});

test('iki zar oynanabiliyorsa iki sıra da yasal başlangıçtır', () => {
    const game = prepareGame({
        pieces: [
            { slot: 2, count: 1, owner: 1 }
        ]
    });

    assert.equal(game.getMaximumPlayableMoveCount(), 2);
    assert.deepEqual(
        [...game.getRequiredDiceValues()].sort((a, b) => a - b),
        [3, 5]
    );

    const sequences = game.getRuleCompliantDiceSequences(2)
        .map(sequence => sequence.join(','));

    assert.ok(sequences.includes('3'));
    assert.ok(sequences.includes('5'));
    assert.ok(sequences.includes('3,5'));
    assert.ok(sequences.includes('5,3'));
});

test('cift 1 durumunda mumkunse dort hak da tek hamlede kullanilabilir', () => {
    const game = prepareGame({
        dice: [1, 1, 1, 1],
        pieces: [
            { slot: 20, count: 1, owner: 1 }
        ]
    });

    const legalTargets = game.getLegalTargets(20);
    assert.ok(legalTargets.includes(24));

    assert.equal(game.processPlayerInput(20, 24), true);
    assert.equal(game.availableMoves.length, 0);
    assert.deepEqual(game.board.slots[20], { count: 0, player: null });
    assert.deepEqual(game.board.slots[24], { count: 1, player: 1 });
});

test('cift 1 durumunda birden fazla yasal baslangic pulu secilebilir', () => {
    const game = prepareGame({
        dice: [1, 1, 1, 1],
        pieces: [
            { slot: 20, count: 1, owner: 1 },
            { slot: 21, count: 1, owner: 1 }
        ]
    });

    assert.ok(game.getLegalTargets(20).length > 0);
    assert.ok(game.getLegalTargets(21).length > 0);
});

test('maksimum hamle kurali nedeniyle reddedilen pul icin acik sebep doner', () => {
    const game = prepareGame({
        dice: [3, 5],
        pieces: [
            { slot: 13, count: 3, owner: 1 },
            { slot: 23, count: 2, owner: 1 },
            { slot: 21, count: 1, owner: 1 },
            { slot: 2, count: 2, owner: 2 },
            { slot: 11, count: 1, owner: 2 },
            { slot: 18, count: 1, owner: 2 },
            { slot: 15, count: 2, owner: 2 }
        ]
    });

    assert.deepEqual(
        game.getRawLegalSingleMoves().filter(move => move.from === 21),
        [{ from: 21, dice: 3, target: 24 }]
    );
    assert.deepEqual(game.getLegalTargets(21), []);
    assert.equal(game.getUnplayableReason(21), 'maxMoveConstraint');
});

test('memoization tekrarlayan durumlarda hesaplama tekrarini azaltir', () => {
    const game = prepareGame({
        dice: [1, 1, 1, 1],
        pieces: [
            { slot: 1, count: 5, owner: 1 },
            { slot: 2, count: 5, owner: 1 },
            { slot: 3, count: 5, owner: 1 }
        ]
    });

    game.resetAnalysisMetrics();
    const maxMoves = game.getMaximumPlayableMoveCount();
    const metrics = game.getAnalysisMetrics();

    assert.equal(maxMoves, 4);
    assert.ok(metrics.memoHits > 0);
    assert.ok(metrics.memoMisses > 0);
    assert.ok(metrics.memoHits >= metrics.memoMisses / 4);
});

test('bot zorunlu büyük zarı seçer', () => {
    const game = prepareGame({
        player: 2,
        pieces: [
            { slot: 13, count: 1, owner: 2 },
            { slot: 21, count: 1, owner: 1 }
        ]
    });
    const bot = new NardeBot(2, 'hard');

    const move = bot.makeDecision(game);

    assert.ok(move);
    assert.equal(move.from, 13);
    assert.equal(move.dice, 5);
    assert.equal(move.target, 18);
});

test('yeni oyun bütün kural durumunu başlangıca sıfırlar', () => {
    const game = new NardeGame();

    game.initGame();
    game.mode = 'ranked';
    game.timeoutStrikes = 2;
    game.endReason = 'timeout';
    game.currentPlayer = 2;
    game.gameStatus = 'GAME_OVER';
    game.dice.values = [4, 5];
    game.availableMoves = [4, 5];
    game.headMovesThisTurn = 2;
    game.turnsCompleted = { 1: 4, 2: 3 };
    game.moveHistory = [{ stale: true }];
    game.board.borneOff = { 1: 7, 2: 9 };
    game.board.slots[1] = { count: 0, player: null };
    game.board.slots[13] = { count: 0, player: null };

    game.initGame();

    assert.equal(game.currentPlayer, 1);
    assert.equal(game.gameStatus, 'WAITING_FOR_DICE');
    assert.equal(game.mode, 'casual');
    assert.equal(game.timeoutStrikes, 0);
    assert.equal(game.endReason, null);
    assert.deepEqual(game.dice.values, []);
    assert.deepEqual(game.availableMoves, []);
    assert.equal(game.headMovesThisTurn, 0);
    assert.deepEqual(game.turnsCompleted, { 1: 0, 2: 0 });
    assert.deepEqual(game.moveHistory, []);
    assert.deepEqual(game.board.borneOff, { 1: 0, 2: 0 });
    assert.deepEqual(
        game.board.slots[game.board.getHeadSlot(1)],
        { count: 15, player: 1 }
    );
    assert.deepEqual(
        game.board.slots[game.board.getHeadSlot(2)],
        { count: 15, player: 2 }
    );
});

test('kazanan kontrolü kazanan belirlenince gameStatus GAME_OVER olarak ayarlar', () => {
    const game = prepareGame();

    game.board.borneOff = { 1: 15, 2: 0 };
    game.gameStatus = 'PLAYING';

    const winner = game.checkWinCondition();

    assert.equal(winner, 1);
    assert.equal(game.gameStatus, 'GAME_OVER');
    assert.equal(game.endReason, 'white_win');
});

test('casual modda ilk zaman aşımı uyarı verir, ikinci zaman aşımında kaybettirir', () => {
    const game = prepareGame();
    game.mode = 'casual';
    game.status = 'PLAYING';

    assert.equal(game.timeoutStrikes, 0);
    assert.equal(game.recordHumanTimeout(), 'warning');
    assert.equal(game.timeoutStrikes, 1);
    assert.equal(game.gameStatus, 'PLAYING');

    assert.equal(game.recordHumanTimeout(), 'gameOver');
    assert.equal(game.gameStatus, 'GAME_OVER');
    assert.equal(game.endReason, 'timeout');
});

test('başarılı hamle timeout strikes değerini sıfırlar', () => {
    const game = prepareGame();
    game.timeoutStrikes = 1;

    game.resetTimeoutStrikes();
    assert.equal(game.timeoutStrikes, 0);
});

test('rakip bütün pulları aldığında gameStatus GAME_OVER olur', () => {
    const game = prepareGame();

    game.board.borneOff = { 1: 0, 2: 15 };
    game.gameStatus = 'PLAYING';

    const winner = game.checkWinCondition();

    assert.equal(winner, 2);
    assert.equal(game.gameStatus, 'GAME_OVER');
});

test('siyah pul 24 sınırından 1 hanesine doğru sarılır', () => {
    const game = prepareGame({
        player: 2,
        dice: [4],
        pieces: [
            { slot: 23, count: 1, owner: 2 }
        ]
    });

    assert.equal(game.board.calculateTargetSlot(2, 23, 4), 3);
    assert.equal(game.processPlayerInput(23, 3), true);
    assert.deepEqual(game.board.slots[3], {
        count: 1,
        player: 2
    });
});

test('siyah ev bölgesinden taş toplarken yeniden 1 hanesine sarılmaz', () => {
    const game = prepareGame({
        player: 2,
        dice: [4],
        pieces: [
            { slot: 9, count: 1, owner: 2 }
        ]
    });

    assert.equal(game.board.calculateTargetSlot(2, 9, 4), 13);
    assert.equal(game.processPlayerInput(9, 25), true);
    assert.equal(game.board.borneOff[2], 1);
    assert.deepEqual(game.board.slots[1], {
        count: 0,
        player: null
    });
});

test('rakibin bütün pullarını geride bırakan altılı blok yasaktır', () => {
    const game = prepareGame({
        player: 1,
        dice: [6],
        pieces: [
            { slot: 1, count: 1, owner: 1 },
            { slot: 2, count: 1, owner: 1 },
            { slot: 3, count: 1, owner: 1 },
            { slot: 4, count: 1, owner: 1 },
            { slot: 5, count: 1, owner: 1 },
            { slot: 6, count: 1, owner: 1 },
            { slot: 13, count: 15, owner: 2 }
        ]
    });

    assert.equal(game.processPlayerInput(1, 7), false);
    assert.deepEqual(game.board.slots[1], {
        count: 1,
        player: 1
    });
    assert.deepEqual(game.board.slots[7], {
        count: 0,
        player: null
    });
});

test('rakibin ileride pulu varsa altılı blok kurulabilir', () => {
    const game = prepareGame({
        player: 1,
        dice: [6],
        pieces: [
            { slot: 1, count: 1, owner: 1 },
            { slot: 2, count: 1, owner: 1 },
            { slot: 3, count: 1, owner: 1 },
            { slot: 4, count: 1, owner: 1 },
            { slot: 5, count: 1, owner: 1 },
            { slot: 6, count: 1, owner: 1 },
            { slot: 8, count: 1, owner: 2 },
            { slot: 13, count: 14, owner: 2 }
        ]
    });

    assert.equal(game.processPlayerInput(1, 7), true);
    assert.deepEqual(game.board.slots[7], {
        count: 1,
        player: 1
    });
});

test('pul tam zar değeriyle toplanabilir', () => {
    const game = prepareGame({
        player: 1,
        dice: [1],
        pieces: [
            { slot: 24, count: 1, owner: 1 }
        ]
    });

    assert.equal(game.processPlayerInput(24, 25), true);
    assert.equal(game.board.borneOff[1], 1);
    assert.deepEqual(game.board.slots[24], {
        count: 0,
        player: null
    });
});

test('daha geride pul yoksa büyük zarla toplama yapılabilir', () => {
    const game = prepareGame({
        player: 1,
        dice: [3],
        pieces: [
            { slot: 23, count: 1, owner: 1 },
            { slot: 24, count: 2, owner: 1 }
        ]
    });

    assert.equal(game.processPlayerInput(23, 25), true);
    assert.equal(game.board.borneOff[1], 1);
});

test('daha geride pul varsa öndeki pul büyük zarla toplanamaz', () => {
    const game = prepareGame({
        player: 1,
        dice: [3],
        pieces: [
            { slot: 23, count: 1, owner: 1 },
            { slot: 24, count: 1, owner: 1 }
        ]
    });

    assert.equal(game.processPlayerInput(24, 25), false);
    assert.equal(game.board.borneOff[1], 0);
    assert.deepEqual(game.board.slots[24], {
        count: 1,
        player: 1
    });
});

test('ilk tur özel çiftinde baştan en fazla iki pul çıkar', () => {
    const game = prepareGame({
        player: 1,
        dice: [3, 3, 3, 3],
        pieces: [
            { slot: 1, count: 15, owner: 1 }
        ]
    });
    game.dice.values = [3, 3];
    game.turnsCompleted = { 1: 0, 2: 0 };

    assert.equal(game.processPlayerInput(1, 4), true);
    assert.equal(game.processPlayerInput(1, 4), true);
    assert.equal(game.processPlayerInput(1, 4), false);
    assert.equal(game.headMovesThisTurn, 2);
    assert.equal(game.board.slots[1].count, 13);
});

test('ilk turda özel olmayan çiftte baştan yalnız bir pul çıkar', () => {
    const game = prepareGame({
        player: 1,
        dice: [5, 5, 5, 5],
        pieces: [
            { slot: 1, count: 15, owner: 1 }
        ]
    });
    game.dice.values = [5, 5];
    game.turnsCompleted = { 1: 0, 2: 0 };

    assert.equal(game.processPlayerInput(1, 6), true);
    assert.equal(game.processPlayerInput(1, 6), false);
    assert.equal(game.headMovesThisTurn, 1);
    assert.equal(game.board.slots[1].count, 14);
});

test('özel çift daha sonraki turlarda ikinci baş puluna izin vermez', () => {
    const game = prepareGame({
        player: 1,
        dice: [6, 6, 6, 6],
        pieces: [
            { slot: 1, count: 15, owner: 1 }
        ]
    });
    game.dice.values = [6, 6];
    game.turnsCompleted = { 1: 1, 2: 1 };

    assert.equal(game.processPlayerInput(1, 7), true);
    assert.equal(game.processPlayerInput(1, 7), false);
    assert.equal(game.headMovesThisTurn, 1);
});

test('geri alma son hamlenin tahta ve zar durumunu birlikte düzeltir', () => {
    const game = prepareGame({
        player: 1,
        dice: [3, 5],
        pieces: [
            { slot: 1, count: 2, owner: 1 }
        ]
    });

    assert.equal(game.executeMove(1, 3), true);
    assert.deepEqual(game.availableMoves, [5]);
    assert.equal(game.headMovesThisTurn, 1);
    assert.equal(game.board.slots[1].count, 1);
    assert.deepEqual(game.board.slots[4], {
        count: 1,
        player: 1
    });

    assert.equal(game.undoTurnMoves(), true);
    assert.deepEqual(game.availableMoves, [3, 5]);
    assert.equal(game.headMovesThisTurn, 0);
    assert.deepEqual(game.board.slots[1], {
        count: 2,
        player: 1
    });
    assert.deepEqual(game.board.slots[4], {
        count: 0,
        player: null
    });
    assert.equal(game.undoTurnMoves(), false);
});

test('toplanan pul geri alındığında toplama sayacı da geri döner', () => {
    const game = prepareGame({
        player: 1,
        dice: [1],
        pieces: [
            { slot: 24, count: 1, owner: 1 }
        ]
    });

    assert.equal(game.processPlayerInput(24, 25), true);
    assert.equal(game.board.borneOff[1], 1);

    assert.equal(game.undoTurnMoves(), true);
    assert.equal(game.board.borneOff[1], 0);
    assert.deepEqual(game.board.slots[24], {
        count: 1,
        player: 1
    });
    assert.deepEqual(game.availableMoves, [1]);
});

test('tur tamamlandıktan sonra önceki turun hamlesi geri alınamaz', () => {
    const game = prepareGame({
        player: 1,
        dice: [3],
        pieces: [
            { slot: 2, count: 1, owner: 1 }
        ]
    });

    assert.equal(game.executeMove(2, 3), true);
    game.confirmTurnEnd();

    assert.equal(game.undoTurnMoves(), false);
    assert.deepEqual(game.moveHistory, []);
    assert.equal(game.currentPlayer, 2);
});

test('on beş pul toplanmadan oyun bitmez', () => {
    const game = prepareGame({
        player: 1,
        dice: [1],
        pieces: [
            { slot: 24, count: 2, owner: 1 }
        ]
    });
    game.board.borneOff = { 1: 13, 2: 0 };

    assert.equal(game.processPlayerInput(24, 25), true);
    assert.equal(game.board.borneOff[1], 14);
    assert.equal(game.checkWinCondition(), 0);
    assert.equal(game.gameStatus, 'PLAYING');
});

test('beyaz on beşinci pulunu toplayınca kazanır ve oyun durur', () => {
    const game = prepareGame({
        player: 1,
        dice: [1],
        pieces: [
            { slot: 24, count: 1, owner: 1 }
        ]
    });
    game.board.borneOff = { 1: 14, 2: 0 };

    assert.equal(game.processPlayerInput(24, 25), true);
    assert.equal(game.checkWinCondition(), 1);
    assert.equal(game.gameStatus, 'GAME_OVER');
    assert.equal(game.executeMove(24, 1), false);
});

test('siyah on beşinci pulunu toplayınca doğru oyuncu kazanır', () => {
    const game = prepareGame({
        player: 2,
        dice: [1],
        pieces: [
            { slot: 12, count: 1, owner: 2 }
        ]
    });
    game.board.borneOff = { 1: 0, 2: 14 };

    assert.equal(game.processPlayerInput(12, 25), true);
    assert.equal(game.checkWinCondition(), 2);
    assert.equal(game.gameStatus, 'GAME_OVER');
});

test('botun seçtiği hamle kural motoru tarafından uygulanabilir', () => {
    const game = prepareGame({
        player: 2,
        dice: [3, 5],
        pieces: [
            { slot: 13, count: 15, owner: 2 }
        ]
    });
    const bot = new NardeBot(2, 'medium');

    const move = bot.makeDecision(game);

    assert.ok(move);
    assert.equal(game.executeMove(move.from, move.dice), true);
    assert.equal(game.availableMoves.length, 1);
});

test('bot baştan çıkış sınırı dolduğunda ikinci baş pulu seçmez', () => {
    const game = prepareGame({
        player: 2,
        dice: [5],
        pieces: [
            { slot: 13, count: 15, owner: 2 }
        ]
    });
    game.dice.values = [5, 2];
    game.headMovesThisTurn = 1;
    game.turnsCompleted = { 1: 1, 2: 1 };
    const bot = new NardeBot(2, 'hard');

    assert.equal(game.hasValidMoves(), false);
    assert.equal(bot.makeDecision(game), null);
});

test('bot mümkün olduğunda pul toplamayı seçer', () => {
    const game = prepareGame({
        player: 2,
        dice: [1],
        pieces: [
            { slot: 12, count: 1, owner: 2 }
        ]
    });
    game.board.borneOff = { 1: 0, 2: 14 };
    const bot = new NardeBot(2, 'medium');

    const move = bot.makeDecision(game);

    assert.ok(move);
    assert.equal(move.from, 12);
    assert.equal(move.dice, 1);
    assert.equal(move.target, 25);
    assert.equal(game.executeMove(move.from, move.dice), true);
    assert.equal(game.board.borneOff[2], 15);
});

test('botun yasal hamlesi yoksa karar üretmez', () => {
    const game = prepareGame({
        player: 2,
        dice: [3, 5],
        pieces: [
            { slot: 13, count: 15, owner: 2 },
            { slot: 16, count: 1, owner: 1 },
            { slot: 18, count: 1, owner: 1 }
        ]
    });
    const bot = new NardeBot(2, 'easy');

    assert.equal(game.hasValidMoves(), false);
    assert.equal(bot.makeDecision(game), null);
});

test('kolay botun rastgele puanı denetlenebilir', () => {
    const game = prepareGame({
        player: 2,
        dice: [3],
        pieces: [
            { slot: 14, count: 2, owner: 2 }
        ]
    });
    const bot = new NardeBot(2, 'easy', () => 0.25);

    assert.equal(
        bot.evaluateMove(14, 17, game, false, 3),
        25
    );
});

test('orta bot kendi pullarını birleştiren hamleye ek puan verir', () => {
    const game = prepareGame({
        player: 2,
        dice: [3],
        pieces: [
            { slot: 14, count: 2, owner: 2 },
            { slot: 17, count: 1, owner: 2 }
        ]
    });
    const bot = new NardeBot(2, 'medium', () => 0);

    const mergeScore =
        bot.evaluateMove(14, 17, game, false, 3);

    game.board.slots[17] = {
        count: 0,
        player: null
    };
    const emptyScore =
        bot.evaluateMove(14, 17, game, false, 3);

    assert.ok(mergeScore > emptyScore);
    assert.equal(mergeScore - emptyScore, 25);
});

test('zor bot ev bölgesine ilerleyen hamleye orta bottan fazla puan verir', () => {
    const game = prepareGame({
        player: 2,
        dice: [6],
        pieces: [
            { slot: 1, count: 2, owner: 2 }
        ]
    });
    const medium = new NardeBot(2, 'medium', () => 0);
    const hard = new NardeBot(2, 'hard', () => 0);

    const mediumScore =
        medium.evaluateMove(1, 7, game, false, 6);
    const hardScore =
        hard.evaluateMove(1, 7, game, false, 6);

    assert.ok(hardScore > mediumScore);
    assert.equal(hardScore - mediumScore, 15);
});

test('zor bot tahta değerlendirmesinden sonra oyun durumunu değiştirmez', () => {
    const game = prepareGame({
        player: 2,
        dice: [3, 6],
        pieces: [
            { slot: 13, count: 2, owner: 2 },
            { slot: 14, count: 1, owner: 2 },
            { slot: 15, count: 1, owner: 2 }
        ]
    });
    const bot = new NardeBot(2, 'hard', () => 0);
    const before = game.createMoveStateSnapshot();

    const score = bot.evaluateHardPosition(game, 13, 3);

    assert.ok(Number.isFinite(score));
    assert.deepEqual(game.createMoveStateSnapshot(), before);
});

test('zor bot ardışık blok zincirini uzatan konumu tercih eder', () => {
    const game = prepareGame({
        player: 2,
        dice: [3, 6],
        pieces: [
            { slot: 13, count: 2, owner: 2 },
            { slot: 14, count: 1, owner: 2 },
            { slot: 15, count: 1, owner: 2 }
        ]
    });
    const bot = new NardeBot(2, 'hard', () => 0);

    const extendPrimeScore =
        bot.evaluateHardPosition(game, 13, 3);
    const scatteredScore =
        bot.evaluateHardPosition(game, 13, 6);

    assert.ok(extendPrimeScore > scatteredScore);
});

