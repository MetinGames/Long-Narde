export const MAX_CANVAS_PIXEL_RATIO = 3;

function toPositiveNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0
        ? number
        : fallback;
}

export function normalizeCanvasPixelRatio(
    value,
    maxPixelRatio = MAX_CANVAS_PIXEL_RATIO
) {
    const safeMaximum = Math.max(
        1,
        toPositiveNumber(maxPixelRatio, MAX_CANVAS_PIXEL_RATIO)
    );
    const ratio = toPositiveNumber(value, 1);

    return Math.max(1, Math.min(ratio, safeMaximum));
}

export function getCanvasGeometry({
    logicalWidth,
    logicalHeight,
    pixelRatio,
    maxPixelRatio = MAX_CANVAS_PIXEL_RATIO
}) {
    const width = toPositiveNumber(logicalWidth, 1);
    const height = toPositiveNumber(logicalHeight, 1);
    const resolvedPixelRatio = normalizeCanvasPixelRatio(
        pixelRatio,
        maxPixelRatio
    );

    return {
        logicalWidth: width,
        logicalHeight: height,
        pixelRatio: resolvedPixelRatio,
        backingWidth: Math.round(width * resolvedPixelRatio),
        backingHeight: Math.round(height * resolvedPixelRatio)
    };
}

export function canvasMatchesGeometry(canvas, geometry) {
    return Boolean(canvas && geometry) &&
        canvas.width === geometry.backingWidth &&
        canvas.height === geometry.backingHeight &&
        Number(canvas.dataset?.logicalWidth) === geometry.logicalWidth &&
        Number(canvas.dataset?.logicalHeight) === geometry.logicalHeight &&
        Number(canvas.dataset?.pixelRatio) === geometry.pixelRatio;
}

export function mapClientPointToLogicalCoordinates(
    point,
    rect,
    { width, height }
) {
    const clientX = Number(point?.clientX);
    const clientY = Number(point?.clientY);
    const rectLeft = Number(rect?.left ?? 0);
    const rectTop = Number(rect?.top ?? 0);
    const rectWidth = Number(rect?.width);
    const rectHeight = Number(rect?.height);
    const logicalWidth = Number(width);
    const logicalHeight = Number(height);

    if (
        !Number.isFinite(clientX) ||
        !Number.isFinite(clientY) ||
        !Number.isFinite(rectLeft) ||
        !Number.isFinite(rectTop) ||
        !Number.isFinite(rectWidth) || rectWidth <= 0 ||
        !Number.isFinite(rectHeight) || rectHeight <= 0 ||
        !Number.isFinite(logicalWidth) || logicalWidth <= 0 ||
        !Number.isFinite(logicalHeight) || logicalHeight <= 0
    ) {
        return null;
    }

    return {
        x: (clientX - rectLeft) *
            (logicalWidth / rectWidth),
        y: (clientY - rectTop) *
            (logicalHeight / rectHeight)
    };
}
