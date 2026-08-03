import { getTheme, isThemeId } from './themes.js';

const FOCUSABLE_SELECTOR =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export class ThemeManagerController {
    constructor({
        modal,
        openButtons = [],
        closeButtons = [],
        select = null,
        optionButtons = [],
        liveStatus = null,
        getCurrentThemeId = () => 'anatolian',
        onThemeChange = () => {},
        translate = key => key,
        documentRef = modal?.ownerDocument ?? globalThis.document
    } = {}) {
        this.modal = modal;
        this.openButtons = Array.from(openButtons).filter(Boolean);
        this.closeButtons = Array.from(closeButtons).filter(Boolean);
        this.select = select;
        this.optionButtons = Array.from(optionButtons).filter(Boolean);
        this.liveStatus = liveStatus;
        this.getCurrentThemeId = getCurrentThemeId;
        this.onThemeChange = onThemeChange;
        this.translate = translate;
        this.documentRef = documentRef;

        this.active = false;
        this.isOpen = false;
        this.currentThemeId = null;
        this.lastFocusedElement = null;

        this.handleOpenClick = event => this.open(event.currentTarget);
        this.handleCloseClick = () => this.close();
        this.handleModalClick = event => {
            if (event.target === this.modal) this.close();
        };
        this.handleSelectChange = event => {
            this.selectTheme(event.target.value);
        };
        this.handleOptionClick = event => {
            this.selectTheme(event.currentTarget?.dataset?.themeOption);
        };
        this.handleKeyDown = event => this.onKeyDown(event);
    }

    start() {
        if (this.active || !this.modal) return false;

        for (const button of this.openButtons) {
            button.addEventListener('click', this.handleOpenClick);
        }
        for (const button of this.closeButtons) {
            button.addEventListener('click', this.handleCloseClick);
        }
        for (const button of this.optionButtons) {
            button.addEventListener('click', this.handleOptionClick);
        }
        this.select?.addEventListener('change', this.handleSelectChange);
        this.modal.addEventListener('click', this.handleModalClick);

        this.active = true;
        this.applyPreviewTokens();
        this.sync(this.getCurrentThemeId());
        return true;
    }

    stop() {
        if (!this.active) return false;

        this.close({ returnFocus: false });
        for (const button of this.openButtons) {
            button.removeEventListener('click', this.handleOpenClick);
        }
        for (const button of this.closeButtons) {
            button.removeEventListener('click', this.handleCloseClick);
        }
        for (const button of this.optionButtons) {
            button.removeEventListener('click', this.handleOptionClick);
        }
        this.select?.removeEventListener('change', this.handleSelectChange);
        this.modal.removeEventListener('click', this.handleModalClick);

        this.active = false;
        return true;
    }

    open(triggerElement = null) {
        if (!this.active || this.isOpen) return false;

        this.lastFocusedElement =
            triggerElement || this.documentRef?.activeElement || null;
        this.isOpen = true;
        this.modal.style.display = 'flex';
        this.modal.setAttribute('aria-hidden', 'false');
        this.documentRef?.body?.classList?.add('is-theme-manager-open');
        this.documentRef?.addEventListener('keydown', this.handleKeyDown);

        const selectedButton = this.optionButtons.find(button =>
            button.dataset?.themeOption === this.currentThemeId
        );
        (selectedButton || this.getFocusableElements()[0] || this.modal).focus?.();
        return true;
    }

    close({ returnFocus = true } = {}) {
        if (!this.isOpen) return false;

        this.isOpen = false;
        this.modal.style.display = 'none';
        this.modal.setAttribute('aria-hidden', 'true');
        this.documentRef?.body?.classList?.remove('is-theme-manager-open');
        this.documentRef?.removeEventListener('keydown', this.handleKeyDown);

        if (returnFocus) this.lastFocusedElement?.focus?.();
        return true;
    }

    selectTheme(themeId) {
        if (!isThemeId(themeId)) return false;

        const didChange = themeId !== this.currentThemeId;
        this.sync(themeId);
        if (!didChange) return true;

        const themeName = this.translate(`theme.${themeId}`);
        this.onThemeChange(themeId, themeName);
        if (this.liveStatus) {
            this.liveStatus.textContent = this.translate(
                'status.themeChanged',
                { theme: themeName }
            );
        }
        return true;
    }

    sync(themeId = this.getCurrentThemeId()) {
        if (!isThemeId(themeId)) return false;

        this.currentThemeId = themeId;
        if (this.select) this.select.value = themeId;

        for (const button of this.optionButtons) {
            const isSelected = button.dataset?.themeOption === themeId;
            button.classList?.toggle('is-selected', isSelected);
            button.setAttribute('aria-pressed', String(isSelected));
        }

        this.applyInterfaceTokens(getTheme(themeId));
        return true;
    }

    refreshForLanguage() {
        if (!this.currentThemeId) return false;
        this.sync(this.currentThemeId);
        return true;
    }

    applyPreviewTokens() {
        for (const button of this.optionButtons) {
            const themeId = button.dataset?.themeOption;
            if (!isThemeId(themeId)) continue;

            const theme = getTheme(themeId);
            const style = button.style;
            style?.setProperty('--theme-preview-frame', theme.frame[1]);
            style?.setProperty('--theme-preview-board', theme.board[0]);
            style?.setProperty('--theme-preview-point-light', theme.lightPoint[0]);
            style?.setProperty('--theme-preview-point-dark', theme.darkPoint[0]);
            style?.setProperty('--theme-preview-bar', theme.bar[0]);
            style?.setProperty('--theme-preview-white', theme.checkers.white.gradient[0]);
            style?.setProperty('--theme-preview-black', theme.checkers.black.gradient[2]);
            style?.setProperty('--theme-preview-focus', theme.interaction.focus);
        }
    }

    applyInterfaceTokens(theme) {
        const root = this.documentRef?.documentElement;
        root?.setAttribute?.('data-nardora-theme', theme.id);
        root?.style?.setProperty('--nardora-theme-panel', theme.interface.panel);
        root?.style?.setProperty(
            '--nardora-theme-panel-elevated',
            theme.interface.panelElevated
        );
        root?.style?.setProperty('--nardora-theme-border', theme.interface.border);
        root?.style?.setProperty('--nardora-theme-text', theme.interface.text);
        root?.style?.setProperty(
            '--nardora-theme-muted-text',
            theme.interface.mutedText
        );
        root?.style?.setProperty('--nardora-theme-focus', theme.interaction.focus);
    }

    getFocusableElements() {
        if (typeof this.modal?.querySelectorAll !== 'function') return [];
        return Array.from(this.modal.querySelectorAll(FOCUSABLE_SELECTOR))
            .filter(element =>
                !element.disabled &&
                element.hidden !== true &&
                element.getAttribute?.('aria-hidden') !== 'true'
            );
    }

    onKeyDown(event) {
        if (!this.isOpen) return;

        if (event.key === 'Escape') {
            event.preventDefault?.();
            this.close();
            return;
        }
        if (event.key !== 'Tab') return;

        const focusables = this.getFocusableElements();
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const activeElement = this.documentRef?.activeElement;
        if (event.shiftKey && activeElement === first) {
            event.preventDefault?.();
            last.focus?.();
        } else if (!event.shiftKey && activeElement === last) {
            event.preventDefault?.();
            first.focus?.();
        }
    }
}
