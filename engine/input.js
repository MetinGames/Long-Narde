// engine/input.js

import {
    BOARD_LAYOUT,
    getSlotFromCoordinates
} from './layout.js';

const TAP_MOVE_TOLERANCE = 12;

export function getCanvasCoordinates(canvas, event) {
    const rect = canvas.getBoundingClientRect();

    return {
        x: (event.clientX - rect.left) *
            (BOARD_LAYOUT.width / rect.width),
        y: (event.clientY - rect.top) *
            (BOARD_LAYOUT.height / rect.height)
    };
}

export function bindCanvasInput(
    canvas,
    {
        canInteract = () => true,
        onBlockedInteraction,
        onSlotClick,
        layout = BOARD_LAYOUT
    }
) {
    if (!canvas || typeof onSlotClick !== 'function') {
        return () => {};
    }

    const dispatchSlot = event => {
        if (!canInteract()) {
            onBlockedInteraction?.(event);
            return;
        }

        const { x, y } =
            getCanvasCoordinates(canvas, event);
        const activeLayout =
            typeof layout === 'function'
                ? layout()
                : layout;
        const slotId =
            getSlotFromCoordinates(x, y, activeLayout);

        if (slotId !== null) onSlotClick(slotId);
    };

    const supportsPointerEvents =
        typeof window !== 'undefined' &&
        'PointerEvent' in window;

    if (!supportsPointerEvents) {
        const clickHandler = event => dispatchSlot(event);
        canvas.addEventListener('click', clickHandler);

        return () => {
            canvas.removeEventListener('click', clickHandler);
        };
    }

    let activePointerId = null;
    let startX = 0;
    let startY = 0;

    const resetPointer = () => {
        activePointerId = null;
    };

    const pointerDownHandler = event => {
        if (
            activePointerId !== null ||
            event.isPrimary === false ||
            (event.pointerType === 'mouse' && event.button !== 0)
        ) {
            return;
        }

        activePointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;

        if (canvas.setPointerCapture) {
            canvas.setPointerCapture(event.pointerId);
        }
    };

    const pointerUpHandler = event => {
        if (event.pointerId !== activePointerId) return;

        const movedDistance = Math.hypot(
            event.clientX - startX,
            event.clientY - startY
        );
        resetPointer();

        if (movedDistance > TAP_MOVE_TOLERANCE) return;

        event.preventDefault();
        dispatchSlot(event);
    };

    const pointerCancelHandler = event => {
        if (event.pointerId === activePointerId) {
            resetPointer();
        }
    };

    canvas.addEventListener('pointerdown', pointerDownHandler);
    canvas.addEventListener('pointerup', pointerUpHandler);
    canvas.addEventListener('pointercancel', pointerCancelHandler);

    return () => {
        canvas.removeEventListener(
            'pointerdown',
            pointerDownHandler
        );
        canvas.removeEventListener(
            'pointerup',
            pointerUpHandler
        );
        canvas.removeEventListener(
            'pointercancel',
            pointerCancelHandler
        );
    };
}
