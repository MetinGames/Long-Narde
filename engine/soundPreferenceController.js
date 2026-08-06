export function createSoundPreferenceController({
    sound,
    muteButton,
    volumeInput,
    translate = key => key
} = {}) {
    let started = false;

    const refresh = () => {
        if (!sound) return;
        const enabled = sound.isEnabled();
        const volume = sound.getVolume();
        if (muteButton) {
            const key = enabled ? 'ui.muteSound' : 'ui.unmuteSound';
            muteButton.setAttribute('aria-pressed', String(!enabled));
            muteButton.setAttribute('aria-label', translate(key));
            muteButton.setAttribute('title', translate(key));
            muteButton.classList.toggle('is-muted', !enabled);
        }
        if (volumeInput) {
            volumeInput.value = String(Math.round(volume * 100));
            volumeInput.disabled = !enabled;
            volumeInput.setAttribute('aria-disabled', String(!enabled));
        }
    };

    const onMute = async () => {
        await sound.toggleEnabled({ fromUserGesture: true });
        refresh();
    };

    const onVolume = event => {
        sound.setVolume(Number(event?.target?.value) / 100);
        refresh();
    };

    return {
        start() {
            if (started) return;
            started = true;
            muteButton?.addEventListener('click', onMute);
            volumeInput?.addEventListener('input', onVolume);
            refresh();
        },
        stop() {
            if (!started) return;
            started = false;
            muteButton?.removeEventListener('click', onMute);
            volumeInput?.removeEventListener('input', onVolume);
        },
        refresh
    };
}
