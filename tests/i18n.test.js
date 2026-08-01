import test from 'node:test';
import assert from 'node:assert/strict';

class FakeStorage {
    constructor(initial = {}) {
        this.store = { ...initial };
    }

    getItem(key) {
        return Object.prototype.hasOwnProperty.call(this.store, key)
            ? this.store[key]
            : null;
    }

    setItem(key, value) {
        this.store[key] = String(value);
    }

    removeItem(key) {
        delete this.store[key];
    }

    clear() {
        this.store = {};
    }
}

function defineGlobalProperty(key, value) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    const original = descriptor ? { ...descriptor } : null;

    Object.defineProperty(globalThis, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value
    });

    return original;
}

function restoreGlobalProperty(key, original) {
    if (original === null) {
        delete globalThis[key];
    } else {
        Object.defineProperty(globalThis, key, original);
    }
}

test('restores saved language from localStorage', async () => {
    const savedStorage = new FakeStorage({ 'narde-language': 'ru' });
    const originalLocalStorage = defineGlobalProperty('localStorage', savedStorage);
    const originalNavigator = defineGlobalProperty('navigator', {
        language: 'tr-TR',
        languages: ['tr-TR', 'en-US']
    });

    const modulePath = new URL('../engine/i18n.js?cache=' + Date.now(), import.meta.url);
    const i18n = await import(modulePath.href);

    assert.equal(i18n.getLanguage(), 'ru');
    assert.equal(savedStorage.getItem('narde-language'), 'ru');

    restoreGlobalProperty('localStorage', originalLocalStorage);
    restoreGlobalProperty('navigator', originalNavigator);
});

test('ignores unsupported stored language and falls back to English', async () => {
    const savedStorage = new FakeStorage({ 'narde-language': 'de' });
    const originalLocalStorage = defineGlobalProperty('localStorage', savedStorage);
    const originalNavigator = defineGlobalProperty('navigator', {
        language: 'ru-RU',
        languages: ['ru-RU', 'en-US']
    });

    const modulePath = new URL('../engine/i18n.js?cache=' + Date.now(), import.meta.url);
    const i18n = await import(modulePath.href);

    assert.equal(i18n.getLanguage(), 'en');
    assert.equal(savedStorage.getItem('narde-language'), null);

    restoreGlobalProperty('localStorage', originalLocalStorage);
    restoreGlobalProperty('navigator', originalNavigator);
});

test('saves new valid language selection to localStorage', async () => {
    const savedStorage = new FakeStorage();
    const originalLocalStorage = defineGlobalProperty('localStorage', savedStorage);
    const originalNavigator = defineGlobalProperty('navigator', {
        language: 'en-US',
        languages: ['en-US']
    });

    const modulePath = new URL('../engine/i18n.js?cache=' + Date.now(), import.meta.url);
    const i18n = await import(modulePath.href);

    i18n.setLanguage('ru');
    assert.equal(i18n.getLanguage(), 'ru');
    assert.equal(savedStorage.getItem('narde-language'), 'ru');

    i18n.setLanguage('tr');
    assert.equal(i18n.getLanguage(), 'tr');
    assert.equal(savedStorage.getItem('narde-language'), 'tr');

    i18n.setLanguage('de');
    assert.equal(i18n.getLanguage(), 'en');
    assert.equal(savedStorage.getItem('narde-language'), null);

    restoreGlobalProperty('localStorage', originalLocalStorage);
    restoreGlobalProperty('navigator', originalNavigator);
});

test('detects Russian browser language when there is no saved preference', async () => {
    const savedStorage = new FakeStorage();
    const originalLocalStorage = defineGlobalProperty('localStorage', savedStorage);
    const originalNavigator = defineGlobalProperty('navigator', {
        language: 'ru-RU',
        languages: ['ru-RU', 'en-US']
    });

    const modulePath = new URL('../engine/i18n.js?cache=' + Date.now(), import.meta.url);
    const i18n = await import(modulePath.href);

    assert.equal(i18n.getLanguage(), 'ru');
    assert.equal(savedStorage.getItem('narde-language'), null);

    restoreGlobalProperty('localStorage', originalLocalStorage);
    restoreGlobalProperty('navigator', originalNavigator);
});

