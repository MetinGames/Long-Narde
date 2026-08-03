// engine/themes.js

const CHECKER_TOKENS = Object.freeze({
    white: Object.freeze({
        gradient: Object.freeze(['#f8efd9', '#dfcfaa', '#a98d60']),
        collectedGradient: Object.freeze(['#f9eed2', '#b79a65']),
        stroke: '#b99b61',
        insetStroke: 'rgba(0, 0, 0, 0.12)'
    }),
    black: Object.freeze({
        gradient: Object.freeze(['#554940', '#27201c', '#0d0a08']),
        collectedGradient: Object.freeze(['#4f433a', '#16100d']),
        stroke: '#62554b',
        insetStroke: 'rgba(255, 255, 255, 0.12)'
    }),
    shadow: 'rgba(0, 0, 0, 0.5)'
});

const INTERACTION_TOKENS = Object.freeze({
    selected: '#f39c12',
    focus: '#ffd75e',
    focusGlow: '#f6c744',
    focusFill: 'rgba(246, 199, 68, 0.24)',
    focusText: '#fff3b0'
});

const WALNUT_INTERFACE_TOKENS = Object.freeze({
    panel: '#1a0e08',
    panelElevated: '#2b190f',
    border: '#9a7243',
    text: '#fff8ec',
    mutedText: '#d9c7aa'
});

const ANATOLIAN_INTERFACE_TOKENS = Object.freeze({
    panel: '#2d190f',
    panelElevated: '#4a2c1a',
    border: '#c18a4e',
    text: '#fff8ec',
    mutedText: '#ead4b4'
});

export const THEMES = Object.freeze({
    walnut: Object.freeze({
        id: 'walnut',
        artwork: null,
        frame: ['#2b170b', '#1a0e06', '#382010'],
        board: ['#2e1c10', '#1b1008'],
        bar: ['#190e07', '#2d1b0f', '#120a05'],
        gold: '#d4af37',
        lightPoint: ['#594028', '#3b2818'],
        darkPoint: ['#1d120a', '#2c1b0f'],
        pointHeight: 220,
        playfield: Object.freeze({
            top: 20,
            bottom: 580
        }),
        pointStroke: 'rgba(212, 175, 55, 0.4)',
        numberColor: '#f1cf65',
        tray: ['#261308', '#120905'],
        trayInset: '#160b06',
        checkers: CHECKER_TOKENS,
        interaction: INTERACTION_TOKENS,
        interface: WALNUT_INTERFACE_TOKENS
    }),
    anatolian: Object.freeze({
        id: 'anatolian',
        artwork: 'boards/anadolu-ustasi-board-v1.webp',
        frame: ['#6b3f22', '#9a6a3b', '#4b2b17'],
        board: ['#c4935d', '#a96f3d'],
        bar: ['#5a321c', '#8b5a31', '#3d2113'],
        gold: '#b88935',
        lightPoint: [
            'rgba(116, 68, 32, 0.52)',
            'rgba(77, 41, 18, 0.62)'
        ],
        darkPoint: [
            'rgba(68, 37, 18, 0.34)',
            'rgba(91, 49, 23, 0.28)'
        ],
        pointHeight: 178,
        playfield: Object.freeze({
            top: 42,
            bottom: 566,
            leftField: Object.freeze({
                x: 43,
                width: 331
            }),
            rightField: Object.freeze({
                x: 423,
                width: 331
            }),
            tray: Object.freeze({
                x: 758,
                width: 40,
                top: 42,
                bottom: 566
            })
        }),
        pointStroke: 'rgba(116, 76, 31, 0.48)',
        numberColor: '#f7dc8a',
        tray: ['#5a241f', '#2d100f'],
        trayInset: '#3c1515',
        checkers: CHECKER_TOKENS,
        interaction: INTERACTION_TOKENS,
        interface: ANATOLIAN_INTERFACE_TOKENS
    })
});

export function getTheme(themeId = 'walnut') {
    return THEMES[themeId] || THEMES.walnut;
}

export function isThemeId(themeId) {
    return typeof themeId === 'string' &&
        Object.hasOwn(THEMES, themeId);
}

export function getThemeIds() {
    return Object.keys(THEMES);
}
