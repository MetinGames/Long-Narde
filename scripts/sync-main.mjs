import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..'
);

export function determineSyncAction({
    branch,
    isClean,
    headSha,
    remoteSha,
    isHeadAncestor,
    isRemoteAncestor
}) {
    if (branch !== 'main') return 'refuse-branch';
    if (!isClean) return 'refuse-dirty';
    if (headSha === remoteSha) return 'up-to-date';
    if (isHeadAncestor) return 'fast-forward';
    if (isRemoteAncestor) return 'local-ahead';
    return 'diverged';
}

function runGit(args, { acceptedExitCodes = [0], inherit = false } = {}) {
    const result = spawnSync('git', args, {
        cwd: repositoryRoot,
        encoding: 'utf8',
        stdio: inherit ? 'inherit' : 'pipe'
    });

    if (result.error) throw result.error;
    if (!acceptedExitCodes.includes(result.status)) {
        const details = [result.stdout, result.stderr]
            .filter(Boolean)
            .join('\n')
            .trim();
        throw new Error(details || `git ${args.join(' ')} failed`);
    }

    return result;
}

function readGit(args) {
    return runGit(args).stdout.trim();
}

function isAncestor(olderSha, newerSha) {
    return runGit(
        ['merge-base', '--is-ancestor', olderSha, newerSha],
        { acceptedExitCodes: [0, 1] }
    ).status === 0;
}

function shortSha(sha) {
    return sha.slice(0, 8);
}

export function syncMain() {
    const branch = readGit(['branch', '--show-current']);
    const isClean = readGit([
        'status',
        '--porcelain',
        '--untracked-files=normal'
    ]) === '';

    const preflightAction = determineSyncAction({
        branch,
        isClean,
        headSha: '',
        remoteSha: '',
        isHeadAncestor: false,
        isRemoteAncestor: false
    });

    if (preflightAction === 'refuse-branch') {
        throw new Error(
            `Güvenli eşitleme yalnızca main dalında çalışır. Aktif dal: ${branch || '(detached HEAD)'}`
        );
    }
    if (preflightAction === 'refuse-dirty') {
        throw new Error(
            'Yerel değişiklikler bulundu. Hiçbir dosyanın üzerine yazılmadı; önce değişiklikleri commit edin veya güvenli biçimde saklayın.'
        );
    }

    console.log('origin/main güncellemeleri kontrol ediliyor...');
    runGit(['fetch', 'origin', 'main'], { inherit: true });

    const headSha = readGit(['rev-parse', 'HEAD']);
    const remoteSha = readGit(['rev-parse', 'refs/remotes/origin/main']);
    const action = determineSyncAction({
        branch,
        isClean,
        headSha,
        remoteSha,
        isHeadAncestor: isAncestor(headSha, remoteSha),
        isRemoteAncestor: isAncestor(remoteSha, headSha)
    });

    if (action === 'up-to-date') {
        console.log(`Nardora zaten güncel: ${shortSha(headSha)}`);
        return action;
    }
    if (action === 'local-ahead') {
        throw new Error(
            `Yerel main origin/main dalından ileride (${shortSha(headSha)}). Otomatik push yapılmadı.`
        );
    }
    if (action === 'diverged') {
        throw new Error(
            'Yerel main ile origin/main ayrışmış. Hiçbir dosya değiştirilmedi; geçmişi inceleyip elle uzlaştırın.'
        );
    }

    runGit(['merge', '--ff-only', 'refs/remotes/origin/main'], {
        inherit: true
    });
    console.log(
        `Nardora güvenli biçimde eşitlendi: ${shortSha(headSha)} → ${shortSha(remoteSha)}`
    );
    return action;
}

if (process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        syncMain();
    } catch (error) {
        console.error(`Senkronizasyon durduruldu: ${error.message}`);
        process.exitCode = 1;
    }
}
