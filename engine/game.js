// engine/game.js
import { Board } from './board.js';
import { Dice } from './dice.js';
import {
    createGameStateSnapshot,
    sanitizeGameState
} from './gameSnapshot.js';

function cloneDiceSequences(sequences) {
    return sequences.map(sequence => [...sequence]);
}

function summarizeRuleAnalysisCache(scope) {
    const summarize = (hits, misses, cache) => ({
        queries: hits + misses,
        hits,
        misses,
        hitRate: hits + misses === 0 ? 0 : hits / (hits + misses),
        entries: cache.size
    });

    return {
        scope: 'single-champion-decision',
        sequence: summarize(
            scope.sequenceHits,
            scope.sequenceMisses,
            scope.sequenceCache
        ),
        maximum: summarize(
            scope.maximumHits,
            scope.maximumMisses,
            scope.maximumCache
        )
    };
}

export class NardeGame {
    constructor() {
        this.board = new Board();
        this.dice = new Dice();
        this.currentPlayer = 1;
        this.status = 'WAITING_FOR_DICE';
        this.mode = 'casual';
        this.timeoutStrikes = 0;
        this.endReason = null;
        this.victoryType = null;
        this.matchPoints = 0;
        this.availableMoves = [];
        this.headMovesThisTurn = 0;
        this.turnsCompleted = { 1: 0, 2: 0 };
        this.moveHistory = [];
        this.analysisMetrics = {
            memoHits: 0,
            memoMisses: 0
        };
        this.ruleAnalysisCacheScope = null;
    }

    get gameStatus() {
        return this.status;
    }

    set gameStatus(value) {
        this.status = value;
    }

    setMode(mode) {
        this.mode = mode === 'ranked' ? 'ranked' : 'casual';
    }

    recordHumanTimeout() {
        if (this.mode !== 'casual') {
            return null;
        }

        this.timeoutStrikes = Math.min(2, this.timeoutStrikes + 1);
        if (this.timeoutStrikes === 1) {
            return 'warning';
        }

        this.status = 'GAME_OVER';
        this.endReason = 'timeout';
        this.victoryType = 'timeout';
        this.matchPoints = 1;
        return 'gameOver';
    }

    resetTimeoutStrikes() {
        this.timeoutStrikes = 0;
    }

    initGame() {
        this.board.setupInitialPieces();
        this.dice.reset();
        this.currentPlayer = 1;
        this.status = 'WAITING_FOR_DICE';
        this.mode = 'casual';
        this.timeoutStrikes = 0;
        this.endReason = null;
        this.victoryType = null;
        this.matchPoints = 0;
        this.availableMoves = [];
        this.headMovesThisTurn = 0;
        this.turnsCompleted = { 1: 0, 2: 0 };
        this.moveHistory = [];
        this.ruleAnalysisCacheScope = null;
        this.resetAnalysisMetrics();
    }

    cloneBoardSlots() {
        return this.board.slots.map(slot => ({
            count: slot.count,
            player: slot.player
        }));
    }

    createMoveStateSnapshot() {
        return {
            slots: this.cloneBoardSlots(),
            borneOff: { ...this.board.borneOff },
            availableMoves: [...this.availableMoves],
            headMoves: this.headMovesThisTurn
        };
    }

    restoreMoveState(snapshot) {
        this.board.slots = snapshot.slots.map(slot => ({
            count: slot.count,
            player: slot.player
        }));
        this.board.borneOff = { ...snapshot.borneOff };
        this.availableMoves = [...snapshot.availableMoves];
        this.headMovesThisTurn = snapshot.headMoves;
    }

    exportState() {
        return createGameStateSnapshot(this);
    }

