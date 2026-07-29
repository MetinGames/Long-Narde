// engine/i18n.js

const translations = {
    tr: {
        'page.title': 'Klasik Narde Oyunu',
        'ui.rotateNotice': 'Daha iyi deneyim için telefonunuzu yatay çevirin',
        'ui.turn': 'Sıra:',
        'ui.bot': 'Bot:',
        'ui.time': 'Kalan Süre',
        'ui.secondsShort': 'sn',
        'ui.undo': 'Geri Al',
        'ui.confirm': 'Hamleyi Bitir',
        'ui.matchSummary': '📊 Maç Özeti',
        'ui.totalMoves': 'Toplam Hamle:',
        'ui.playAgain': 'Yeniden Oyna',
        'ui.startNewGame': 'Yeni Oyun Başlat',
        'ui.language': 'Dil:',
        'ui.theme': 'Tema:',
        'ui.soundOn': 'Ses: Açık',
        'ui.soundOff': 'Ses: Kapalı',
        'ui.soundToggleAriaOn': 'Sesi kapat',
        'ui.soundToggleAriaOff': 'Sesi aç',
        'theme.anatolian': 'Anadolu',
        'theme.walnut': 'Koyu Ceviz',
        'status.themeChanged': 'Tema değiştirildi: {theme}',
        'player.white': 'Beyaz',
        'player.black': 'Siyah',
        'difficulty.easy': 'Kolay',
        'difficulty.medium': 'Orta',
        'difficulty.hard': 'Usta',
        'collect': 'TOPLA',
        'ui.startTitle': 'Uzun Narde\'ye Hoş Geldiniz',
        'ui.startDescription': 'Tahta hazır. Oyuna başlamak için Oyuna Başla\'ya dokunun.',
        'ui.startButton': 'Oyuna Başla',
        'language.tr': 'Türkçe',
        'language.en': 'İngilizce',
        'language.ru': 'Rusça',
        'status.starting': 'Yeni oyun başlıyor...',
        'status.readyToStart': 'Oyuna başlamak için Oyuna Başla düğmesine basın.',
        'status.yourTurn': 'Sıra sizde.',
        'status.botTurn': 'Bilgisayarın sırası.',
        'status.rollingYou': 'Zarlarınız atılıyor...',
        'status.rollingBot': 'Bilgisayar zar atıyor...',
        'status.rolledYou': 'Zarlar: {dice}. Hamlenizi yapın.',
        'status.rolledBot': 'Bilgisayarın zarları: {dice}.',
        'status.noMoves': 'Geçerli hamle yok. Hamleyi bitirin.',
        'status.timeExpired': 'Süreniz doldu. Sıra bilgisayara geçti.',
        'status.difficulty': 'Bot seviyesi: {level}',
        'status.undo': 'Son hamle geri alındı.',
        'status.useDice': 'Önce kullanılabilecek zarları oynamalısınız.',
        'status.headBlocked': 'Bu tur başlangıçtan başka pul çıkaramazsınız.',
        'status.pieceBlocked': 'Bu pul mevcut zarlarla oynanamıyor.',
        'status.timeoutWarning': 'Bir kez daha süre aşımı yaşarsanız oyunu kaybedeceksiniz.',
        'status.dieAllUsed': 'Bu zarın tüm hamleleri kullanıldı',
        'status.movesLeft': 'Kalan hamle: {count}',
        'game.timeExpiredGameOverMessage': 'Süreniz doldu — Oyunu kaybettiniz.',
        'status.selectTarget': 'Işıklı hedeflerden birini seçin.',
        'status.selectCollect': 'Pulu toplamak için sağdaki parlayan TOPLA alanına tıklayın.',
        'status.deselected': 'Pul seçimi kaldırıldı.',
        'status.applyFailed': 'Hamle uygulanamadı. Lütfen yeniden seçin.',
        'status.moveComplete': 'Hamleniz tamamlandı.',
        'status.targetRequired': 'Işıklı hedeflerden birini seçmelisiniz.',
        'status.languageChanged': 'Oyun dili Türkçe olarak ayarlandı.',
        'game.winTitle': 'Tebrikler! 🎉',
        'game.loseTitle': 'Bu Kez Bilgisayar Kazandı',
        'game.winMessage': 'Kazandınız! Harika bir oyun çıkardınız.',
        'game.loseMessage': 'Yeni oyunda rövanşı alabilirsiniz.'
    },
    en: {
        'page.title': 'Classic Long Narde',
        'ui.rotateNotice': 'Rotate your phone to landscape for a better experience',
        'ui.turn': 'Turn:',
        'ui.bot': 'Bot:',
        'ui.time': 'Time Left',
        'ui.secondsShort': 's',
        'ui.undo': 'Undo',
        'ui.confirm': 'End Turn',
        'ui.matchSummary': '📊 Match Summary',
        'ui.totalMoves': 'Total Moves:',
        'ui.playAgain': 'Play Again',
        'ui.startNewGame': 'Start New Game',
        'ui.language': 'Language:',
        'ui.theme': 'Theme:',
        'ui.soundOn': 'Sound: On',
        'ui.soundOff': 'Sound: Off',
        'ui.soundToggleAriaOn': 'Mute sounds',
        'ui.soundToggleAriaOff': 'Unmute sounds',
        'theme.anatolian': 'Anadolu',
        'theme.walnut': 'Dark Walnut',
        'status.themeChanged': 'Theme changed: {theme}',
        'player.white': 'White',
        'player.black': 'Black',
        'difficulty.easy': 'Easy',
        'difficulty.medium': 'Medium',
        'difficulty.hard': 'Master',
        'collect': 'BEAR OFF',
        'ui.startTitle': 'Welcome to Long Narde',
        'ui.startDescription': 'The board is ready. Tap Start Game when you are ready.',
        'ui.startButton': 'Start Game',
        'language.tr': 'Turkish',
        'language.en': 'English',
        'language.ru': 'Russian',
        'status.starting': 'A new game is starting...',
        'status.readyToStart': 'Tap Start Game when you are ready to begin.',
        'status.yourTurn': 'Your turn.',
        'status.botTurn': "Computer's turn.",
        'status.rollingYou': 'Rolling your dice...',
        'status.rollingBot': 'The computer is rolling...',
        'status.rolledYou': 'Dice: {dice}. Make your move.',
        'status.rolledBot': "Computer's dice: {dice}.",
        'status.noMoves': 'No legal move. End your turn.',
        'status.timeExpired': 'Time is up. The turn passed to the computer.',
        'status.difficulty': 'Bot level: {level}',
        'status.undo': 'The last move was undone.',
        'status.useDice': 'You must use the playable dice first.',
        'status.headBlocked': 'You cannot move another checker from the head this turn.',
        'status.pieceBlocked': 'This checker cannot move with the current dice.',
        'status.timeoutWarning': 'If you timeout again, you will lose the game.',
        'status.dieAllUsed': 'All moves for this die have been used',
        'status.movesLeft': 'Moves left: {count}',
        'game.timeExpiredGameOverMessage': 'Your time expired — you lost the game.',
        'status.selectTarget': 'Choose one of the highlighted targets.',
        'status.selectCollect': 'Click the glowing BEAR OFF tray on the right.',
        'status.deselected': 'Checker selection cleared.',
        'status.applyFailed': 'The move could not be applied. Select again.',
        'status.moveComplete': 'Your move is complete.',
        'status.targetRequired': 'Choose one of the highlighted targets.',
        'status.languageChanged': 'Game language set to English.',
        'game.winTitle': 'Congratulations! 🎉',
        'game.loseTitle': 'The Computer Won This Time',
        'game.winMessage': 'You won! That was a great game.',
        'game.loseMessage': 'You can take your revenge in a new game.'
    },
    ru: {
        'page.title': 'Классические длинные нарды',
        'ui.rotateNotice': 'Для лучшего опыта поверните телефон горизонтально',
        'ui.turn': 'Ход:',
        'ui.bot': 'Бот:',
        'ui.time': 'Осталось:',
        'ui.secondsShort': 'с',
        'ui.undo': 'Отменить',
        'ui.confirm': 'Завершить ход',
        'ui.matchSummary': '📊 Итоги матча',
        'ui.totalMoves': 'Всего ходов:',
        'ui.playAgain': 'Играть снова',
        'ui.startNewGame': 'Начать новую игру',
        'ui.language': 'Язык:',
        'ui.theme': 'Тема:',
        'ui.soundOn': 'Звук: вкл',
        'ui.soundOff': 'Звук: выкл',
        'ui.soundToggleAriaOn': 'Выключить звук',
        'ui.soundToggleAriaOff': 'Включить звук',
        'theme.anatolian': 'Anadolu',
        'theme.walnut': 'Тёмный орех',
        'status.themeChanged': 'Тема изменена: {theme}',
        'player.white': 'Белые',
        'player.black': 'Чёрные',
        'difficulty.easy': 'Лёгкий',
        'difficulty.medium': 'Средний',
        'difficulty.hard': 'Сложный',
        'collect': 'СНЯТЬ',
        'ui.startTitle': 'Добро пожаловать в длинные нарды',
        'ui.startDescription': 'Доска готова. Нажмите Начать игру, когда будете готовы.',
        'ui.startButton': 'Начать игру',
        'language.tr': 'Турецкий',
        'language.en': 'Английский',
        'language.ru': 'Русский',
        'status.starting': 'Начинается новая игра...',
        'status.readyToStart': 'Нажмите Начать игру, когда будете готовы.',
        'status.yourTurn': 'Ваш ход.',
        'status.botTurn': 'Ход компьютера.',
        'status.rollingYou': 'Ваши кости бросаются...',
        'status.rollingBot': 'Компьютер бросает кости...',
        'status.rolledYou': 'Кости: {dice}. Сделайте ход.',
        'status.rolledBot': 'Кости компьютера: {dice}.',
        'status.noMoves': 'Нет допустимых ходов. Завершите ход.',
        'status.timeExpired': 'Время вышло. Ход перешёл компьютеру.',
        'status.difficulty': 'Уровень бота: {level}',
        'status.undo': 'Последний ход отменён.',
        'status.useDice': 'Сначала используйте доступные кости.',
        'status.headBlocked': 'В этом ходу нельзя снять ещё одну шашку с головы.',
        'status.pieceBlocked': 'Эта шашка не может ходить с текущими костями.',
        'status.timeoutWarning': 'Если вы снова превысите время, вы проиграете матч.',
        'status.dieAllUsed': 'Все ходы для этой кости уже использованы',
        'status.movesLeft': 'Осталось ходов: {count}',
        'game.timeExpiredGameOverMessage': 'Ваше время истекло — вы проиграли игру.',
        'status.selectTarget': 'Выберите подсвеченную позицию.',
        'status.selectCollect': 'Нажмите на светящуюся зону СНЯТЬ справа.',
        'status.deselected': 'Выбор шашки отменён.',
        'status.applyFailed': 'Не удалось выполнить ход. Выберите снова.',
        'status.moveComplete': 'Ваш ход завершён.',
        'status.targetRequired': 'Выберите подсвеченную позицию.',
        'status.languageChanged': 'Язык игры изменён на русский.',
        'game.winTitle': 'Поздравляем! 🎉',
        'game.loseTitle': 'На этот раз победил компьютер',
        'game.winMessage': 'Вы победили! Отличная игра.',
        'game.loseMessage': 'Вы сможете взять реванш в новой игре.'
    }
};

