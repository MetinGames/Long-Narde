const DEFAULT_DURATION_MS = 1900;

function createSpark(index) {
    const spark = document.createElement('span');
    spark.className = 'nardora-splash__spark';
    spark.style.setProperty('--spark-x', `${10 + ((index * 17) % 80)}%`);
    spark.style.setProperty('--spark-y', `${12 + ((index * 29) % 72)}%`);
    spark.style.setProperty('--spark-delay', `${(index % 7) * 110}ms`);
    return spark;
}

export function createNardoraSplash({ durationMs = DEFAULT_DURATION_MS } = {}) {
    const splash = document.createElement('div');
    splash.id = 'nardora-splash';
    splash.className = 'nardora-splash';
    splash.setAttribute('role', 'status');
    splash.setAttribute('aria-live', 'polite');
    splash.setAttribute('aria-label', 'Nardora yükleniyor');

    const sparks = Array.from({ length: 16 }, (_, index) => createSpark(index));

    splash.innerHTML = `
        <div class="nardora-splash__glow" aria-hidden="true"></div>
        <div class="nardora-splash__mark" aria-hidden="true">
            <div class="nardora-splash__crown">♛</div>
            <div class="nardora-splash__laurel">❧ <strong>N</strong> ❧</div>
            <div class="nardora-splash__dice">⚄ &nbsp; ⚅</div>
        </div>
        <h1 class="nardora-splash__title">NARDORA</h1>
        <p class="nardora-splash__subtitle">LONG NARDE GAME</p>
        <p class="nardora-splash__motto">Her hamle, bir hikaye yazar.</p>
        <div class="nardora-splash__loader" aria-hidden="true"><span></span></div>
    `;

    sparks.forEach(spark => splash.appendChild(spark));

    let dismissed = false;
    let timeoutId = null;

    function dismiss() {
        if (dismissed) return;
        dismissed = true;
        splash.classList.add('nardora-splash--leaving');
        window.setTimeout(() => splash.remove(), 420);
    }

    function mount() {
        if (document.getElementById('nardora-splash')) return splash;
        document.body.prepend(splash);
        requestAnimationFrame(() => splash.classList.add('nardora-splash--visible'));
        timeoutId = window.setTimeout(dismiss, durationMs);
        splash.addEventListener('click', dismiss, { once: true });
        return splash;
    }

    function destroy() {
        if (timeoutId !== null) window.clearTimeout(timeoutId);
        splash.remove();
    }

    return { mount, dismiss, destroy, element: splash };
}

export function mountNardoraSplash(options) {
    return createNardoraSplash(options).mount();
}