    restoreState(rawState) {
        const state = sanitizeGameState(rawState);
        if (!state) return false;

        this.board.slots = state.board.slots.map(slot => ({ ...slot }));
        this.board.borneOff = { ...state.board.borneOff };
        this.dice.values = [...state.diceValues];
        this.currentPlayer = state.currentPlayer;
        this.status = state.status;
        this.mode = state.mode;
        this.timeoutStrikes = state.timeoutStrikes;
        this.endReason = null;
        this.victoryType = null;
        this.matchPoints = 0;
        this.availableMoves = [...state.availableMoves];
        this.headMovesThisTurn = state.headMovesThisTurn;
        this.turnsCompleted = { ...state.turnsCompleted };
        this.moveHistory = state.moveHistory.map(snapshot => ({
            slots: snapshot.slots.map(slot => ({ ...slot })),
            borneOff: { ...snapshot.borneOff },
            availableMoves: [...snapshot.availableMoves],
            headMoves: snapshot.headMoves,
            move: snapshot.move ? { ...snapshot.move } : null
        }));
        this.ruleAnalysisCacheScope = null;
        this.resetAnalysisMetrics();
        return true;
    }

    resetAnalysisMetrics() {
        this.analysisMetrics.memoHits = 0;
        this.analysisMetrics.memoMisses = 0;
    }

    getAnalysisMetrics() {
        return {
            memoHits: this.analysisMetrics.memoHits,
            memoMisses: this.analysisMetrics.memoMisses
        };
    }

    beginRuleAnalysisCacheScope() {
        let scope = this.ruleAnalysisCacheScope;
        if (!scope) {
            scope = {
                depth: 0,
                sequenceCache: new Map(),
                maximumCache: new Map(),
                sequenceHits: 0,
                sequenceMisses: 0,
                maximumHits: 0,
                maximumMisses: 0
            };
            this.ruleAnalysisCacheScope = scope;
        }

        scope.depth++;
        let finished = false;

        return {
            finish: () => {
                if (!finished) {
                    finished = true;
                    scope.depth = Math.max(0, scope.depth - 1);
                    if (
                        scope.depth === 0 &&
                        this.ruleAnalysisCacheScope === scope
                    ) {
                        this.ruleAnalysisCacheScope = null;
                    }
                }

                return summarizeRuleAnalysisCache(scope);
            }
        };
    }

    getSearchStateKey() {
        let key = `${this.currentPlayer}|${this.headMovesThisTurn}|${this.availableMoves.join(',')}|${this.board.borneOff[1]}|${this.board.borneOff[2]}|`;

        for (let slotId = 1; slotId <= 24; slotId++) {
            const slot = this.board.slots[slotId];
            if (!slot || slot.count <= 0 || slot.player === null) continue;
            key += `${slotId}:${slot.player}:${slot.count};`;
        }

        return key;
    }

    isCurrentPlayersFirstTurn() {
        return this.turnsCompleted[this.currentPlayer] === 0;
    }

    getHeadMoveLimit() {
        const isDouble =
            this.dice.values.length === 2 &&
            this.dice.values[0] === this.dice.values[1];
        const isSpecialOpeningDouble =
            isDouble && [3, 4, 6].includes(this.dice.values[0]);

        return this.isCurrentPlayersFirstTurn() && isSpecialOpeningDouble
            ? 2
            : 1;
    }

    canMoveFromHead() {
        return this.headMovesThisTurn < this.getHeadMoveLimit();
    }

    rollDice() {
        if (this.gameStatus !== 'WAITING_FOR_DICE') return null;

        const rollResult = this.dice.roll();
        this.availableMoves = [...rollResult.moves];
        this.gameStatus = 'PLAYING';
        this.headMovesThisTurn = 0;
        this.moveHistory = [];

        return rollResult.values;
    }

    undoLastMove() {
        if (
            this.gameStatus !== 'PLAYING' ||
            this.moveHistory.length === 0
        ) {
            return null;
        }

        const previousMove =
            this.moveHistory.pop();
        const move = previousMove.move
            ? { ...previousMove.move }
            : null;
        this.restoreMoveState(previousMove);
        return {
            restored: true,
            move
        };
    }

