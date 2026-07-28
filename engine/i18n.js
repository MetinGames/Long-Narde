// engine/i18n.js

const translations = {
    tr: {
        'page.title': 'Klasik Narde Oyunu',
        'ui.turn': 'Sıra:',
        'ui.bot': 'Bot:',
        'ui.time': 'Kalan Süre:',
        'ui.matchSummary': '📊 Maç Özeti',
        'ui.totalMoves': 'Toplam Hamle:',
        'ui.playAgain': 'Yeniden Oyna',
        'ui.language': 'Dil:',
        'ui.theme': 'Tema:',
        'theme.anatolian': 'Anadolu Ustası',
        'theme.walnut': 'Koyu Ceviz',
        'status.themeChanged': 'Tema değiştirildi: {theme}',
        'player.white': 'Beyaz',
        'player.black': 'Siyah',
        'difficulty.easy': 'Kolay',
        'difficulty.medium': 'Orta',
        'difficulty.hard': 'Usta',
        'collect': 'TOPLA',
        'status.starting': 'Yeni oyun başlıyor...',
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
        'ui.turn': 'Turn:',
        'ui.bot': 'Bot:',
        'ui.time': 'Time Left:',
        'ui.matchSummary': '📊 Match Summary',
        'ui.totalMoves': 'Total Moves:',
        'ui.playAgain': 'Play Again',
        'ui.language': 'Language:',
        'ui.theme': 'Theme:',
        'theme.anatolian': 'Anatolian Artisan',
        'theme.walnut': 'Dark Walnut',
        'status.themeChanged': 'Theme changed: {theme}',
        'player.white': 'White',
        'player.black': 'Black',
        'difficulty.easy': 'Easy',
        'difficulty.medium': 'Medium',
        'difficulty.hard': 'Master',
        'collect': 'BEAR OFF',
        'status.starting': 'A new game is starting...',
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
        'ui.turn': 'Ход:',
        'ui.bot': 'Бот:',
        'ui.time': 'Осталось:',
        'ui.matchSummary': '📊 Итоги матча',
        'ui.totalMoves': 'Всего ходов:',
        'ui.playAgain': 'Играть снова',
        'ui.language': 'Язык:',
        'ui.theme': 'Тема:',
        'theme.anatolian': 'Анатолийский мастер',
        'theme.walnut': 'Тёмный орех',
        'status.themeChanged': 'Тема изменена: {theme}',
        'player.white': 'Белые',
        'player.black': 'Чёрные',
        'difficulty.easy': 'Легко',
        'difficulty.medium': 'Средне',
        'difficulty.hard': 'Мастер',
        'collect': 'СНЯТЬ',
        'status.starting': 'Начинается новая игра...',
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
let currentLanguage = 'tr';

if (typeof localStorage !== 'undefined') {
    const savedLanguage = localStorage.getItem('narde-language');
    if (supportedLanguages.includes(savedLanguage)) {
        currentLanguage = savedLanguage;
    }
}

export function getLanguage() {
    return currentLanguage;
}

export function setLanguage(language) {
    currentLanguage = supportedLanguages.includes(language)
        ? language
        : 'tr';

    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('narde-language', currentLanguage);
    }

    if (typeof document !== 'undefined') {
        document.documentElement.lang = currentLanguage;
    }
}

export function t(key, values = {}) {
    const dictionary =
        translations[currentLanguage] || translations.tr;
    let text =
        dictionary[key] ??
        translations.tr[key] ??
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

    document.title = t('page.title');
}
