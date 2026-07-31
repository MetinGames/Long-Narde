// engine/runtimeDiagnostics.js

const DEFAULT_STORAGE_KEY = 'narde-runtime-diagnostics';
const MAX_RECORDS = 150;
const MAX_REPORT_BYTES = 64 * 1024;
const PERSIST_DEBOUNCE_MS = 1000;
const HEARTBEAT_INTERVAL_MS = 1000;
const LONG_STALL_THRESHOLD_MS = 3000;
const HEARTBEAT_RESET_MS = 1500;
const MAX_DETAIL_LENGTH = 180;

function defaultNow() {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
}

function wallClockNow() {
    return Date.now();
}

function safeStorage(storage) {
    if (!storage) return null;

    try {
        return typeof storage.getItem === 'function' &&
            typeof storage.setItem === 'function' &&
            typeof storage.removeItem === 'function'
            ? storage
            : null;
    } catch {
        return null;
    }
}

function getSessionStorageCandidate(windowRef) {
    try {
        if (windowRef?.sessionStorage) {
            return windowRef.sessionStorage;
        }
    } catch {
        return null;
    }

    try {
        if (typeof sessionStorage !== 'undefined') {
            return sessionStorage;
        }
    } catch {
        return null;
    }

    return null;
}

function measureBytes(value) {
    return new TextEncoder().encode(value).length;
}

function truncateText(value, maxLength = MAX_DETAIL_LENGTH) {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim();
    return text.length > maxLength
        ? `${text.slice(0, maxLength - 1)}…`
        : text;
}

function stripUrlsAndEmails(value) {
    return String(value ?? '')
        .replace(/https?:\/\/\S+/gi, '[url]')
        .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]');
}

function sanitizeDetail(detail) {
    if (detail == null) return '';

    if (typeof detail === 'string') {
        return truncateText(stripUrlsAndEmails(detail));
    }

    if (typeof detail === 'number' || typeof detail === 'boolean') {
        return String(detail);
    }

    if (Array.isArray(detail)) {
        return truncateText(
            stripUrlsAndEmails(detail.map(item => String(item)).join(', '))
        );
    }

    if (typeof detail === 'object') {
        const entries = [];
        for (const [key, value] of Object.entries(detail)) {
            if (value == null) continue;
            const normalizedKey = String(key).replace(/[^a-zA-Z0-9_-]/g, '_');
            if (typeof value === 'object') {
                continue;
            }

            entries.push(`${normalizedKey}=${stripUrlsAndEmails(String(value))}`);
        }
        return truncateText(entries.join(' | '));
    }

    return truncateText(stripUrlsAndEmails(String(detail)));
}

function formatTimestamp(wallClockNowRef = wallClockNow) {
    return new Date(wallClockNowRef()).toISOString();
}

function readJson(storage, key) {
    if (!storage) return null;

    try {
        return storage.getItem(key);
    } catch {
        return null;
    }
}