    undoTurnMoves() {
        return Boolean(this.undoLastMove());
    }

    confirmTurnEnd() {
        const endingPlayer = this.currentPlayer;
        this.turnsCompleted[endingPlayer]++;
        this.currentPlayer = endingPlayer === 1 ? 2 : 1;
        this.availableMoves = [];
        this.headMovesThisTurn = 0;
        this.gameStatus = 'WAITING_FOR_DICE';
        this.moveHistory = [];
    }

    checkWinCondition() {
        if (this.board.hasPlayerWon(1)) {
            this.status = 'GAME_OVER';
            this.endReason = 'white_win';
            this.victoryType = this.board.borneOff[2] === 0
                ? 'mars'
                : 'normal';
            this.matchPoints = this.victoryType === 'mars' ? 2 : 1;
            return 1;
        }

        if (this.board.hasPlayerWon(2)) {
            this.status = 'GAME_OVER';
            this.endReason = 'black_win';
            this.victoryType = this.board.borneOff[1] === 0
                ? 'mars'
                : 'normal';
            this.matchPoints = this.victoryType === 'mars' ? 2 : 1;
            return 2;
        }

        return 0;
    }

    executeMove(fromSlot, diceValue, recordHistory = true) {
        if (this.gameStatus !== 'PLAYING') return false;

        const moveIndex = this.availableMoves.indexOf(diceValue);
        if (moveIndex === -1) return false;

        const headSlot = this.board.getHeadSlot(this.currentPlayer);
        if (fromSlot === headSlot && !this.canMoveFromHead()) {
            return false;
        }

        const toSlot = this.board.calculateTargetSlot(
            this.currentPlayer,
            fromSlot,
            diceValue
        );

        if (!this.board.isValidMove(this.currentPlayer, fromSlot, toSlot)) {
            return false;
        }

        const moveSnapshot =
            recordHistory
                ? this.createMoveStateSnapshot()
                : null;

        const movingPlayer = this.currentPlayer;
        const targetSlot = this.board.isBearingOffMove(
            movingPlayer,
            fromSlot,
            toSlot
        )
            ? 25
            : toSlot;

        if (!this.board.movePiece(fromSlot, toSlot)) return false;

        this.availableMoves.splice(moveIndex, 1);

        if (fromSlot === headSlot) {
            this.headMovesThisTurn++;
        }

        if (moveSnapshot) {
            moveSnapshot.move = {
                fromSlot,
                targetSlot,
                player: movingPlayer,
                diceValue
            };
            this.moveHistory.push(moveSnapshot);
        }

        return true;
    }

    simulateDiceSequence(fromSlot, diceValues) {
        const snapshot = this.createMoveStateSnapshot();
        let currentSlot = fromSlot;
        let valid = true;
        let borneOffCount = 0;

        try {
            for (let i = 0; i < diceValues.length; i++) {
                const diceValue = diceValues[i];
                const targetSlot =
                    this.board.calculateTargetSlot(
                        this.currentPlayer,
                        currentSlot,
                        diceValue
                    );
                const beforeBorneOff =
                    this.board.borneOff[this.currentPlayer];

                if (!this.executeMove(currentSlot, diceValue, false)) {
                    valid = false;
                    break;
                }

                const wasBorneOff =
                    this.board.borneOff[this.currentPlayer] >
                    beforeBorneOff;

                if (wasBorneOff) {
                    borneOffCount++;

                    // Toplanan pul kalan zarlarla tekrar oynanamaz.
                    if (i < diceValues.length - 1) {
                        valid = false;
                    }
                    break;
                }

                currentSlot = targetSlot;
            }

            return {
                valid,
                targetSlot: currentSlot,
                borneOffCount
            };
        } finally {
            this.restoreMoveState(snapshot);
        }
    }

