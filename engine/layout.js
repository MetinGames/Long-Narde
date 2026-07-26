// engine/layout.js

export const BOARD_LAYOUT = Object.freeze({
    width: 800,
    height: 600,
    border: 20,
    bar: 30,
    tray: 55,
    slotCountPerRow: 12,
    slotHeight: 220
});

export function getInnerWidth(layout = BOARD_LAYOUT) {
    return layout.width - (layout.border * 2) - layout.tray;
}

export function getUsableWidth(layout = BOARD_LAYOUT) {
    return getInnerWidth(layout) - layout.bar;
}

export function getSlotWidth(layout = BOARD_LAYOUT) {
    return getUsableWidth(layout) / layout.slotCountPerRow;
}

export function getMiddleBarX(layout = BOARD_LAYOUT) {
    return layout.border + (getUsableWidth(layout) / 2);
}

export function getSlotX(
    columnIndex,
    slotWidth = getSlotWidth(),
    layout = BOARD_LAYOUT
) {
    let x = layout.border + (columnIndex * slotWidth);
    if (columnIndex >= 6) x += layout.bar;
    return x;
}

export function getSlotFromCoordinates(
    x,
    y,
    layout = BOARD_LAYOUT
) {
    const {
        width,
        height,
        border,
        bar,
        tray
    } = layout;

    if (
        x >= width - border - tray &&
        x <= width - border &&
        y >= border &&
        y <= height - border
    ) {
        return 25;
    }

    if (
        x < border ||
        x > width - border - tray ||
        y < border ||
        y > height - border
    ) {
        return null;
    }

    const slotWidth = getSlotWidth(layout);
    const middleBarX = getMiddleBarX(layout);

    if (x >= middleBarX && x < middleBarX + bar) {
        return null;
    }

    const columnIndex = x < middleBarX
        ? Math.floor((x - border) / slotWidth)
        : Math.floor((x - border - bar) / slotWidth);

    if (
        columnIndex < 0 ||
        columnIndex >= layout.slotCountPerRow
    ) {
        return null;
    }

    return y < height / 2
        ? 12 - columnIndex
        : 13 + columnIndex;
}

export function getBearOffTrayRect(
    player,
    layout = BOARD_LAYOUT
) {
    const height =
        (layout.height - (layout.border * 2)) / 2 - 10;
    const x =
        layout.width - layout.border - layout.tray + 5;

    return {
        x,
        y: player === 2
            ? layout.border
            : layout.border + height + 20,
        width: layout.tray,
        height
    };
}
