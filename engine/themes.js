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
        darkPoint: ['#1d120a', '#2c1b0f']
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
            'rgba(57, 29, 14, 0.68)',
            'rgba(91, 49, 23, 0.58)'
        ]
    })
});

export function getTheme(themeId = 'walnut') {
    return THEMES[themeId] || THEMES.walnut;
}