    canPlayDiceSequence(fromSlot, diceValues) {
        const result = this.simulateDiceSequence(fromSlot, diceValues);
        return result.valid ? result.targetSlot : null;
    }

    executeDiceSequence(fromSlot, diceValues) {
        const simulation = this.simulateDiceSequence(
            fromSlot,
            diceValues
        );
        if (!simulation.valid) return false;

        const snapshot = this.createMoveStateSnapshot();
        const historyLength = this.moveHistory.length;
        let currentSlot = fromSlot;

        try {
            for (const diceValue of diceValues) {
                const targetSlot =
                    this.board.calculateTargetSlot(
                        this.currentPlayer,
                        currentSlot,
                        diceValue
                    );
                const beforeBorneOff =
                    this.board.borneOff[this.currentPlayer];

                if (!this.executeMove(currentSlot, diceValue)) {
                    this.restoreMoveState(snapshot);
                    this.moveHistory.length = historyLength;
                    return false;
                }

                if (
                    this.board.borneOff[this.currentPlayer] >
                    beforeBorneOff
                ) {
                    break;
                }

                currentSlot = targetSlot;
            }

            return true;
        } catch (error) {
            this.restoreMoveState(snapshot);
            this.moveHistory.length = historyLength;
            throw error;
        }
    }

    getAvailableDiceSequences() {
        const sequences = [];
        const seen = new Set();
        const moves = [...this.availableMoves];

        const build = (prefix, remaining) => {
            if (prefix.length > 0) {
                const key = prefix.join(',');
                if (!seen.has(key)) {
                    seen.add(key);
                    sequences.push([...prefix]);
                }
            }

            for (let i = 0; i < remaining.length; i++) {
                const next = remaining[i];
                const rest = [
                    ...remaining.slice(0, i),
                    ...remaining.slice(i + 1)
                ];
                build([...prefix, next], rest);
            }
        };

        build([], moves);
        return sequences.sort((a, b) => a.length - b.length);
    }

    getRawLegalSingleMoves() {
        if (
            this.gameStatus !== 'PLAYING' ||
            this.availableMoves.length === 0
        ) {
            return [];
        }

        const legalMoves = [];
        const uniqueDice = [...new Set(this.availableMoves)];

        for (let fromSlot = 1; fromSlot <= 24; fromSlot++) {
            const source = this.board.slots[fromSlot];
            if (
                source.player !== this.currentPlayer ||
                source.count <= 0
            ) {
                continue;
            }

            for (const diceValue of uniqueDice) {
                const result = this.simulateDiceSequence(
                    fromSlot,
                    [diceValue]
                );
                if (!result.valid) continue;

                legalMoves.push({
                    from: fromSlot,
                    dice: diceValue,
                    target: result.borneOffCount > 0
                        ? 25
                        : result.targetSlot
                });
            }
        }

        return legalMoves;
    }

    getMaximumPlayableMoveCount(options = {}) {
        const stateKey = this.getSearchStateKey();
        const requestScope = this.ruleAnalysisCacheScope;
        if (requestScope?.maximumCache.has(stateKey)) {
            requestScope.maximumHits++;
            return requestScope.maximumCache.get(stateKey);
        }
        if (requestScope) requestScope.maximumMisses++;

        if (this.availableMoves.length === 0) {
            requestScope?.maximumCache.set(stateKey, 0);
            return 0;
        }

        const memo = options.memo || new Map();
        if (memo.has(stateKey)) {
            this.analysisMetrics.memoHits++;
            const maximum = memo.get(stateKey);
            requestScope?.maximumCache.set(stateKey, maximum);
            return maximum;
        }

        this.analysisMetrics.memoMisses++;

        const legalMoves = this.getRawLegalSingleMoves();
        if (legalMoves.length === 0) {
            memo.set(stateKey, 0);
            requestScope?.maximumCache.set(stateKey, 0);
            return 0;
        }

        let maximum = 0;

        for (const move of legalMoves) {
            const snapshot = this.createMoveStateSnapshot();

            try {
                if (!this.executeMove(move.from, move.dice, false)) {
                    continue;
                }

                maximum = Math.max(
                    maximum,
                    1 + this.getMaximumPlayableMoveCount({ memo })
                );
            } finally {
                this.restoreMoveState(snapshot);
            }
        }

        memo.set(stateKey, maximum);
        requestScope?.maximumCache.set(stateKey, maximum);
        return maximum;
    }

