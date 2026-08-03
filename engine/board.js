// engine/board.js

export class Board {
    constructor() {
        this.slots = Array(25).fill(null).map(() => ({
            count: 0,
            player: null
        }));

        this.borneOff = { 1: 0, 2: 0 };
    }

    setupInitialPieces() {
        for (let i = 1; i <= 24; i++) {
            this.slots[i] = { count: 0, player: null };
        }

        this.slots[1] = { count: 15, player: 1 };
        this.slots[13] = { count: 15, player: 2 };
        this.borneOff = { 1: 0, 2: 0 };
    }

    getHeadSlot(player) {
        return player === 1 ? 1 : 13;
    }

    getHomeSlots(player) {
        return player === 1
            ? [19, 20, 21, 22, 23, 24]
            : [7, 8, 9, 10, 11, 12];
    }

    getProgress(player, slotId) {
        if (player === 1) return slotId - 1;
        return slotId >= 13 ? slotId - 13 : slotId + 11;
    }

    getSlotFromProgress(player, progress) {
        if (player === 1) return progress + 1;
        return progress <= 11 ? progress + 13 : progress - 11;
    }

    calculateTargetSlot(player, from, steps) {
        if (player === 1) {
            return from + steps;
        }

        // Siyah 13 → 24 → 1 → 12 yönünde ilerler.
        // 7–12 evindeyken 12'nin ötesi pul toplamadır ve sarılmaz.
        if (steps >= 0) {
            if (from <= 12) return from + steps;

            const target = from + steps;
            return target > 24 ? target - 24 : target;
        }

        // Bot değerlendirmesinde komşu haneleri okuyabilmek için.
        const progress = this.getProgress(player, from);
        const wrappedProgress = (progress + steps + 24) % 24;
        return this.getSlotFromProgress(player, wrappedProgress);
    }

    isBearingOffMove(player, from, to) {
        if (player === 1) return from >= 19 && from <= 24 && to > 24;
        return from >= 7 && from <= 12 && to > 12;
    }

    getBearOffDistance(player, slotId) {
        return player === 1 ? 25 - slotId : 13 - slotId;
    }

    getPipDistance(player, slotId) {
        return 24 - this.getProgress(player, slotId);
    }

    areAllPiecesInHomeBoard(player) {
        const home = new Set(this.getHomeSlots(player));

        for (let i = 1; i <= 24; i++) {
            const slot = this.slots[i];
            if (slot.player === player && slot.count > 0 && !home.has(i)) {
                return false;
            }
        }

        return true;
    }

    hasFartherCheckerInHome(player, fromSlot) {
        const currentDistance = this.getBearOffDistance(player, fromSlot);

        for (const slotId of this.getHomeSlots(player)) {
            const slot = this.slots[slotId];
            if (
                slot.player === player &&
                slot.count > 0 &&
                this.getBearOffDistance(player, slotId) > currentDistance
            ) {
                return true;
            }
        }

        return false;
    }

    getBearOffInvalidReason(player, fromSlot, diceValue) {
        if (!this.areAllPiecesInHomeBoard(player)) {
            return 'bearingOffHomeRequired';
        }

        const required = this.getBearOffDistance(player, fromSlot);
        if (diceValue === required) return null;

        if (diceValue > required) {
            return this.hasFartherCheckerInHome(player, fromSlot)
                ? 'bearingOffFartherChecker'
                : null;
        }

        return 'pieceBlocked';
    }

    canBearOff(player, fromSlot, diceValue) {
        return this.getBearOffInvalidReason(
            player,
            fromSlot,
            diceValue
        ) === null;
    }

    movePiece(from, to) {
        if (from < 1 || from > 24) return false;

        const source = this.slots[from];
        if (!source || source.count <= 0 || source.player === null) return false;

        const player = source.player;
        source.count--;
        if (source.count === 0) source.player = null;

        if (this.isBearingOffMove(player, from, to)) {
            this.borneOff[player]++;
            return true;
        }

        if (to < 1 || to > 24) return false;

        this.slots[to].count++;
        this.slots[to].player = player;
        return true;
    }

    wouldCreateIllegalPrime(player, fromSlot, toSlot) {
        if (toSlot < 1 || toSlot > 24) return false;

        const simulated = this.slots.map(slot => ({ ...slot }));
        simulated[fromSlot].count--;
        if (simulated[fromSlot].count === 0) {
            simulated[fromSlot].player = null;
        }

        simulated[toSlot].count++;
        simulated[toSlot].player = player;

        for (let startProgress = 0; startProgress <= 18; startProgress++) {
            const primeSlots = [];
            let completePrime = true;

            for (let offset = 0; offset < 6; offset++) {
                const slotId = this.getSlotFromProgress(
                    player,
                    startProgress + offset
                );
                const slot = simulated[slotId];

                if (slot.player !== player || slot.count <= 0) {
                    completePrime = false;
                    break;
                }

                primeSlots.push(slotId);
            }

            if (
                completePrime &&
                !this.hasOpponentCheckerAhead(player, primeSlots, simulated)
            ) {
                return true;
            }
        }

        return false;
    }

    hasOpponentCheckerAhead(player, primeSlots, slots = this.slots) {
        const opponent = player === 1 ? 2 : 1;
        const primeProgress = primeSlots.map(slotId =>
            this.getProgress(opponent, slotId)
        );
        const primeStart = primeProgress[0];
        const primeEnd = primeProgress[primeProgress.length - 1];
        const wrapsAround = primeProgress.some(
            (progress, index) => index > 0 && progress <= primeProgress[index - 1]
        );

        for (let slotId = 1; slotId <= 24; slotId++) {
            const slot = slots[slotId];
            if (slot.player !== opponent || slot.count <= 0) continue;

            const opponentProgress = this.getProgress(opponent, slotId);
            const isAhead = wrapsAround
                ? opponentProgress > primeEnd && opponentProgress < primeStart
                : opponentProgress > primeEnd;

            if (isAhead) {
                return true;
            }
        }

        return false;
    }

    getInvalidMoveReason(player, from, to) {
        if (from < 1 || from > 24) return 'pieceBlocked';

        const source = this.slots[from];
        if (
            !source ||
            source.player !== player ||
            source.count <= 0
        ) {
            return 'pieceBlocked';
        }

        if (this.isBearingOffMove(player, from, to)) {
            return this.getBearOffInvalidReason(
                player,
                from,
                to - from
            );
        }

        if (to < 1 || to > 24) return 'pieceBlocked';

        const target = this.slots[to];
        if (target.player !== null && target.player !== player) {
            return 'targetBlocked';
        }

        if (this.wouldCreateIllegalPrime(player, from, to)) {
            return 'illegalPrime';
        }

        return null;
    }

    isValidMove(player, from, to) {
        return this.getInvalidMoveReason(player, from, to) === null;
    }

    hasPlayerWon(player) {
        return this.borneOff[player] >= 15;
    }
}
