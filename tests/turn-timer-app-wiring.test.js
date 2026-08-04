import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const appSource = fs.readFileSync(
    new URL('../app.js', import.meta.url),
    'utf8'
);
const htmlSource = fs.readFileSync(
    new URL('../index.html', import.meta.url),
    'utf8'
);

test('bot maçı süre seçenekleri uygulama ve devam eden maç akışına bağlıdır', () => {
    assert.match(htmlSource, /id="start-turn-timer"/);
    for (const value of ['0', '30', '60', '90']) {
        assert.match(htmlSource, new RegExp(`option value="${value}"`));
    }

    assert.match(
        appSource,
        /new TurnTimerPreferenceController\(\{[\s\S]*select: startTurnTimerSelect/
    );
    assert.match(
        appSource,
        /turnTimerSeconds: getHumanTurnDuration\(\)/
    );
    assert.match(
        appSource,
        /setDurationSeconds\([\s\S]*snapshot\.turnTimerSeconds/
    );
    assert.match(
        appSource,
        /if \(duration <= 0\) \{[\s\S]*ui\.updateTimerDisabled\(\);[\s\S]*return;/
    );
});