    getRequiredDiceValues() {
        const memo = new Map();
        const maximum = this.getMaximumPlayableMoveCount({ memo });
        if (maximum === 0) return [];

        const legalMoves = this.getRawLegalSingleMoves();

        // İki farklı zardan yalnız biri oynanabiliyorsa büyük zar zorunludur.
        if (maximum === 1) {
            return [Math.max(...legalMoves.map(move => move.dice))];
        }

        const required = new Set();

        for (const move of legalMoves) {
            const snapshot = this.createMoveStateSnapshot();

            try {
                if (!this.executeMove(move.from, move.dice, false)) {
                    continue;
                }

                if (
                    1 + this.getMaximumPlayableMoveCount({ memo }) ===
                    maximum
                ) {
                    required.add(move.dice);
                }
            } finally {
                this.restoreMoveState(snapshot);
            }
        }

        return [...required];
    }

    getRuleCompliantDiceSequences(fromSlot) {
        const requestScope = this.ruleAnalysisCacheScope;
        const cacheKey = requestScope
            ? `${fromSlot}|${this.getSearchStateKey()}`
            : null;
        if (requestScope?.sequenceCache.has(cacheKey)) {
            requestScope.sequenceHits++;
            return cloneDiceSequences(
                requestScope.sequenceCache.get(cacheKey)
            );
        }
        if (requestScope) requestScope.sequenceMisses++;

        const memo = new Map();
        const maximum = this.getMaximumPlayableMoveCount({ memo });
        if (maximum === 0) {
            requestScope?.sequenceCache.set(cacheKey, []);
            return [];
        }

        const requiredDice = new Set(this.getRequiredDiceValues());
        const compliant = [];

        for (const sequence of this.getAvailableDiceSequences()) {
            if (
                sequence.length === 1 &&
                !requiredDice.has(sequence[0])
            ) {
                continue;
            }

            const simulation = this.simulateDiceSequence(
                fromSlot,
                sequence
            );
            if (!simulation.valid) continue;

            const snapshot = this.createMoveStateSnapshot();
            let currentSlot = fromSlot;
            let executed = 0;

            try {
                for (const diceValue of sequence) {
                    const targetSlot =
                        this.board.calculateTargetSlot(
                            this.currentPlayer,
                            currentSlot,
                            diceValue
                        );
                    const beforeBorneOff =
                        this.board.borneOff[this.currentPlayer];

                    if (!this.executeMove(currentSlot, diceValue, false)) {
                        break;
                    }

                    executed++;

                    if (
                        this.board.borneOff[this.currentPlayer] >
                        beforeBorneOff
                    ) {
                        break;
                    }

                    currentSlot = targetSlot;
                }

                if (
                    executed === sequence.length &&
                    executed + this.getMaximumPlayableMoveCount({ memo }) ===
                    maximum
                ) {
                    compliant.push(sequence);
                }
            } finally {
                this.restoreMoveState(snapshot);
            }
        }

        if (!requestScope) return compliant;

        const stored = cloneDiceSequences(compliant);
        requestScope.sequenceCache.set(cacheKey, stored);
        return cloneDiceSequences(stored);
    }

