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

export function getSlotWidthForColumn(
    columnIndex,
    layout = BOARD_LAYOUT
) {
    if (layout.leftField && layout.rightField) {
        const field = columnIndex < 6
            ? layout.leftField
            : layout.rightField;
        return field.width / 6;
    }

    return getSlotWidth(layout);
}

export function getMiddleBarX(layout = BOARD_LAYOUT) {
    if (layout.leftField) {
        return layout.leftField.x + layout.leftField.width;
    }

    return layout.border + (getUsableWidth(layout) / 2);
}

export function getSlotX(
    columnIndex,
    slotWidth = null,
    layout = BOARD_LAYOUT
) {
    if (layout.leftField && layout.rightField) {
        const field = columnIndex < 6
            ? layout.leftField
            : layout.rightField;
        const fieldColumn = columnIndex % 6;
        return field.x + (
            fieldColumn *
            getSlotWidthForColumn(columnIndex, layout)
        );
    }

    const resolvedSlotWidth =
        slotWidth ?? getSlotWidth(layout);
    let x = layout.border + (columnIndex * resolvedSlotWidth);
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

    const trayArea = layout.trayArea;
    const isInTray = trayArea
        ? (
            x >= trayArea.x &&
            x <= trayArea.x + trayArea.width &&
            y >= (trayArea.top ?? border) &&
            y <= (trayArea.bottom ?? height - border)
        )
        : (
            x >= width - border - tray &&
            x <= width - border &&
            y >= border &&
            y <= height - border
        );

    if (isInTray) {
        return 25;
    }

    if (y < border || y > height - border) {
        return null;
    }

    const slotWidth = getSlotWidth(layout);
    const middleBarX = getMiddleBarX(layout);
    let columnIndex;

    if (layout.leftField && layout.rightField) {
        const fields = [
            { ...layout.leftField, offset: 0 },
            { ...layout.rightField, offset: 6 }
        ];
        const field = fields.find(candidate =>
            x >= candidate.x &&
            x < candidate.x + candidate.width
        );

        if (!field) return null;

        columnIndex =
            field.offset +
            Math.floor(
                (x - field.x) /
                (field.width / 6)
            );
    } else {
        if (x >= middleBarX && x < middleBarX + bar) {
            return null;
        }

        columnIndex = x < middleBarX
            ? Math.floor((x - border) / slotWidth)
            : Math.floor((x - border - bar) / slotWidth);
    }

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
    if (layout.trayArea) {
        const verticalGap = 20;
        const top = layout.trayArea.top ?? layout.border;
        const bottom =
            layout.trayArea.bottom ??
            (layout.height - layout.border);
        const height =
            (bottom - top - verticalGap) /
            2;

        return {
            x: layout.trayArea.x,
            y: player === 2
                ? top
                : top + height + verticalGap,
            width: layout.trayArea.width,
            height
        };
    }

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
