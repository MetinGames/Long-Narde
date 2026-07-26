// engine/themes.js

export const THEMES = Object.freeze({
    walnut: Object.freeze({
        id: 'walnut',
        frame: ['#2b170b', '#1a0e06', '#382010'],
        board: ['#2e1c10', '#1b1008'],
        bar: ['#190e07', '#2d1b0f', '#120a05'],
        gold: '#d4af37',
        lightPoint: ['#594028', '#3b2818'],
        darkPoint: ['#1d120a', '#2c1b0f']
    })
});

export function getTheme(themeId = 'walnut') {
    return THEMES[themeId] || THEMES.walnut;
}