const supportedLanguages = ['tr', 'en', 'ru'];
let currentLanguage = 'en';

// Test helper: allows key parity and fallback behavior checks.
export const __translations = translations;

function isSupportedLanguage(language) {
    return supportedLanguages.includes(language);
}

function getStoredLanguage() {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('narde-language');
}

function detectBrowserLanguage() {
    if (typeof navigator === 'undefined') return 'en';

    const languageSource =
        navigator.language ||
        navigator.userLanguage ||
        (Array.isArray(navigator.languages) && navigator.languages[0]) ||
        'en';

    const normalized = String(languageSource)
        .slice(0, 2)
        .toLowerCase();

    return isSupportedLanguage(normalized) ? normalized : 'en';
}

export function initializeLanguage() {
    const savedLanguage = getStoredLanguage();

    if (savedLanguage !== null) {
        if (isSupportedLanguage(savedLanguage)) {
            currentLanguage = savedLanguage;
        } else {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('narde-language');
            }
            currentLanguage = 'en';
        }
    } else {
        currentLanguage = detectBrowserLanguage();
    }

    if (typeof document !== 'undefined') {
        document.documentElement.lang = currentLanguage;
    }

    return currentLanguage;
}

initializeLanguage();

export function getLanguage() {
    return currentLanguage;
}

export function setLanguage(language) {
    currentLanguage = isSupportedLanguage(language) ? language : 'en';

    if (typeof localStorage !== 'undefined') {
        if (isSupportedLanguage(language)) {
            localStorage.setItem('narde-language', currentLanguage);
        } else {
            localStorage.removeItem('narde-language');
        }
    }

    if (typeof document !== 'undefined') {
        document.documentElement.lang = currentLanguage;
    }
}

export function t(key, values = {}) {
    const dictionary =
        translations[currentLanguage] || translations.en;
    let text =
        dictionary[key] ??
        translations.en[key] ??
        key;

    for (const [name, value] of Object.entries(values)) {
        text = text.replaceAll(`{${name}}`, String(value));
    }

    return text;
}

export function applyTranslations(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(element => {
        element.textContent = t(element.dataset.i18n);
    });

    root.querySelectorAll('[data-i18n-title]').forEach(element => {
        element.setAttribute('title', t(element.dataset.i18nTitle));
    });

    root.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
        element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
    });

    document.title = t('page.title');
}