test('all supported languages expose the same translation keys', async () => {
    const savedStorage = new FakeStorage({ 'narde-language': 'en' });
    const originalLocalStorage = defineGlobalProperty('localStorage', savedStorage);
    const originalNavigator = defineGlobalProperty('navigator', {
        language: 'en-US',
        languages: ['en-US']
    });

    const modulePath = new URL('../engine/i18n.js?cache=' + Date.now(), import.meta.url);
    const i18n = await import(modulePath.href);

    const languageKeys = Object.fromEntries(
        Object.entries(i18n.__translations).map(([lang, dict]) => [
            lang,
            Object.keys(dict).sort()
        ])
    );

    assert.deepEqual(languageKeys.tr, languageKeys.en);
    assert.deepEqual(languageKeys.ru, languageKeys.en);

    restoreGlobalProperty('localStorage', originalLocalStorage);
    restoreGlobalProperty('navigator', originalNavigator);
});

test('falls back to English when current language misses a key', async () => {
    const savedStorage = new FakeStorage({ 'narde-language': 'ru' });
    const originalLocalStorage = defineGlobalProperty('localStorage', savedStorage);
    const originalNavigator = defineGlobalProperty('navigator', {
        language: 'ru-RU',
        languages: ['ru-RU']
    });

    const modulePath = new URL('../engine/i18n.js?cache=' + Date.now(), import.meta.url);
    const i18n = await import(modulePath.href);

    const originalRu = i18n.__translations.ru['ui.startTitle'];
    delete i18n.__translations.ru['ui.startTitle'];

    assert.equal(i18n.t('ui.startTitle'), 'Welcome to Long Narde');

    i18n.__translations.ru['ui.startTitle'] = originalRu;

    restoreGlobalProperty('localStorage', originalLocalStorage);
    restoreGlobalProperty('navigator', originalNavigator);
});

test('important Russian UI strings are localized with Cyrillic text', async () => {
    const savedStorage = new FakeStorage({ 'narde-language': 'ru' });
    const originalLocalStorage = defineGlobalProperty('localStorage', savedStorage);
    const originalNavigator = defineGlobalProperty('navigator', {
        language: 'ru-RU',
        languages: ['ru-RU']
    });

    const modulePath = new URL('../engine/i18n.js?cache=' + Date.now(), import.meta.url);
    const i18n = await import(modulePath.href);

    assert.equal(i18n.t('ui.startTitle'), 'Добро пожаловать в длинные нарды');
    assert.equal(i18n.t('ui.rotateNotice'), 'Для лучшего опыта поверните телефон горизонтально');
    assert.equal(i18n.t('status.timeoutWarning'), 'Если вы снова превысите время, вы проиграете матч.');
    assert.equal(i18n.t('game.timeExpiredGameOverMessage'), 'Ваше время истекло — вы проиграли игру.');
    assert.equal(i18n.t('ui.matchSummary'), '📊 Итоги матча');
    assert.equal(i18n.t('ui.startNewGame'), 'Начать новую игру');
    assert.equal(i18n.t('ui.secondsShort'), 'с');
    assert.equal(i18n.t('difficulty.easy'), 'Лёгкий');
    assert.equal(i18n.t('difficulty.medium'), 'Средний');
    assert.equal(i18n.t('difficulty.hard'), 'Сложный');
    assert.equal(i18n.t('difficulty.champion'), 'Чемпион');

    restoreGlobalProperty('localStorage', originalLocalStorage);
    restoreGlobalProperty('navigator', originalNavigator);
});

test('uses correct short timer unit for each language', async () => {
    const savedStorage = new FakeStorage({ 'narde-language': 'en' });
    const originalLocalStorage = defineGlobalProperty('localStorage', savedStorage);
    const originalNavigator = defineGlobalProperty('navigator', {
        language: 'en-US',
        languages: ['en-US']
    });

    const modulePath = new URL('../engine/i18n.js?cache=' + Date.now(), import.meta.url);
    const i18n = await import(modulePath.href);

    i18n.setLanguage('tr');
    assert.equal(i18n.t('ui.secondsShort'), 'sn');

    i18n.setLanguage('en');
    assert.equal(i18n.t('ui.secondsShort'), 's');

    i18n.setLanguage('ru');
    assert.equal(i18n.t('ui.secondsShort'), 'с');

    restoreGlobalProperty('localStorage', originalLocalStorage);
    restoreGlobalProperty('navigator', originalNavigator);
});

