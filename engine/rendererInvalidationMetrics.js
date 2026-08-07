export const RENDER_INVALIDATION_BUDGET = Object.freeze({
    minimumFullRenders: 30,
    maximumIdleFrameRatio: 0.05,
    maximumStaticRebuildRatio: 0.1
});

const DEFAULT_SCENARIO = 'state';
const DEFAULT_TRACE_LIMIT = 240;

function normalizeScenario(value) {
    const scenario = String(value || DEFAULT_SCENARIO)
        .trim()
        .toLowerCase();
    return scenario || DEFAULT_SCENARIO;
}

function createCounters() {
    return {
        fullRenders: 0,
        staticBoardRebuilds: 0,
        animationFrames: 0,
        idleFrames: 0,
        stateFrames: 0
    };
}

function incrementScenario(scenarios, scenario, field) {
    if (!scenarios[scenario]) {
        scenarios[scenario] = createCounters();
    }
    scenarios[scenario][field]++;
}

function checkerSignature(slot) {
    return `${Number(slot?.player) || 0}:${Number(slot?.count) || 0}`;
}

export function createRendererRenderSignature({
    game,
    selectedSlotId = null,
    themeId = '',
    pointNumbersVisible = false,
    humanCheckerColor = '',
    pixelRatio = 1,
    checkerMoveAnimationState = null,
    victoryMomentState = null,
    botMoveHighlightState = null
}) {
    const slots = Array.from(
        game?.board?.slots || [],
        checkerSignature
    ).join(',');
    const dice = Array.from(game?.dice?.values || []).join(',');
    const moves = Array.from(game?.availableMoves || []).join(',');
    const borneOff = game?.board?.borneOff || {};
    const checkerAnimation = checkerMoveAnimationState
        ? [
            checkerMoveAnimationState.fromSlot,
            checkerMoveAnimationState.targetSlot,
            checkerMoveAnimationState.player,
            Number(checkerMoveAnimationState.progress || 0).toFixed(4)
        ].join(':')
        : '-';
    const victoryAnimation = victoryMomentState
        ? [
            victoryMomentState.winner,
            Number(victoryMomentState.progress || 0).toFixed(4)
        ].join(':')
        : '-';
    const botHighlight = botMoveHighlightState
        ? [
            botMoveHighlightState.fromSlot,
            botMoveHighlightState.targetSlot
        ].join(':')
        : '-';

    return [
        game?.gameStatus || '-',
        game?.currentPlayer || 0,
        selectedSlotId ?? '-',
        themeId,
        pointNumbersVisible ? 1 : 0,
        humanCheckerColor,
        pixelRatio,
        dice,
        moves,
        `${Number(borneOff[1]) || 0}:${Number(borneOff[2]) || 0}`,
        slots,
        checkerAnimation,
        victoryAnimation,
        botHighlight
    ].join('|');
}

export function isRendererMetricsEnabled(windowRef) {
    try {
        return new URLSearchParams(
            windowRef?.location?.search || ''
        ).get('renderMetrics') === '1';
    } catch {
        return false;
    }
}

export function evaluateRenderInvalidationBudget(
    counters,
    budget = RENDER_INVALIDATION_BUDGET
) {
    const fullRenders = Number(counters?.fullRenders) || 0;
    const idleFrames = Number(counters?.idleFrames) || 0;
    const staticBoardRebuilds =
        Number(counters?.staticBoardRebuilds) || 0;
    const idleFrameRatio = fullRenders > 0
        ? idleFrames / fullRenders
        : 0;
    const staticRebuildRatio = fullRenders > 0
        ? staticBoardRebuilds / fullRenders
        : 0;
    const hasRepresentativeSample =
        fullRenders >= budget.minimumFullRenders;
    const renderOnDemandJustified = hasRepresentativeSample && (
        idleFrameRatio > budget.maximumIdleFrameRatio ||
        staticRebuildRatio > budget.maximumStaticRebuildRatio
    );

    return {
        hasRepresentativeSample,
        idleFrameRatio,
        staticRebuildRatio,
        renderOnDemandJustified
    };
}

export class RendererInvalidationMetrics {
    constructor({
        enabled = false,
        traceLimit = DEFAULT_TRACE_LIMIT
    } = {}) {
        this.enabled = Boolean(enabled);
        this.traceLimit = Math.max(1, Number(traceLimit) || DEFAULT_TRACE_LIMIT);
        this.reset();
    }

    reset() {
        this.counters = createCounters();
        this.scenarios = {};
        this.trace = [];
        this.sequence = 0;
        this.lastSignature = null;
    }

    recordRender({
        scenario = DEFAULT_SCENARIO,
        signature = null,
        animationActive = false,
        staticBoardDirty = false
    } = {}) {
        if (!this.enabled) return null;

        const normalizedScenario = normalizeScenario(scenario);
        const isDuplicate = signature !== null &&
            signature === this.lastSignature;
        const classification = animationActive
            ? 'animationFrames'
            : isDuplicate && !staticBoardDirty
                ? 'idleFrames'
                : 'stateFrames';

        this.counters.fullRenders++;
        this.counters[classification]++;
        incrementScenario(
            this.scenarios,
            normalizedScenario,
            'fullRenders'
        );
        incrementScenario(
            this.scenarios,
            normalizedScenario,
            classification
        );
        this.appendTrace({
            event: 'render',
            scenario: normalizedScenario,
            classification
        });
        this.lastSignature = signature;
        return classification;
    }

    recordStaticBoardRebuild(scenario = DEFAULT_SCENARIO) {
        if (!this.enabled) return false;

        const normalizedScenario = normalizeScenario(scenario);
        this.counters.staticBoardRebuilds++;
        incrementScenario(
            this.scenarios,
            normalizedScenario,
            'staticBoardRebuilds'
        );
        this.appendTrace({
            event: 'static-board-rebuild',
            scenario: normalizedScenario
        });
        return true;
    }

    appendTrace(entry) {
        this.sequence++;
        if (this.trace.length >= this.traceLimit) return;
        this.trace.push({
            sequence: this.sequence,
            ...entry
        });
    }

    snapshot() {
        const counters = { ...this.counters };
        return {
            enabled: this.enabled,
            counters,
            scenarios: Object.fromEntries(
                Object.entries(this.scenarios).map(([key, value]) => [
                    key,
                    { ...value }
                ])
            ),
            trace: this.trace.map(entry => ({ ...entry })),
            budget: { ...RENDER_INVALIDATION_BUDGET },
            decision: evaluateRenderInvalidationBudget(counters)
        };
    }
}
