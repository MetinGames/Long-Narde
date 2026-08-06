import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function readAppSource() {
    const appPath = path.resolve(process.cwd(), 'app.js');
    return fs.readFileSync(appPath, 'utf8');
}

function getSection(source, startMarker, endMarker) {
    const start = source.indexOf(startMarker);
    assert.notEqual(start, -1, `section start not found: ${startMarker}`);

    const end = source.indexOf(endMarker, start);
    assert.notEqual(end, -1, `section end not found: ${endMarker}`);

    return source.slice(start, end);
}

test('zar animasyonu tamamlaninca yasal dizi yoksa otomatik pas startHumanTimer oncesi calisir', () => {
    const source = readAppSource();
    const section = getSection(
        source,
        'function startAutomaticDiceRoll() {',
        'async function runBotMove() {'
    );

    const rollIdx = section.indexOf('const diceValues = game.rollDice();');
    assert.notEqual(rollIdx, -1);

    const autoPassCheckIdx = section.indexOf(
        "if (!hasAnyRuleCompliantTurnStart(game, { player: rollingPlayer })) {",
        rollIdx
    );
    assert.notEqual(autoPassCheckIdx, -1);

    const passCallIdx = section.indexOf('passCurrentTurnWhenNoLegalMove();', autoPassCheckIdx);
    assert.notEqual(passCallIdx, -1);

    const startTimerIdx = section.indexOf('startHumanTimer();', rollIdx);
    assert.notEqual(startTimerIdx, -1);

    const botScheduleIdx = section.indexOf(
        'scheduleBotMoveCallback(getCurrentBotMoveStepDelay());',
        rollIdx
    );
    assert.notEqual(botScheduleIdx, -1);

    assert.ok(autoPassCheckIdx > rollIdx);
    assert.ok(passCallIdx > autoPassCheckIdx);
    assert.ok(passCallIdx < startTimerIdx);
    assert.ok(passCallIdx < botScheduleIdx);
});

test('otomatik pas akisi aninda durum mesaji verir ve aksiyon dugmelerini gizler', () => {
    const source = readAppSource();
    const section = getSection(
        source,
        'function passCurrentTurnWhenNoLegalMove() {',
        'function beginCurrentTurn(options = {}) {'
    );

    assert.equal(
        section.includes(
            'const statusOverrideKey =\n' +
            '        getNoLegalMoveRuleExplanation().messageKey;'
        ),
        true
    );
    assert.equal(section.includes('ui.setHumanTurnLayout();'), true);
    assert.equal(section.includes('ui.setBotTurnLayout();'), true);
    assert.equal(section.includes('setStatus(t(statusOverrideKey), { force: true });'), true);
    assert.equal(section.includes('updateScreen();'), true);
});

test('bot akisi hamlesiz durumda karar uretmeden once guvenli pas yolunu kullanir', () => {
    const source = readAppSource();
    const section = getSection(
        source,
        'async function runBotMove() {',
        'function showGameOver(winner, messageKey = null) {'
    );

    const noLegalIdx = section.indexOf("if (!hasAnyRuleCompliantTurnStart(game, { player: bot.playerNumber })) {");
    assert.notEqual(noLegalIdx, -1);

    const passIdx = section.indexOf('passCurrentTurnWhenNoLegalMove();', noLegalIdx);
    assert.notEqual(passIdx, -1);

    const decisionIdx = section.indexOf('const move = bot.makeDecision(game);');
    assert.notEqual(decisionIdx, -1);

    assert.ok(passIdx < decisionIdx);
});
