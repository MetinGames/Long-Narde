const SUPPORTED_BOT_DIFFICULTIES = new Set([
    'easy',
    'medium',
    'hard',
    'champion'
]);

export function normalizeBotDifficulty(difficulty) {
    return SUPPORTED_BOT_DIFFICULTIES.has(difficulty)
        ? difficulty
        : 'medium';
}

export function applyBotDifficultySelection({
    bot,
    game,
    runtimeState,
    nextDifficulty,
    resetBotCallbackGuards = () => {},
    scheduleBotMoveCallback = () => null
}) {
    const difficulty = normalizeBotDifficulty(nextDifficulty);

    runtimeState.invalidateSessionToken?.();
    bot.resetPlannedTurn?.();
    resetBotCallbackGuards();
    bot.difficulty = difficulty;

    const shouldRescheduleBotTurn =
        game?.gameStatus === 'PLAYING' &&
        game?.currentPlayer === bot.playerNumber;

    if (shouldRescheduleBotTurn) {
        scheduleBotMoveCallback(0);
    }

    return {
        difficulty,
        shouldRescheduleBotTurn
    };
}