test('formats timer text with locale-specific short units', async () => {
    const savedStorage = new FakeStorage({ 'narde-language': 'en' });
    const originalLocalStorage = defineGlobalProperty('localStorage', savedStorage);
    const originalNavigator = defineGlobalProperty('navigator', {
        language: 'en-US',
        languages: ['en-US']
    });

    const modulePath = new URL('../engine/i18n.js?cache=' + Date.now(), import.meta.url);
    const i18n = await import(modulePath.href);

    i18n.setLanguage('tr');
    assert.equal(`37 ${i18n.t('ui.secondsShort')}`, '37 sn');

    i18n.setLanguage('en');
    assert.equal(`37 ${i18n.t('ui.secondsShort')}`, '37 s');

    i18n.setLanguage('ru');
    assert.equal(`37 ${i18n.t('ui.secondsShort')}`, '37 с');

    restoreGlobalProperty('localStorage', originalLocalStorage);
    restoreGlobalProperty('navigator', originalNavigator);
});

test('uses natural Russian bot difficulty labels', async () => {
    const savedStorage = new FakeStorage({ 'narde-language': 'ru' });
    const originalLocalStorage = defineGlobalProperty('localStorage', savedStorage);
    const originalNavigator = defineGlobalProperty('navigator', {
        language: 'ru-RU',
        languages: ['ru-RU']
    });

    const modulePath = new URL('../engine/i18n.js?cache=' + Date.now(), import.meta.url);
    const i18n = await import(modulePath.href);

    assert.equal(i18n.t('difficulty.easy'), 'Лёгкий');
    assert.equal(i18n.t('difficulty.medium'), 'Средний');
    assert.equal(i18n.t('difficulty.hard'), 'Сложный');
    assert.equal(i18n.t('difficulty.champion'), 'Чемпион');

    restoreGlobalProperty('localStorage', originalLocalStorage);
    restoreGlobalProperty('navigator', originalNavigator);
});

test('champion difficulty label is localized in Turkish, English, and Russian', async () => {
    const savedStorage = new FakeStorage({ 'narde-language': 'en' });
    const originalLocalStorage = defineGlobalProperty('localStorage', savedStorage);
    const originalNavigator = defineGlobalProperty('navigator', {
        language: 'en-US',
        languages: ['en-US']
    });

    const modulePath = new URL('../engine/i18n.js?cache=' + Date.now(), import.meta.url);
    const i18n = await import(modulePath.href);

    i18n.setLanguage('tr');
    assert.equal(i18n.t('difficulty.champion'), 'Şampiyon');

    i18n.setLanguage('en');
    assert.equal(i18n.t('difficulty.champion'), 'Champion');

    i18n.setLanguage('ru');
    assert.equal(i18n.t('difficulty.champion'), 'Чемпион');

    restoreGlobalProperty('localStorage', originalLocalStorage);
    restoreGlobalProperty('navigator', originalNavigator);
});

test('auto bear-off label is localized in Turkish, English, and Russian', async () => {
    const savedStorage = new FakeStorage({ 'narde-language': 'en' });
    const originalLocalStorage = defineGlobalProperty('localStorage', savedStorage);
    const originalNavigator = defineGlobalProperty('navigator', {
        language: 'en-US',
        languages: ['en-US']
    });

    const modulePath = new URL('../engine/i18n.js?cache=' + Date.now(), import.meta.url);
    const i18n = await import(modulePath.href);

    i18n.setLanguage('tr');
    assert.equal(i18n.t('ui.autoBearOff'), 'Otomatik Topla');

    i18n.setLanguage('en');
    assert.equal(i18n.t('ui.autoBearOff'), 'Auto Bear Off');

    i18n.setLanguage('ru');
    assert.equal(i18n.t('ui.autoBearOff'), 'Автоснятие');

    restoreGlobalProperty('localStorage', originalLocalStorage);
    restoreGlobalProperty('navigator', originalNavigator);
});

