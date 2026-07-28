// engine/themes.js

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
        trayInset: '#160b06'
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
                x: 20,
                width: 337.5
            }),
            rightField: Object.freeze({
                x: 434,
                width: 291
            })
        }),
        pointStroke: 'rgba(116, 76, 31, 0.48)',
        numberColor: '#f7dc8a',
        tray: ['#5a241f', '#2d100f'],
        trayInset: '#3c1515'
    })
});

export function getTheme(themeId = 'walnut') {
    return THEMES[themeId] || THEMES.walnut;
}
