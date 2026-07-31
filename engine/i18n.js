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
        'ui.feedbackButton': 'Görüş Bildir',
        'ui.feedbackTitle': 'Görüşlerin Bizim İçin Değerli',
        'ui.feedbackIntro': 'Hata bildirebilir veya geliştirme önerisi gönderebilirsiniz.',
        'ui.feedbackBug': 'Hata Bildir',
        'ui.feedbackFeature': 'Geliştirme Önerisi',
        'ui.feedbackSigninNote': 'GitHub hesabıyla giriş yapmanız gerekebilir.',
        'ui.feedbackClose': 'Kapat',
        'ui.feedbackModalLabel': 'Görüş bildirme penceresi',
        'ui.diagnosticsCopyReport': 'Tanılama Raporunu Kopyala',
        'ui.diagnosticsClearRecords': 'Tanılama Kayıtlarını Temizle',
        'ui.theme': 'Tema:',
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
        'ui.statsButton': 'İstatistikler',
        'ui.howToPlayButton': 'Nasıl Oynanır?',
        'stats.title': 'İstatistikler',
        'stats.totalMatches': 'Toplam Maç',
        'stats.wins': 'Galibiyet',
        'stats.losses': 'Mağlubiyet',
        'stats.winRate': 'Kazanma Oranı',
        'stats.totalMoves': 'Toplam Hamle',
            'stats.bestWinMoves': 'En Az Hamlede Galibiyet',
        'stats.normalLosses': 'Normal Mağlubiyet',
        'stats.timeoutLosses': 'Süre Aşımı Mağlubiyeti',
        'stats.empty': 'Henüz tamamlanan maç yok.',
            'stats.noBestWin': 'Henüz galibiyet yok',
        'stats.reset': 'İstatistikleri Sıfırla',
        'stats.resetConfirm': 'Tüm yerel oyuncu istatistiklerini sıfırlamak istediğinize emin misiniz?',
        'stats.close': 'Kapat',
        'guide.title': 'Nasıl Oynanır?',
        'guide.prev': 'Geri',
        'guide.next': 'İleri',
        'guide.close': 'Kapat',
        'guide.pageCounter': '{current} / {total}',
        'guide.section1.title': '1. Amaç ve taşların ilerleme yönü',
        'guide.section1.body': 'Amaç 15 pulu kendi ev bölgenize getirip toplamaktır. Beyaz 1→24, siyah 13→24→1→12 yönünde ilerler.',
        'guide.section2.title': '2. Zarların ayrı ayrı kullanılması',
        'guide.section2.body': 'Her zar ayrı bir hamledir. İki zar da oynanabiliyorsa turda ikisini de kullanmanız zorunludur.',
        'guide.section3.title': '3. Tek zar oynanabiliyorsa büyük zar',
        'guide.section3.body': 'Sadece tek bir zarla hamle mümkünse daha büyük zar değeri zorunludur.',
        'guide.section4.title': '4. Çift zar ve altın hak ışıkları',
        'guide.section4.body': 'Çift zar geldiğinde aynı değeri dört kez oynarsınız. Kalan haklar zarların yanındaki altın ışıklarla gösterilir.',
        'guide.section5.title': '5. Ev bölgesi ve pul toplama',
        'guide.section5.body': 'Toplama için tüm pullarınız ev bölgesinde olmalıdır. Tam zarla veya kurala uygunsa büyük zarla pul toplayabilirsiniz.',
        'guide.important.title': 'Önemli kurallar',
        'guide.important.headRule': 'Bir turda baştan en fazla 1 pul çıkar; ilk turdaki özel 3-3, 4-4, 6-6 için bu sınır 2 olur.',
        'guide.important.primeRule': 'Rakibin tüm pullarını geride bırakacak altılı blok kuramazsınız.',
        'guide.important.blockRule': 'Rakibin bulunduğu haneye inemezsiniz; sadece boş veya kendi hanenize oynarsınız.',
        'language.tr': 'Türkçe',
        'language.en': 'English',
        'language.ru': 'Русский',
        'status.starting': 'Yeni oyun başlıyor...',
        'status.readyToStart': 'Oyuna başlamak için Oyuna Başla düğmesine basın.',
        'status.yourTurn': 'Sıra sizde.',
        'status.botTurn': 'Bilgisayarın sırası.',
        'status.rollingYou': 'Zarlarınız atılıyor...',
        'status.rollingBot': 'Bilgisayar zar atıyor...',
        'status.rolledYou': 'Zarlar: {dice}. Hamlenizi yapın.',
        'status.rolledBot': 'Bilgisayarın zarları: {dice}.',
        'status.waitForBotTurn': 'Rakip oynuyor — lütfen bekleyin.',
        'status.noMoves': 'Geçerli hamle yok. Hamleyi bitirin.',
        'status.timeExpired': 'Süreniz doldu. Sıra bilgisayara geçti.',
        'status.difficulty': 'Bot seviyesi: {level}',
        'status.undo': 'Son hamle geri alındı.',
        'status.useDice': 'Önce kullanılabilecek zarları oynamalısınız.',
        'status.headBlocked': 'Bu tur başlangıçtan başka pul çıkaramazsınız.',
        'status.pieceBlocked': 'Bu pul mevcut zarlarla oynanamıyor.',
        'status.timeoutWarning': 'Bir kez daha süre aşımı yaşarsanız oyunu kaybedeceksiniz.',
        'status.diagnosticsCopied': 'Tanılama raporu panoya kopyalandı.',
        'status.diagnosticsCopyFailed': 'Tanılama raporu kopyalanamadı.',
        'status.diagnosticsCleared': 'Tanılama kayıtları temizlendi.',
        'status.diagnosticsClearFailed': 'Tanılama kayıtları temizlenemedi.',
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
        'ui.feedbackButton': 'Send Feedback',
        'ui.feedbackTitle': 'Your Feedback Matters',
        'ui.feedbackIntro': 'Report a bug or suggest an improvement.',
        'ui.feedbackBug': 'Report a Bug',
        'ui.feedbackFeature': 'Feature Request',
        'ui.feedbackSigninNote': 'You may need to sign in with a GitHub account.',
        'ui.feedbackClose': 'Close',
        'ui.feedbackModalLabel': 'Feedback dialog',
        'ui.diagnosticsCopyReport': 'Copy Diagnostics Report',
        'ui.diagnosticsClearRecords': 'Clear Diagnostics Records',
        'ui.theme': 'Theme:',
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
        'ui.statsButton': 'Statistics',
        'ui.howToPlayButton': 'How to Play?',
        'stats.title': 'Statistics',
        'stats.totalMatches': 'Total Matches',
        'stats.wins': 'Wins',
        'stats.losses': 'Losses',
        'stats.winRate': 'Win Rate',
        'stats.totalMoves': 'Total Moves',
            'stats.bestWinMoves': 'Fewest Moves in a Win',
        'stats.normalLosses': 'Normal Losses',
        'stats.timeoutLosses': 'Timeout Losses',
        'stats.empty': 'No completed matches yet.',
            'stats.noBestWin': 'No wins yet',
        'stats.reset': 'Reset Statistics',
        'stats.resetConfirm': 'Are you sure you want to reset all local player statistics?',
        'stats.close': 'Close',
        'guide.title': 'How to Play?',
        'guide.prev': 'Back',
        'guide.next': 'Next',
        'guide.close': 'Close',
        'guide.pageCounter': '{current} / {total}',
        'guide.section1.title': '1. Goal and movement direction',
        'guide.section1.body': 'The goal is to move all 15 checkers into your home board and bear them off. White moves 1→24, black moves 13→24→1→12.',
        'guide.section2.title': '2. Using dice separately',
        'guide.section2.body': 'Each die is a separate move. If both dice can be played, you must use both in the same turn.',
        'guide.section3.title': '3. If only one die can be played',
        'guide.section3.body': 'When only one die can be used, the higher die value is mandatory.',
        'guide.section4.title': '4. Doubles and golden move lights',
        'guide.section4.body': 'A double grants four moves of that value. Remaining move rights are shown by the golden indicators near the dice.',
        'guide.section5.title': '5. Home board and bearing off',
        'guide.section5.body': 'You can bear off only when all your checkers are in the home board. Exact die is valid; higher die is allowed only when the rule permits.',
        'guide.important.title': 'Important rules',
        'guide.important.headRule': 'At most 1 checker may leave the head per turn; on the first turn with special doubles 3-3, 4-4, or 6-6 this limit becomes 2.',
        'guide.important.primeRule': 'You cannot build a six-point prime if it leaves all opponent checkers behind it.',
        'guide.important.blockRule': 'You cannot land on an opponent point; you may move only to empty points or your own points.',
        'language.tr': 'Türkçe',
        'language.en': 'English',
        'language.ru': 'Русский',
        'status.starting': 'A new game is starting...',
        'status.readyToStart': 'Tap Start Game when you are ready to begin.',
        'status.yourTurn': 'Your turn.',
        'status.botTurn': "Computer's turn.",
        'status.rollingYou': 'Rolling your dice...',
        'status.rollingBot': 'The computer is rolling...',
        'status.rolledYou': 'Dice: {dice}. Make your move.',
        'status.rolledBot': "Computer's dice: {dice}.",
        'status.waitForBotTurn': 'Your opponent is playing - please wait.',
        'status.noMoves': 'No legal move. End your turn.',
        'status.timeExpired': 'Time is up. The turn passed to the computer.',
        'status.difficulty': 'Bot level: {level}',
        'status.undo': 'The last move was undone.',
        'status.useDice': 'You must use the playable dice first.',
        'status.headBlocked': 'You cannot move another checker from the head this turn.',
        'status.pieceBlocked': 'This checker cannot move with the current dice.',
        'status.timeoutWarning': 'If you timeout again, you will lose the game.',
        'status.diagnosticsCopied': 'The diagnostics report was copied to the clipboard.',
        'status.diagnosticsCopyFailed': 'The diagnostics report could not be copied.',
        'status.diagnosticsCleared': 'The diagnostics records were cleared.',
        'status.diagnosticsClearFailed': 'The diagnostics records could not be cleared.',
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
        'ui.feedbackButton': 'Оставить отзыв',
        'ui.feedbackTitle': 'Ваши отзывы важны',
        'ui.feedbackIntro': 'Сообщите об ошибке или предложите улучшение.',
        'ui.feedbackBug': 'Сообщить об ошибке',
        'ui.feedbackFeature': 'Предложение по улучшению',
        'ui.feedbackSigninNote': 'Возможно, потребуется вход через GitHub-аккаунт.',
        'ui.feedbackClose': 'Закрыть',
        'ui.feedbackModalLabel': 'Окно обратной связи',
        'ui.diagnosticsCopyReport': 'Скопировать отчёт диагностики',
        'ui.diagnosticsClearRecords': 'Очистить записи диагностики',
        'ui.theme': 'Тема:',
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
        'ui.statsButton': 'Статистика',
        'ui.howToPlayButton': 'Как играть?',
        'stats.title': 'Статистика',
        'stats.totalMatches': 'Всего матчей',
        'stats.wins': 'Победы',
        'stats.losses': 'Поражения',
        'stats.winRate': 'Процент побед',
        'stats.totalMoves': 'Всего ходов',
            'stats.bestWinMoves': 'Минимум ходов до победы',
        'stats.normalLosses': 'Обычные поражения',
            'stats.timeoutLosses': 'Поражения по тайм-ауту',
        'stats.empty': 'Пока нет завершённых матчей.',
            'stats.noBestWin': 'Побед пока нет',
        'stats.reset': 'Сбросить статистику',
        'stats.resetConfirm': 'Вы уверены, что хотите сбросить всю локальную статистику игрока?',
        'stats.close': 'Закрыть',
        'guide.title': 'Как играть?',
        'guide.prev': 'Назад',
        'guide.next': 'Далее',
        'guide.close': 'Закрыть',
        'guide.pageCounter': '{current} / {total}',
        'guide.section1.title': '1. Цель и направление движения',
        'guide.section1.body': 'Цель — перевести все 15 шашек в свой дом и снять их. Белые идут 1→24, чёрные идут 13→24→1→12.',
        'guide.section2.title': '2. Использование костей по отдельности',
        'guide.section2.body': 'Каждая кость — отдельный ход. Если можно сыграть обе кости, вы обязаны использовать обе в этот ход.',
        'guide.section3.title': '3. Если можно сыграть только одной костью',
        'guide.section3.body': 'Если возможен только один ход, обязательно используется большее значение кости.',
        'guide.section4.title': '4. Дубль и золотые индикаторы ходов',
        'guide.section4.body': 'Дубль дает четыре хода этим числом. Оставшиеся ходы показываются золотыми индикаторами рядом с костями.',
        'guide.section5.title': '5. Дом и снятие шашек',
        'guide.section5.body': 'Снимать шашки можно только когда все ваши шашки в доме. Точное значение кости подходит; большее значение допустимо только по правилу.',
        'guide.important.title': 'Важные правила',
        'guide.important.headRule': 'За ход можно снять с головы не более 1 шашки; в первом ходу при особых дублях 3-3, 4-4 или 6-6 лимит становится 2.',
        'guide.important.primeRule': 'Нельзя строить блок из шести пунктов, если все шашки соперника остаются позади него.',
        'guide.important.blockRule': 'Нельзя вставать на пункт соперника; ходить можно только на пустые или свои пункты.',
        'language.tr': 'Türkçe',
        'language.en': 'English',
        'language.ru': 'Русский',
        'status.starting': 'Начинается новая игра...',
        'status.readyToStart': 'Нажмите Начать игру, когда будете готовы.',
        'status.yourTurn': 'Ваш ход.',
        'status.botTurn': 'Ход компьютера.',
        'status.rollingYou': 'Ваши кости бросаются...',
        'status.rollingBot': 'Компьютер бросает кости...',
        'status.rolledYou': 'Кости: {dice}. Сделайте ход.',
        'status.rolledBot': 'Кости компьютера: {dice}.',
        'status.waitForBotTurn': 'Соперник ходит - пожалуйста, подождите.',
        'status.noMoves': 'Нет допустимых ходов. Завершите ход.',
        'status.timeExpired': 'Время вышло. Ход перешёл компьютеру.',
        'status.difficulty': 'Уровень бота: {level}',
        'status.undo': 'Последний ход отменён.',
        'status.useDice': 'Сначала используйте доступные кости.',
        'status.headBlocked': 'В этом ходу нельзя снять ещё одну шашку с головы.',
        'status.pieceBlocked': 'Эта шашка не может ходить с текущими костями.',
        'status.timeoutWarning': 'Если вы снова превысите время, вы проиграете матч.',
        'status.diagnosticsCopied': 'Отчёт диагностики скопирован в буфер обмена.',
        'status.diagnosticsCopyFailed': 'Не удалось скопировать отчёт диагностики.',
        'status.diagnosticsCleared': 'Записи диагностики очищены.',
        'status.diagnosticsClearFailed': 'Не удалось очистить записи диагностики.',
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
