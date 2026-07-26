// engine/input.js

import {
    BOARD_LAYOUT,
    getSlotFromCoordinates
} from './layout.js';

export function getCanvasCoordinates(canvas, event) {
    const rect = canvas.getBoundingClientRect();

    return {
        x: (event.clientX - rect.left) *
            (canvas.width / rect.width),
        y: (event.clientY - rect.top) *
            (canvas.height / rect.height)
    };
}

export function bindCanvasInput(
    canvas,
    {
        canInteract = () => true,
        onSlotClick,
        layout = BOARD_LAYOUT
    }
) {
    if (!canvas || typeof onSlotClick !== 'function') {
        return () => {};
    }

    const clickHandler = event => {
        if (!canInteract()) return;

        const { x, y } =
            getCanvasCoordinates(canvas, event);
        const slotId =
            getSlotFromCoordinates(x, y, layout);

        if (slotId !== null) onSlotClick(slotId);
    };

    canvas.addEventListener('click', clickHandler);

    return () => {
        canvas.removeEventListener('click', clickHandler);
    };
}