    getUnplayableReason(fromSlot) {
        if (
            this.gameStatus !== 'PLAYING' ||
            fromSlot < 1 ||
            fromSlot > 24
        ) {
            return 'pieceBlocked';
        }

        const source = this.board.slots[fromSlot];
        if (
            source.player !== this.currentPlayer ||
            source.count <= 0
        ) {
            return 'pieceBlocked';
        }

        const headSlot = this.board.getHeadSlot(this.currentPlayer);
        if (
            fromSlot === headSlot &&
            !this.canMoveFromHead()
        ) {
            return 'headBlocked';
        }

        const hasRawSingleMove = this
            .getRawLegalSingleMoves()
            .some(move => move.from === fromSlot);

        if (!hasRawSingleMove) {
            const invalidReasons = [...new Set(this.availableMoves)]
                .map(diceValue => {
                    const target = this.board.calculateTargetSlot(
                        this.currentPlayer,
                        fromSlot,
                        diceValue
                    );

                    return this.board.getInvalidMoveReason(
                        this.currentPlayer,
                        fromSlot,
                        target
                    );
                });
            const specificReason = [
                'illegalPrime',
                'bearingOffHomeRequired',
                'bearingOffFartherChecker'
            ].find(reason => invalidReasons.includes(reason));

            return specificReason || 'pieceBlocked';
        }

        const legalTargets = this.getLegalTargets(fromSlot);
        if (legalTargets.length > 0) {
            return null;
        }

        return 'maxMoveConstraint';
    }

    getLegalTargets(fromSlot) {
        if (
            this.gameStatus !== 'PLAYING' ||
            fromSlot < 1 ||
            fromSlot > 24
        ) {
            return [];
        }

        const source = this.board.slots[fromSlot];
        if (
            source.player !== this.currentPlayer ||
            source.count <= 0
        ) {
            return [];
        }

        const headSlot = this.board.getHeadSlot(this.currentPlayer);
        if (
            fromSlot === headSlot &&
            !this.canMoveFromHead()
        ) {
            return [];
        }

        const targets = [];

        for (const sequence of this.getRuleCompliantDiceSequences(fromSlot)) {
            const result = this.simulateDiceSequence(
                fromSlot,
                sequence
            );
            if (!result.valid) continue;

            if (result.borneOffCount > 0) {
                targets.push(25);
            } else if (
                result.targetSlot >= 1 &&
                result.targetSlot <= 24
            ) {
                targets.push(result.targetSlot);
            }
        }

        return [...new Set(targets)];
    }

    findSequenceForTarget(fromSlot, targetId) {
        for (const sequence of this.getRuleCompliantDiceSequences(fromSlot)) {
            const result = this.simulateDiceSequence(
                fromSlot,
                sequence
            );
            if (!result.valid) continue;

            if (targetId === 25 && result.borneOffCount === 1) {
                return sequence;
            }

            if (
                targetId >= 1 &&
                targetId <= 24 &&
                result.borneOffCount === 0 &&
                result.targetSlot === targetId
            ) {
                return sequence;
            }
        }

        return null;
    }

    processPlayerInput(selectedId, targetId) {
        if (
            this.gameStatus !== 'PLAYING' ||
            selectedId < 1 ||
            selectedId > 24
        ) {
            return false;
        }

        const sequence = this.findSequenceForTarget(
            selectedId,
            targetId
        );
        if (!sequence) return false;

        return this.executeDiceSequence(selectedId, sequence);
    }

    hasValidMoves() {
        if (this.availableMoves.length === 0) return false;

        const uniqueMoves = [...new Set(this.availableMoves)];
        for (let fromSlot = 1; fromSlot <= 24; fromSlot++) {
            const slot = this.board.slots[fromSlot];
            if (
                slot.player !== this.currentPlayer ||
                slot.count <= 0
            ) {
                continue;
            }

            for (const diceValue of uniqueMoves) {
                const result = this.simulateDiceSequence(
                    fromSlot,
                    [diceValue]
                );
                if (result.valid) return true;
            }
        }

        return false;
    }
}
