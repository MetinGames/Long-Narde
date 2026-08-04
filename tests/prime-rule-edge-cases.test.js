import test from 'node:test';
import assert from 'node:assert/strict';

import { Board } from '../engine/board.js';
import { NardeGame } from '../engine/game.js';

function createBoard(pieces = []) {
    const board = new Board();

    for (const { slot, count = 1, owner } of pieces) {
        board.slots[slot] = {
            count,
            player: owner
        };
    }

    return board;
}

function createGame({ player, dice, pieces }) {
    const game = new NardeGame();
    game.board = createBoard(pieces);
    game.currentPlayer = player;
    game.gameStatus = 'PLAYING';
    game.dice.values = [...dice];
    game.availableMoves = [...dice];
    game.headMovesThisTurn = 0;
    game.turnsCompleted = { 1: 1, 2: 1 };
    game.moveHistory = [];

    return game;
}

function primePieces(player, slots) {
    return slots.map(slot => ({ slot, owner: player }));
}

test('prime önündeki rakip sınırı iki oyuncunun ilk ve son pencerelerinde simetriktir', () => {
    const cases = [
        {
            label: 'white first window',
            player: 1,
            prime: [1, 2, 3, 4, 5, 6],
            behind: 13,
            ahead: 7
        },
        {
            label: 'white last window',
            player: 1,
            prime: [19, 20, 21, 22, 23, 24],
            behind: 18,
            ahead: 1
        },
        {
            label: 'black first window',
            player: 2,
            prime: [13, 14, 15, 16, 17, 18],
            behind: 1,
            ahead: 19
        },
        {
            label: 'black last window',
            player: 2,
            prime: [7, 8, 9, 10, 11, 12],
            behind: 6,
            ahead: 13
        }
    ];

    for (const fixture of cases) {
        const opponent = fixture.player === 1 ? 2 : 1;
        const behindBoard = createBoard([
            ...primePieces(fixture.player, fixture.prime),
            { slot: fixture.behind, owner: opponent }
        ]);
        const aheadBoard = createBoard([
            ...primePieces(fixture.player, fixture.prime),
            { slot: fixture.ahead, owner: opponent }
        ]);

        assert.equal(
            behindBoard.hasOpponentCheckerAhead(
                fixture.player,
                fixture.prime
            ),
            false,
            `${fixture.label}: checker behind the prime must not count as ahead`
        );
        assert.equal(
            aheadBoard.hasOpponentCheckerAhead(
                fixture.player,
                fixture.prime
            ),
            true,
            `${fixture.label}: first checker beyond the prime must count as ahead`
        );
    }
});

test('siyahın 24 -> 1 sarımını geçen altılı penceresi yasal kalır', () => {
    const board = createBoard([
        { slot: 19, owner: 2 },
        ...primePieces(2, [20, 21, 22, 23, 24]),
        { slot: 2, owner: 1 }
    ]);

    const target = board.calculateTargetSlot(2, 19, 6);

    assert.equal(target, 1);
    assert.equal(
        board.hasOpponentCheckerAhead(2, [20, 21, 22, 23, 24, 1]),
        true
    );
    assert.equal(board.wouldCreateIllegalPrime(2, 19, target), false);
    assert.equal(board.getInvalidMoveReason(2, 19, target), null);
});

test('kaynak hanedeki son pul ayrılınca sahte altılı blok oluşmaz', () => {
    const fixtures = [
        {
            player: 1,
            source: 1,
            target: 6,
            occupied: [2, 3, 4, 5],
            opponent: 13
        },
        {
            player: 2,
            source: 13,
            target: 18,
            occupied: [14, 15, 16, 17],
            opponent: 1
        }
    ];

    for (const fixture of fixtures) {
        const opponent = fixture.player === 1 ? 2 : 1;
        const board = createBoard([
            { slot: fixture.source, owner: fixture.player },
            ...primePieces(fixture.player, fixture.occupied),
            { slot: fixture.opponent, owner: opponent }
        ]);

        assert.equal(
            board.wouldCreateIllegalPrime(
                fixture.player,
                fixture.source,
                fixture.target
            ),
            false
        );
    }
});

test('kaynak hanede ikinci pul kalınca oluşan altılı blok reddedilir', () => {
    const fixtures = [
        {
            player: 1,
            source: 1,
            target: 6,
            occupied: [2, 3, 4, 5],
            opponent: 13
        },
        {
            player: 2,
            source: 13,
            target: 18,
            occupied: [14, 15, 16, 17],
            opponent: 1
        }
    ];

    for (const fixture of fixtures) {
        const opponent = fixture.player === 1 ? 2 : 1;
        const board = createBoard([
            { slot: fixture.source, count: 2, owner: fixture.player },
            ...primePieces(fixture.player, fixture.occupied),
            { slot: fixture.opponent, owner: opponent }
        ]);

        assert.equal(
            board.wouldCreateIllegalPrime(
                fixture.player,
                fixture.source,
                fixture.target
            ),
            true
        );
    }
});

test('siyah prime ihlali hamle listesinden çıkar ve özel nedenini korur', () => {
    const game = createGame({
        player: 2,
        dice: [6],
        pieces: [
            { slot: 13, owner: 2 },
            ...primePieces(2, [14, 15, 16, 17, 18]),
            { slot: 1, owner: 1 }
        ]
    });

    assert.equal(game.board.calculateTargetSlot(2, 13, 6), 19);
    assert.equal(
        game.board.getInvalidMoveReason(2, 13, 19),
        'illegalPrime'
    );
    assert.equal(
        game.getRawLegalSingleMoves().some(move => (
            move.from === 13 && move.dice === 6 && move.target === 19
        )),
        false
    );
    assert.equal(game.getUnplayableReason(13), 'illegalPrime');
});

test('prime önüne geçen rakip pulu aynı siyah hamleyi yasal tutar', () => {
    const game = createGame({
        player: 2,
        dice: [6],
        pieces: [
            { slot: 13, owner: 2 },
            ...primePieces(2, [14, 15, 16, 17, 18]),
            { slot: 20, owner: 1 }
        ]
    });

    assert.equal(game.board.getInvalidMoveReason(2, 13, 19), null);
    assert.equal(
        game.getRawLegalSingleMoves().some(move => (
            move.from === 13 && move.dice === 6 && move.target === 19
        )),
        true
    );
    assert.equal(game.processPlayerInput(13, 19), true);
});

test('beyazın son prime penceresi rakip sınırına göre doğru kapanır', () => {
    const createClosureBoard = opponentSlot => createBoard([
        { slot: 18, owner: 1 },
        ...primePieces(1, [19, 20, 21, 22, 23]),
        { slot: opponentSlot, owner: 2 }
    ]);
    const behindBoard = createClosureBoard(17);
    const aheadBoard = createClosureBoard(1);

    assert.equal(behindBoard.calculateTargetSlot(1, 18, 6), 24);
    assert.equal(behindBoard.wouldCreateIllegalPrime(1, 18, 24), true);
    assert.equal(
        behindBoard.getInvalidMoveReason(1, 18, 24),
        'illegalPrime'
    );
    assert.equal(aheadBoard.wouldCreateIllegalPrime(1, 18, 24), false);
    assert.equal(aheadBoard.getInvalidMoveReason(1, 18, 24), null);
});