test('how-to-play guide keys are localized in all supported languages', async () => {
    const savedStorage = new FakeStorage({ 'narde-language': 'en' });
    const originalLocalStorage = defineGlobalProperty('localStorage', savedStorage);
    const originalNavigator = defineGlobalProperty('navigator', {
        language: 'en-US',
        languages: ['en-US']
    });

    const modulePath = new URL('../engine/i18n.js?cache=' + Date.now(), import.meta.url);
    const i18n = await import(modulePath.href);

    i18n.setLanguage('tr');
    assert.equal(i18n.t('guide.title'), 'Nasıl Oynanır?');
    assert.equal(i18n.t('guide.next'), 'İleri');

    i18n.setLanguage('en');
    assert.equal(i18n.t('guide.title'), 'How to Play?');
    assert.equal(i18n.t('guide.next'), 'Next');

    i18n.setLanguage('ru');
    assert.equal(i18n.t('guide.title'), 'Как играть?');
    assert.equal(i18n.t('guide.next'), 'Далее');

    restoreGlobalProperty('localStorage', originalLocalStorage);
    restoreGlobalProperty('navigator', originalNavigator);
});

test('player stats keys are localized in all supported languages', async () => {
    const savedStorage = new FakeStorage({ 'narde-language': 'en' });
    const originalLocalStorage = defineGlobalProperty('localStorage', savedStorage);
    const originalNavigator = defineGlobalProperty('navigator', {
        language: 'en-US',
        languages: ['en-US']
    });

    const modulePath = new URL('../engine/i18n.js?cache=' + Date.now(), import.meta.url);
    const i18n = await import(modulePath.href);

    i18n.setLanguage('tr');
    assert.equal(i18n.t('stats.title'), 'İstatistikler');
    assert.equal(i18n.t('stats.bestWinMoves'), 'En Az Hamlede Galibiyet');
    assert.equal(i18n.t('stats.noBestWin'), 'Henüz galibiyet yok');
    assert.equal(i18n.t('stats.reset'), 'İstatistikleri Sıfırla');

    i18n.setLanguage('en');
    assert.equal(i18n.t('stats.title'), 'Statistics');
    assert.equal(i18n.t('stats.bestWinMoves'), 'Fewest Moves in a Win');
    assert.equal(i18n.t('stats.noBestWin'), 'No wins yet');
    assert.equal(i18n.t('stats.reset'), 'Reset Statistics');

    i18n.setLanguage('ru');
    assert.equal(i18n.t('stats.title'), 'Статистика');
    assert.equal(i18n.t('stats.bestWinMoves'), 'Минимум ходов до победы');
    assert.equal(i18n.t('stats.noBestWin'), 'Побед пока нет');
    assert.equal(i18n.t('stats.timeoutLosses'), 'Поражения по тайм-ауту');
    assert.equal(i18n.t('stats.reset'), 'Сбросить статистику');

    restoreGlobalProperty('localStorage', originalLocalStorage);
    restoreGlobalProperty('navigator', originalNavigator);
});

test('language option names stay fixed across all UI languages', async () => {
    const savedStorage = new FakeStorage({ 'narde-language': 'en' });
    const originalLocalStorage = defineGlobalProperty('localStorage', savedStorage);
    const originalNavigator = defineGlobalProperty('navigator', {
        language: 'en-US',
        languages: ['en-US']
    });

    const modulePath = new URL('../engine/i18n.js?cache=' + Date.now(), import.meta.url);
    const i18n = await import(modulePath.href);

    for (const language of ['tr', 'en', 'ru']) {
        i18n.setLanguage(language);
        assert.equal(i18n.t('language.tr'), 'Türkçe');
        assert.equal(i18n.t('language.en'), 'English');
        assert.equal(i18n.t('language.ru'), 'Русский');
    }

    restoreGlobalProperty('localStorage', originalLocalStorage);
    restoreGlobalProperty('navigator', originalNavigator);
});