function writeJson(storage, key, value) {
    if (!storage) return false;

    try {
        storage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
}

function removeJson(storage, key) {
    if (!storage) return;

    try {
        storage.removeItem(key);
    } catch {
        // Storage is optional.
    }
}

function readStoredState(storage, key) {
    const raw = readJson(storage, key);
    if (!raw) {
        return { records: [], lastPersistAt: 0 };
    }

    try {
        const parsed = JSON.parse(raw);
        const records = Array.isArray(parsed?.records) ? parsed.records : [];

        return {
            records,
            lastPersistAt: typeof parsed?.lastPersistAt === 'number' ? parsed.lastPersistAt : 0
        };
    } catch {
        return { records: [], lastPersistAt: 0 };
    }
}

function resolveEnvironmentSnapshot({ documentRef, windowRef, navigatorRef }) {
    const width = typeof windowRef?.innerWidth === 'number' ? windowRef.innerWidth : null;
    const height = typeof windowRef?.innerHeight === 'number' ? windowRef.innerHeight : null;

    return {
        viewport: {
            width,
            height
        },
        online: typeof navigatorRef?.onLine === 'boolean' ? navigatorRef.onLine : null,
        visibilityState: typeof documentRef?.visibilityState === 'string'
            ? documentRef.visibilityState
            : 'unknown'
    };
}

function resolveContextSnapshot(getContext) {
    const context = typeof getContext === 'function' ? getContext() || {} : {};

    return {
        gameStatus: typeof context.gameStatus === 'string' ? context.gameStatus : 'unknown',
        currentPlayer: Number.isInteger(context.currentPlayer) ? context.currentPlayer : null,
        language: typeof context.language === 'string' ? context.language : 'unknown',
        theme: typeof context.theme === 'string' ? context.theme : 'unknown'
    };
}

function serializeForSize(records, meta) {
    return JSON.stringify({
        version: 1,
        appVersion: meta.appVersion,
        generatedAt: meta.generatedAt,
        recordCount: records.length,
        records
    }, null, 2);
}

function createErrorDetail(event) {
    const error = event?.error;
    const message = error?.message || event?.message || 'window-error';
    const source = typeof event?.filename === 'string'
        ? event.filename.split(/[\\/]/).pop().replace(/\?.*$/, '')
        : '';
    const line = Number.isFinite(event?.lineno) ? event.lineno : null;
    const column = Number.isFinite(event?.colno) ? event.colno : null;

    return sanitizeDetail({
        message,
        source,
        line,
        column
    });
}

function createRejectionDetail(event) {
    const reason = event?.reason;
    if (reason instanceof Error) {
        return sanitizeDetail({
            message: reason.message,
            name: reason.name
        });
    }

    return sanitizeDetail(typeof reason === 'string' ? reason : 'unhandled-rejection');
}

export function createRuntimeDiagnostics({
    storageKey = DEFAULT_STORAGE_KEY,
    maxRecords = MAX_RECORDS,
    maxReportBytes = MAX_REPORT_BYTES,
    now = defaultNow,
    wallClockNow: injectedWallClockNow = wallClockNow,
    setTimeoutRef = typeof setTimeout === 'function' ? setTimeout : null,
    clearTimeoutRef = typeof clearTimeout === 'function' ? clearTimeout : null,
    setIntervalRef = typeof setInterval === 'function' ? setInterval : null,
    clearIntervalRef = typeof clearInterval === 'function' ? clearInterval : null,
    documentRef = typeof document !== 'undefined' ? document : null,
    windowRef = typeof window !== 'undefined' ? window : null,
    navigatorRef = typeof navigator !== 'undefined' ? navigator : null,
    performanceObserverFactory = typeof PerformanceObserver !== 'undefined'
        ? PerformanceObserver
        : null,
    getContext = () => ({}),
    appVersion = 'unknown'
} = {}) {
    const storage = safeStorage(getSessionStorageCandidate(windowRef));
    const storedState = readStoredState(storage, storageKey);
    let records = storedState.records.slice(-maxRecords);
    let lastPersistAt = storedState.lastPersistAt || 0;
    let persistTimer = null;
    let heartbeatTimer = null;
    let observer = null;
    let started = false;
    let lastHeartbeatAt = now();
    let longStallLogged = false;
    let lastRecordSignature = null;
    let lastRecordTimestamp = null;

    function getSnapshot() {
        return {
            ...resolveContextSnapshot(getContext),
            ...resolveEnvironmentSnapshot({ documentRef, windowRef, navigatorRef })
        };
    }

    function persistNow() {
        persistTimer = null;
        lastPersistAt = injectedWallClockNow();

        if (!storage) return;

        const payload = {
            version: 1,
            appVersion,
            lastPersistAt,
            records
        };

        writeJson(storage, storageKey, JSON.stringify(payload));
    }

    function schedulePersist() {
        if (!storage) return;

        const elapsed = injectedWallClockNow() - lastPersistAt;
        if (elapsed >= PERSIST_DEBOUNCE_MS && persistTimer === null) {
            persistNow();
            return;
        }

        if (persistTimer !== null || !setTimeoutRef) {
            return;
        }

        const waitMs = Math.max(0, PERSIST_DEBOUNCE_MS - elapsed);
        persistTimer = setTimeoutRef(() => {
            persistNow();
        }, waitMs);
    }

    function clearPersistTimer() {
        if (persistTimer !== null && clearTimeoutRef) {
            clearTimeoutRef(persistTimer);
        }
        persistTimer = null;
    }

    function trimRecordsToLimits() {
        while (records.length > maxRecords) {
            records.shift();
        }

        while (records.length > 0) {
            const approxBytes = measureBytes(serializeForSize(records, {
                appVersion,
                generatedAt: new Date().toISOString()
            }));

            if (approxBytes <= maxReportBytes) {
                break;
            }

            records.shift();
        }
    }

    function record(eventType, detail = '', overrides = {}) {
        const snapshot = getSnapshot();
        const normalizedEventType = truncateText(eventType, 64);
        const normalizedDetail = sanitizeDetail(detail);
        const timestamp = formatTimestamp(injectedWallClockNow);
        const signature = JSON.stringify({
            eventType: normalizedEventType,
            detail: normalizedDetail,
            gameStatus: overrides.gameStatus ?? snapshot.gameStatus,
            currentPlayer: overrides.currentPlayer ?? snapshot.currentPlayer,
            language: overrides.language ?? snapshot.language,
            theme: overrides.theme ?? snapshot.theme,
            visibilityState: overrides.visibilityState ?? snapshot.visibilityState,
            online: overrides.online ?? snapshot.online
        });

        if (signature === lastRecordSignature && timestamp === lastRecordTimestamp) {
            return null;
        }

        lastRecordSignature = signature;
        lastRecordTimestamp = timestamp;

        records.push({
            timestamp,
            eventType: normalizedEventType,
            detail: normalizedDetail,
            gameStatus: overrides.gameStatus ?? snapshot.gameStatus,
            currentPlayer: overrides.currentPlayer ?? snapshot.currentPlayer,
            language: overrides.language ?? snapshot.language,
            theme: overrides.theme ?? snapshot.theme,
            viewport: overrides.viewport ?? snapshot.viewport,
            online: overrides.online ?? snapshot.online,
            visibilityState: overrides.visibilityState ?? snapshot.visibilityState
        });

        trimRecordsToLimits();
        schedulePersist();
        return records[records.length - 1];
    }

    function recordHeartbeat() {
        const snapshot = getSnapshot();
        const currentNow = now();
        const elapsed = currentNow - lastHeartbeatAt;

        if (snapshot.visibilityState === 'visible') {
            if (elapsed > LONG_STALL_THRESHOLD_MS) {
                if (!longStallLogged) {
                    record('long-stall', { gapMs: Math.round(elapsed) }, snapshot);
                    longStallLogged = true;
                }
            } else if (elapsed <= HEARTBEAT_RESET_MS) {
                longStallLogged = false;
            }
        } else {
            longStallLogged = false;
        }

        lastHeartbeatAt = currentNow;
    }

    function handleVisibilityChange() {
        const snapshot = getSnapshot();
        if (snapshot.visibilityState === 'visible') {
            lastHeartbeatAt = now();
            longStallLogged = false;
        }

        record('visibilitychange', snapshot.visibilityState, snapshot);
    }

    function handleFocus() {
        record('focus', 'focus');
    }

    function handleBlur() {
        record('blur', 'blur');
    }

    function handleOnline() {
        record('online', 'online', { online: true });
    }

    function handleOffline() {
        record('offline', 'offline', { online: false });
    }

    function handlePageShow(event) {
        record('pageshow', event?.persisted ? 'persisted=true' : 'persisted=false');
    }

    function handlePageHide(event) {
        record('pagehide', event?.persisted ? 'persisted=true' : 'persisted=false');
    }

    function handleWindowError(event) {
        record('window-error', createErrorDetail(event));
    }

    function handleUnhandledRejection(event) {
        record('unhandledrejection', createRejectionDetail(event));
    }

    function startPerformanceObserver() {
        if (!performanceObserverFactory || typeof performanceObserverFactory !== 'function') {
            return;
        }

        try {
            observer = new performanceObserverFactory(entries => {
                for (const entry of entries.getEntries()) {
                    record('longtask', { durationMs: Math.round(entry.duration) });
                }
            });

            observer.observe({ entryTypes: ['longtask'] });
        } catch {
            observer = null;
        }
    }

    function stopPerformanceObserver() {
        try {
            observer?.disconnect?.();
        } catch {
            // Optional browser API.
        }
        observer = null;
    }

    function addListener(target, type, handler, options) {
        if (!target?.addEventListener) return null;
        target.addEventListener(type, handler, options);
        return () => target.removeEventListener?.(type, handler, options);
    }

    let cleanupListeners = [];

    function bindListeners() {
        cleanupListeners.push(
            addListener(documentRef, 'visibilitychange', handleVisibilityChange),
            addListener(windowRef, 'focus', handleFocus),
            addListener(windowRef, 'blur', handleBlur),
            addListener(windowRef, 'pageshow', handlePageShow),
            addListener(windowRef, 'pagehide', handlePageHide),
            addListener(windowRef, 'online', handleOnline),
            addListener(windowRef, 'offline', handleOffline),
            addListener(windowRef, 'error', handleWindowError),
            addListener(windowRef, 'unhandledrejection', handleUnhandledRejection)
        );

        cleanupListeners = cleanupListeners.filter(Boolean);
    }

    function unbindListeners() {
        for (const cleanup of cleanupListeners) {
            try {
                cleanup?.();
            } catch {
                // Ignore cleanup failures.
            }
        }
        cleanupListeners = [];
    }

    function start() {
        if (started) return false;
        started = true;
        bindListeners();
        startPerformanceObserver();

        if (setIntervalRef) {
            heartbeatTimer = setIntervalRef(recordHeartbeat, HEARTBEAT_INTERVAL_MS);
        }

        record('diagnostics-start', 'started');
        return true;
    }

    function stop() {
        if (!started) return false;
        started = false;

        if (heartbeatTimer !== null && clearIntervalRef) {
            clearIntervalRef(heartbeatTimer);
        }
        heartbeatTimer = null;

        clearPersistTimer();
        stopPerformanceObserver();
        unbindListeners();
        return true;
    }

    function getRecords() {
        return records.map(recordEntry => ({ ...recordEntry }));
    }

    function clearRecords() {
        records = [];
        lastRecordSignature = null;
        lastRecordTimestamp = null;
        longStallLogged = false;
        lastHeartbeatAt = now();
        clearPersistTimer();
        removeJson(storage, storageKey);
    }

    function buildReport() {
        let reportRecords = getRecords();
        let report = serializeForSize(reportRecords, {
            appVersion,
            generatedAt: new Date().toISOString()
        });

        while (measureBytes(report) > maxReportBytes && reportRecords.length > 1) {
            reportRecords = reportRecords.slice(1);
            report = serializeForSize(reportRecords, {
                appVersion,
                generatedAt: new Date().toISOString()
            });
        }

        if (measureBytes(report) > maxReportBytes && reportRecords.length > 0) {
            const [firstRecord] = reportRecords;
            const reducedDetail = truncateText(firstRecord.detail, 48);
            reportRecords = [{ ...firstRecord, detail: reducedDetail }];
            report = serializeForSize(reportRecords, {
                appVersion,
                generatedAt: new Date().toISOString()
            });
        }

        return report;
    }

    async function copyReportToClipboard({ clipboard = navigatorRef?.clipboard, documentRef: docRef = documentRef, execCommand = null } = {}) {
        const report = buildReport();

        try {
            if (clipboard?.writeText) {
                await clipboard.writeText(report);
                return true;
            }
        } catch {
            // Fall back to textarea selection.
        }

        const doc = docRef;
        if (!doc?.createElement) {
            return false;
        }

        const textarea = doc.createElement('textarea');
        textarea.value = report;
        textarea.readOnly = true;
        textarea.setAttribute('aria-hidden', 'true');
        textarea.style.position = 'fixed';
        textarea.style.top = '-1000px';
        textarea.style.left = '-1000px';
        textarea.style.opacity = '0';

        const body = doc.body || doc.documentElement || null;
        body?.appendChild?.(textarea);
        textarea.focus?.();
        textarea.select?.();

        const commandResult = typeof execCommand === 'function'
            ? execCommand('copy')
            : typeof doc.execCommand === 'function'
                ? doc.execCommand('copy')
                : false;

        textarea.remove?.();
        return Boolean(commandResult);
    }

    function recordGameStart(detail = 'game-start') {
        return record('game-start', detail);
    }

    function recordGameEnd(detail = 'game-end') {
        return record('game-end', detail);
    }

    function recordTurnChange(detail = 'turn-change') {
        return record('turn-change', detail);
    }

    function recordBotCallbackScheduled(detail = 'bot-callback-scheduled') {
        return record('bot-callback-scheduled', detail);
    }

    function recordBotCallbackStart(detail = 'bot-callback-start') {
        return record('bot-callback-start', detail);
    }

    function recordBotCallbackEnd(detail = 'bot-callback-end') {
        return record('bot-callback-end', detail);
    }

    function recordFirstTimeout(detail = 'first-timeout') {
        return record('first-timeout', detail);
    }

    function recordFinalTimeoutLoss(detail = 'final-timeout-loss') {
        return record('final-timeout-loss', detail);
    }

    function recordStateChange(eventType, detail) {
        return record(eventType, detail);
    }

    return {
        start,
        stop,
        record,
        recordStateChange,
        recordGameStart,
        recordGameEnd,
        recordTurnChange,
        recordBotCallbackScheduled,
        recordBotCallbackStart,
        recordBotCallbackEnd,
        recordFirstTimeout,
        recordFinalTimeoutLoss,
        clearRecords,
        getRecords,
        getRecordCount: () => records.length,
        buildReport,
        copyReportToClipboard
    };
}