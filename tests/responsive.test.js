import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

const root = path.resolve('./');

test('style.css contains mobile media queries and canvas responsive rules', () => {
    const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
    const themeCss = fs.readFileSync(
        path.join(root, 'theme-manager.css'),
        'utf8'
    );
    const devicePolishCss = fs.readFileSync(
        path.join(root, 'real-device-polish.css'),
        'utf8'
    );
    const ongoingMatchCss = fs.readFileSync(
        path.join(root, 'ongoing-match.css'),
        'utf8'
    );
    const checkerColorCss = fs.readFileSync(
        path.join(root, 'checker-color-picker.css'),
        'utf8'
    );
    const gameHelpersCss = fs.readFileSync(
        path.join(root, 'game-helpers.css'),
        'utf8'
    );
    const helperMascotCss = fs.readFileSync(
        path.join(root, 'helper-mascot.css'),
        'utf8'
    );
    const friendPreviewCss = fs.readFileSync(
        path.join(root, 'friend-match-preview.css'),
        'utf8'
    );
    assert.ok(css.includes('@media (max-width: 900px) and (orientation: landscape)'), 'Missing landscape mobile media query');
    assert.ok(css.includes('@media (max-width: 600px) and (orientation: portrait)'), 'Missing portrait mobile media query');
    assert.ok(css.includes('@media (max-height: 600px) and (orientation: landscape)'), 'Missing low landscape mobile media query');
    assert.ok(css.includes('body.is-start-screen-open #rotate-notice'), 'Start screen must not be covered by the portrait rotate notice');
    assert.ok(css.includes('#game-canvas') || css.includes('canvas'), 'Canvas responsive rules missing');
    assert.ok(css.includes('#info-panel > #turn-indicator.is-white-turn'), 'Compact turn strip white-state style missing');
    assert.ok(css.includes('#info-panel > #turn-indicator.is-dark-turn'), 'Compact turn strip dark-state style missing');
    assert.ok(css.includes('#turn-indicator .turn-dot'), 'Turn strip dot style missing');
    assert.ok(css.includes('#how-to-play-modal'), 'How-to-play modal style missing');
    assert.ok(css.includes('#how-to-play-pages'), 'How-to-play pages container style missing');
    assert.ok(css.includes('#how-to-play-footer'), 'How-to-play footer style missing');
    assert.ok(css.includes('#player-stats-modal'), 'Player stats modal style missing');
    assert.ok(css.includes('#player-stats-cards'), 'Player stats cards style missing');
    assert.ok(css.includes('#player-stats-footer'), 'Player stats footer style missing');
    assert.ok(css.includes('#player-profile-content'), 'Profile content style missing');
    assert.ok(css.includes('#profile-avatar-grid'), 'Avatar grid style missing');
    assert.ok(css.includes('#achievement-grid'), 'Achievement grid style missing');
    assert.ok(css.includes('.profile-avatar-option:focus-visible'), 'Avatar keyboard focus style missing');
    assert.ok(css.includes('#start-language-container'), 'Start language container style missing');
    assert.ok(css.includes('#start-language-select'), 'Start language select style missing');
    assert.ok(css.includes('#language-select option'), 'Side language option contrast style missing');
    assert.ok(css.includes('#start-language-select option'), 'Start language option contrast style missing');
    assert.ok(css.includes('background-color: #fff8ec'), 'Light option background color missing');
    assert.ok(css.includes('color: #2b1a0e'), 'Dark option text color missing');
    assert.ok(css.includes('#feedback-button-row'), 'Feedback button row style missing');
    assert.ok(helperMascotCss.includes('#helper-mascot-toggle'), 'Helper mascot toggle style missing');
    assert.ok(helperMascotCss.includes('.helper-mascot-actions'), 'Helper mascot actions style missing');
    assert.ok(helperMascotCss.includes('prefers-reduced-motion: reduce'), 'Helper mascot reduced-motion guard missing');
    assert.ok(css.includes('#feedback-modal-card'), 'Feedback modal style missing');
    assert.ok(css.includes('#feedback-modal-links a'), 'Feedback modal link style missing');
    assert.ok(friendPreviewCss.includes('#friend-preview-entry'), 'Local friend preview entry style missing');
    assert.ok(friendPreviewCss.includes('#friend-preview-modal'), 'Local friend preview modal style missing');
    assert.ok(friendPreviewCss.includes('#friend-preview-timeline'), 'Local friend preview timeline style missing');
    assert.ok(friendPreviewCss.includes('#friend-preview-button:focus-visible'), 'Local friend preview keyboard focus style missing');
    assert.ok(css.includes('#fullscreen-toggle'), 'Fullscreen toggle style missing');
    assert.ok(gameHelpersCss.includes('#auto-bearoff-container'), 'Auto bear-off container style missing');
    assert.ok(gameHelpersCss.includes('#auto-bearoff-toggle'), 'Auto bear-off toggle style missing');
    assert.ok(gameHelpersCss.includes('#auto-turn-confirm-toggle'), 'Auto-confirm toggle style missing');
    assert.ok(gameHelpersCss.includes('#confirm-button.is-auto-confirm-pending'), 'Auto-confirm grace feedback style missing');
    assert.ok(gameHelpersCss.includes('#auto-bearoff-help[open]'), 'Closed helper card should reveal Auto Confirm through its help disclosure');
    assert.ok(css.includes('body.is-game-fullscreen'), 'Fullscreen body lock style missing');
    assert.ok(css.includes('#game-container.is-focus-mode-root'), 'CSS focus mode root style missing');
    assert.ok(css.includes(':fullscreen') || css.includes('-webkit-full-screen'), 'Native fullscreen selector rules missing');
    assert.ok(css.includes('safe-area-inset-top'), 'Safe-area support missing for fullscreen mode');
    assert.ok(css.includes('scrollbar-gutter: stable both-edges'), 'Scrollbar gutter stabilization missing');
    assert.ok(css.includes('min-height: 100dvh'), 'Dynamic viewport height guard missing');
    assert.ok(css.includes('@media (min-width: 901px) and (max-height: 900px)'), 'Short desktop compaction media query missing');
    assert.ok(css.includes('@media (min-width: 601px) and (min-height: 601px) and (max-height: 760px)'), '720p start-screen compaction media query missing');
    assert.match(css, /@media \(min-width: 601px\) and \(min-height: 601px\) and \(max-height: 760px\)[\s\S]*#feedback-button-row\s*\{[^}]*margin-top:\s*7px;/, '720p start screen should keep the feedback action inside the visible panel');
    assert.ok(css.includes('#info-panel > #turn-indicator.is-white-turn'), 'White turn indicator class style missing');
    assert.ok(css.includes('#info-panel > #turn-indicator.is-dark-turn'), 'Dark turn indicator class style missing');
    assert.ok(css.includes('#auto-bearoff-container'), 'Auto bear-off container layout guard missing');
    assert.ok(devicePolishCss.includes('#auto-bearoff-help'), 'Auto bear-off disclosure style missing');
    assert.match(devicePolishCss, /#auto-bearoff-help\s*\{[^}]*position:\s*static;/, 'Auto bear-off disclosure should anchor its hint to the full control card');
    assert.match(devicePolishCss, /#auto-bearoff-hint\s*\{[^}]*right:\s*0;[^}]*left:\s*0;[^}]*width:\s*auto;/, 'Auto bear-off hint should stay inside the control card');
    assert.ok(devicePolishCss.includes('#auto-bearoff-container:has(#auto-bearoff-help[open])'), 'Open Auto Bear-Off help should reserve its own control-card space');
    assert.ok(devicePolishCss.includes('#panel-controls:has(#auto-bearoff-help[open])'), 'Portrait help should expand to a full control row');
    assert.ok(devicePolishCss.includes('#point-numbers-toggle'), 'Point-number toggle style missing');
    assert.ok(devicePolishCss.includes('"timer dice"'), 'Portrait timer and dice areas should share a stable row');
    assert.ok(devicePolishCss.includes('"bearoff bearoff"'), 'Portrait Quick Bear-Off should own a full control row');
    assert.ok(devicePolishCss.includes('"display display"'), 'Portrait display controls should own a full control row');
    assert.match(devicePolishCss, /#rotate-notice\s*\{[^}]*pointer-events:\s*none;/, 'Portrait rotate notice must not block game controls');
    assert.ok(devicePolishCss.includes('--mobile-panel-width'), 'Compact Safari landscape panel sizing guard missing');
    assert.ok(devicePolishCss.includes('grid-template-areas: "board info"'), 'Compact Safari landscape should keep board and controls adjacent');
    assert.match(devicePolishCss, /@media \(max-height:\s*600px\) and \(orientation:\s*landscape\)[\s\S]*#dice-container\s*\{[^}]*grid-area:\s*dice;[^}]*justify-self:\s*stretch;[^}]*align-self:\s*stretch;[^}]*margin-left:\s*0;/, 'Compact Safari dice card should stay inside its grid column');
    assert.ok(themeCss.includes('#theme-manager-modal'), 'Theme manager modal style missing');
    assert.ok(themeCss.includes('.theme-option-card:focus-visible'), 'Theme card keyboard focus style missing');
    assert.ok(themeCss.includes('env(safe-area-inset-bottom)'), 'Theme manager safe-area guard missing');
    assert.ok(themeCss.includes('@media (max-width: 600px) and (orientation: portrait)'), 'Theme manager portrait layout missing');
    assert.ok(themeCss.includes('@media (max-height: 600px) and (orientation: landscape)'), 'Theme manager low-landscape layout missing');
    assert.ok(themeCss.includes('max-height: calc(100dvh - 20px)'), 'Theme manager dynamic viewport guard missing');
    assert.match(ongoingMatchCss, /#ongoing-match-entry:has\(#continue-match-button\[hidden\]\)\s*\{[^}]*display:\s*none;/, 'Hidden Continue Match entry must not leave visual-baseline spacing');
    assert.match(ongoingMatchCss, /#continue-match-button\s*\{[^}]*min-height:\s*44px;/, 'Continue Match must preserve a 44px touch target');
    assert.match(css, /\.secondary-start-button\s*\{[^}]*min-height:\s*44px;/, 'Start-screen secondary actions must preserve a 44px touch target');
    assert.ok(css.includes('#start-mode-menu-heading'), 'Compact mode heading and resume row style missing');
    assert.ok(checkerColorCss.includes('#checker-color-picker'), 'Checker color picker style missing');
    assert.ok(checkerColorCss.includes('.checker-color-option:has(input:focus-visible)'), 'Checker color keyboard focus style missing');
    assert.ok(checkerColorCss.includes('@media (max-width: 600px) and (orientation: portrait)'), 'Checker color portrait layout missing');
    assert.ok(checkerColorCss.includes('@media (max-height: 600px) and (orientation: landscape)'), 'Checker color compact landscape layout missing');
});

test('index.html contains rotate notice element, start screen, and restart button', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.ok(html.includes('id="rotate-notice"'), 'Rotate notice element missing');
    assert.ok(html.includes('id="start-screen"'), 'Start screen overlay missing');
    assert.ok(html.includes('id="start-button"'), 'Start button missing');
    assert.ok(html.includes('id="bot-match-button"'), 'Bot match button missing');
    assert.ok(html.includes('id="friend-match-button"'), 'Friend match button missing');
    assert.ok(html.includes('id="online-match-button"'), 'Online match button missing');
    assert.ok(html.includes('id="start-mode-grid"'), 'Start mode grid missing');
    assert.ok(html.includes('id="start-mode-menu-heading"'), 'Start mode heading and resume row missing');
    assert.ok(html.includes('id="start-bot-difficulty"'), 'Start difficulty select missing');
    assert.ok(html.includes('id="start-turn-timer"'), 'Start turn-timer select missing');
    assert.equal((html.match(/<option value="(?:0|30|60|90)"(?: selected)?>/g) || []).length, 4, 'Exactly four turn-timer choices should be available');
    assert.ok(/id="start-mode-menu"[^>]*role="group"[^>]*aria-labelledby="start-mode-menu-title"/i.test(html), 'Mode menu accessible group missing');
    assert.ok(/id="friend-match-button"[\s\S]*?disabled[\s\S]*?aria-disabled="true"/i.test(html), 'Friend match honest disabled state missing');
    assert.ok(/id="online-match-button"[\s\S]*?disabled[\s\S]*?aria-disabled="true"/i.test(html), 'Online honest disabled state missing');
    assert.ok(html.includes('id="friend-preview-button"'), 'Local friend preview entry missing');
    assert.ok(html.includes('id="friend-preview-modal"'), 'Local friend preview modal missing');
    assert.ok(/id="friend-preview-modal"[^>]*aria-modal="true"/i.test(html), 'Local friend preview aria-modal missing');
    assert.ok(/id="friend-preview-modal"[^>]*data-i18n-aria-label="friendPreview\.modalLabel"/i.test(html), 'Local friend preview i18n aria-label missing');
    assert.ok(html.includes('data-i18n="friendPreview.disclosure"'), 'Local friend preview disclosure missing');
    assert.ok(html.includes('id="friend-preview-next-button"'), 'Local friend preview next action missing');
    assert.ok(html.includes('id="how-to-play-button"'), 'How-to-play button missing');
    assert.ok(html.includes('id="player-stats-button"'), 'Player stats button missing');
    assert.ok(html.includes('id="start-language-container"'), 'Start screen language row missing');
    assert.ok(html.includes('id="start-language-select"'), 'Start screen language select missing');
    assert.ok(html.includes('id="checker-color-picker"'), 'Start checker color picker missing');
    assert.equal((html.match(/name="checker-color"/g) || []).length, 2, 'Exactly two checker color choices should be available');
    assert.ok(/name="checker-color"[\s\S]*?value="white"[\s\S]*?checked/i.test(html), 'Ivory checker color should remain the default');
    assert.ok(/name="checker-color"[\s\S]*?value="black"/i.test(html), 'Black checker color choice missing');
    assert.ok(/id="start-language-select"[^>]*data-i18n-aria-label="ui.language"/i.test(html), 'Start language select i18n aria label missing');
    assert.ok(/id="start-language-label"[^>]*for="start-language-select"/i.test(html), 'Start language visible label missing');
    assert.ok(html.includes('id="helper-mascot"'), 'Helper mascot missing');
    assert.ok(html.includes('id="helper-mascot-toggle"'), 'Helper mascot toggle missing');
    assert.ok(html.includes('id="helper-mascot-feedback-button"'), 'Helper feedback action missing');
    assert.ok(html.includes('id="helper-mascot-guide-button"'), 'Helper guide action missing');
    assert.ok(/id="helper-mascot-bug-link"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/i.test(html), 'Helper bug action target/rel missing');
    assert.ok(/id="helper-mascot-toggle"[^>]*aria-expanded="false"[^>]*aria-controls="helper-mascot-panel"/i.test(html), 'Helper toggle disclosure state missing');
    assert.ok(html.includes('id="feedback-modal"'), 'Feedback modal missing');
    assert.ok(html.includes('id="feedback-bug-link"'), 'Feedback bug link missing');
    assert.ok(html.includes('id="feedback-feature-link"'), 'Feedback feature link missing');
    assert.ok(/id="feedback-bug-link"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/i.test(html), 'Bug feedback link target/rel missing');
    assert.ok(/id="feedback-feature-link"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/i.test(html), 'Feature feedback link target/rel missing');
    assert.ok(/id="feedback-modal"[^>]*aria-modal="true"/i.test(html), 'Feedback modal aria-modal missing');
    assert.ok(/id="feedback-modal"[^>]*data-i18n-aria-label="ui.feedbackModalLabel"/i.test(html), 'Feedback modal aria-label i18n missing');
    assert.ok(/id="how-to-play-modal"[^>]*aria-modal="true"/i.test(html), 'How-to-play modal aria-modal missing');
    assert.ok(/id="player-stats-modal"[^>]*aria-modal="true"/i.test(html), 'Player stats modal aria-modal missing');
    assert.ok(html.includes('id="guide-prev-button"'), 'Guide previous button missing');
    assert.ok(html.includes('id="guide-next-button"'), 'Guide next button missing');
    assert.ok(html.includes('id="guide-start-button"'), 'Guide start button missing');
    assert.ok(html.includes('id="stats-reset-button"'), 'Stats reset button missing');
    assert.ok(html.includes('id="profile-display-name"'), 'Profile display-name input missing');
    assert.ok(html.includes('id="profile-save-button"'), 'Profile save button missing');
    assert.ok(html.includes('id="profile-reset-button"'), 'Profile reset button missing');
    assert.ok(html.includes('id="player-achievements"'), 'Achievements section missing');
    assert.equal((html.match(/data-avatar-id="avatar-/g) || []).length, 15, 'Exactly 15 built-in avatar choices should be available');
    assert.ok(/id="profile-display-name"[\s\S]*?maxlength="24"/i.test(html), 'Profile name length guard missing');
    assert.ok(html.includes('id="restart-button"'), 'Restart button missing');
    assert.ok(html.includes('id="die-right-1"'), 'Double move indicator 1 missing');
    assert.ok(html.includes('id="die-right-4"'), 'Double move indicator 4 missing');
    assert.ok(html.includes('id="fullscreen-toggle"'), 'Fullscreen toggle button missing');
    assert.ok(html.includes('id="fullscreen-toggle-label"'), 'Fullscreen screen-reader label missing');
    assert.ok(html.includes('id="point-numbers-toggle"'), 'Point-number toggle missing');
    assert.ok(html.includes('id="auto-bearoff-container"'), 'Auto bear-off container missing');
    assert.ok(html.includes('id="auto-bearoff-toggle"'), 'Auto bear-off toggle missing');
    assert.ok(html.includes('id="auto-bearoff-hint"'), 'Auto bear-off accessibility hint missing');
    assert.ok(html.includes('id="auto-bearoff-help"'), 'Auto bear-off help disclosure missing');
    assert.ok(html.includes('id="game-helper-options"'), 'Combined game-helper surface missing');
    assert.ok(html.includes('id="auto-turn-confirm-toggle"'), 'Auto-confirm toggle missing');
    assert.ok(html.includes('id="auto-turn-confirm-description"'), 'Auto-confirm accessible description missing');
    assert.ok(html.includes('id="auto-turn-confirm-status"'), 'Auto-confirm live status missing');
    assert.ok(html.includes('id="theme-manager-button"'), 'In-game theme manager entry missing');
    assert.ok(html.includes('id="start-theme-manager-button"'), 'Start-screen theme manager entry missing');
    assert.ok(/id="start-theme-manager-button"[\s\S]*?data-i18n="theme\.managerMenu"/i.test(html), 'Start-screen theme manager should use the compact localized label');
    assert.ok(html.includes('id="theme-manager-modal"'), 'Theme manager modal missing');
    assert.ok(/id="theme-manager-modal"[^>]*aria-modal="true"/i.test(html), 'Theme manager aria-modal missing');
    assert.equal((html.match(/data-theme-option=/g) || []).length, 2, 'Exactly two supported theme previews should be rendered');
    assert.ok(html.includes('theme-manager.css'), 'Theme manager stylesheet link missing');
    assert.ok(html.includes('checker-color-picker.css'), 'Checker color picker stylesheet link missing');
    assert.ok(html.includes('game-helpers.css'), 'Game-helper stylesheet link missing');
    assert.ok(html.includes('helper-mascot.css'), 'Helper mascot stylesheet link missing');
    assert.ok(html.includes('real-device-polish.css'), 'Real-device polish stylesheet link missing');
    assert.equal((html.match(/value="champion"/g) || []).length, 2, 'Champion difficulty should exist in both synchronized selectors');
    assert.ok(/<option value="champion" data-i18n="difficulty\.champion">Şampiyon<\/option>/i.test(html), 'Champion difficulty option missing expected value/i18n pairing');
    assert.equal((html.match(/<option value="medium" data-i18n="difficulty\.medium" selected>Orta<\/option>/gi) || []).length, 2, 'Medium difficulty should remain the default in both selectors');
    assert.ok(/id="turn-indicator"[^>]*aria-live="polite"/i.test(html), 'Turn indicator aria-live polite missing');
    assert.ok(html.includes('viewport-fit=cover'), 'Viewport fit meta missing');
    assert.ok(html.includes('id="board-wrapper"'), 'Board wrapper missing for toast attachment');
    assert.ok(html.includes('assets/branding/nardora-splash.css'), 'Nardora splash stylesheet link missing');
    assert.ok(html.includes('./engine/startup.js'), 'Nardora splash bootstrap module missing');
});
