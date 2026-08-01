import test from 'node:test';
import assert from 'node:assert/strict';

import { NardeBot } from '../engine/bot.js';
import {
    applyBotDifficultySelection,
    normalizeBotDifficulty
} from '../engine/botDifficultyController.js';

test('champion difficulty routes makeDecision to the champion planner', () => {
    const bot = new NardeBot(2, 'champion');
    const sentinelMove = { from: 13, dice: 5, target: 18 };
    let championCalls = 0;

    bot.makeChampionDecision = game => {
        championCalls += 1;
        assert.equal(game.marker, 'champion-game');
        return sentinelMove;
    };

    const result = bot.makeDecision({ marker: 'champion-game' });

    assert.equal(championCalls, 1);
    assert.equal(result, sentinelMove);
});

test('difficulty selection keeps medium as fallback normalization', () => {
    assert.equal(normalizeBotDifficulty('champion'), 'champion');
    assert.equal(normalizeBotDifficulty('medium'), 'medium');
    assert.equal(normalizeBotDifficulty('not-real'), 'medium');
});

test('difficulty selection resets old plan and reschedules active bot turn once', () => {
    const bot = new NardeBot(2, 'medium');
    bot.plannedTurnMoves = [{ from: 13, dice: 2, target: 15 }];
    bot.plannedTurnStateKey = 'old-plan';

    const game = {
        gameStatus: 'PLAYING',
        currentPlayer: 2
    };
    const runtimeState = {
        invalidations: 0,
        invalidateSessionToken() {
            this.invalidations += 1;
        }
    };
    const scheduled = [];
    let guardResets = 0;

    const result = applyBotDifficultySelection({
        bot,
        game,
        runtimeState,
        nextDifficulty: 'champion',
        resetBotCallbackGuards() {
            guardResets += 1;
        },
        scheduleBotMoveCallback(delay) {
            scheduled.push(delay);
        }
    });

    assert.equal(result.difficulty, 'champion');
    assert.equal(result.shouldRescheduleBotTurn, true);
    assert.equal(bot.difficulty, 'champion');
    assert.deepEqual(bot.plannedTurnMoves, []);
    assert.equal(bot.plannedTurnStateKey, '');
    assert.equal(runtimeState.invalidations, 1);
    assert.equal(guardResets, 1);
    assert.deepEqual(scheduled, [0]);
});

test('difficulty selection does not reschedule while bot is not actively playing', () => {
    const bot = new NardeBot(2, 'hard');
    const game = {
        gameStatus: 'WAITING_FOR_DICE',
        currentPlayer: 2
    };
    const runtimeState = {
        invalidateSessionToken() {}
    };
    let scheduled = 0;

    const result = applyBotDifficultySelection({
        bot,
        game,
        runtimeState,
        nextDifficulty: 'champion',
        resetBotCallbackGuards() {},
        scheduleBotMoveCallback() {
            scheduled += 1;
        }
    });

    assert.equal(result.shouldRescheduleBotTurn, false);
    assert.equal(bot.difficulty, 'champion');
    assert.equal(scheduled, 0);
});