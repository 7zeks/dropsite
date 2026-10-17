/* Native file, notebook and auth handlers own actions; this module owns the glass. */
(() => {
    'use strict';
    const dock = document.getElementById('bottomActionDock');
    if (!dock) return;
    const lens = document.getElementById('glassDockLens');
    const account = document.getElementById('glassDockAccount');
    const panel = document.getElementById('glassDockAccountPanel');
    const buttons = Array.from(dock.querySelectorAll('[data-glass-action]'));
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const gentle = () => reduced.matches || document.documentElement.classList.contains('eco-mode');
    const text = {
        pl: ['Konto','Twoje konto','Wyloguj się','Zamknij','Twój panel','Wysyłanie plików','Transfer zakończony','Postęp wysyłania','Zaloguj się'],
        en: ['Account','Your account','Sign out','Close','Your workspace','Uploading files','Transfer complete','Upload progress','Sign in'],
        de: ['Konto','Dein Konto','Abmelden','Schließen','Dein Arbeitsbereich','Dateien werden gesendet','Übertragung abgeschlossen','Upload-Fortschritt','Anmelden'],
        es: ['Cuenta','Tu cuenta','Cerrar sesión','Cerrar','Tu espacio','Enviando archivos','Transferencia completada','Progreso de subida','Iniciar sesión'],
        fr: ['Compte','Votre compte','Se déconnecter','Fermer','Votre espace','Envoi des fichiers','Transfert terminé','Progression de l’envoi','Se connecter'],
        uk: ['Акаунт','Ваш акаунт','Вийти','Закрити','Ваша панель','Надсилання файлів','Передачу завершено','Прогрес надсилання','Увійти']
    };
    const copy = index => (text[document.documentElement.lang] || text.en)[index];
    const fields = { account: 0, accountTitle: 1, logout: 2, signin: 8 };
    const targets = { files: document.getElementById('modModal'), notes: document.getElementById('accountVaultModalWrap'), login: document.getElementById('loginModalWrap') };
    const nativeVisible = modal => modal && !modal.hidden && modal.style.display !== 'none' && !modal.classList.contains('is-closing');
    const defaultAction = 'account';
    let selected = buttons.find(b => b.dataset.glassAction === defaultAction) || buttons[buttons.length - 1], lensAnimation, menuAnimation, menuTimer, resizeFrame, pendingPanel;
    const menuClose = document.getElementById('glassDockAccountClose');
    function placeLens(animate = false) {
        if (!selected || !dock.getClientRects().length) return;
        const current = new DOMMatrixReadOnly(getComputedStyle(lens).transform).m41;
        const next = selected.offsetLeft;
        dock.style.setProperty('--dock-lens-x', `${next}px`);
        dock.style.setProperty('--dock-lens-width', `${selected.offsetWidth}px`);
        buttons.forEach(button => button.dataset.selected = String(button === selected));
        lensAnimation?.cancel();
        if (animate && !gentle() && Math.abs(current - next) > 2) {
            lensAnimation = lens.animate([
                { transform: `translateX(${current}px) scale(1,1)`, offset: 0 },
                { transform: `translateX(${(current + next) / 2}px) scale(1.22,.82)`, offset: .42 },
                { transform: `translateX(${next}px) scale(1,1)`, offset: 1 }
            ], { duration: 620, easing: 'cubic-bezier(.2,.8,.2,1)' });
        }
    }
    function choose(name, animate = true) {
        const next = buttons.find(button => button.dataset.glassAction === name) || selected;
        if (next === selected) return;
        selected = next;
        placeLens(animate);
    }
    function closeAccount(restoreFocus = false, immediate = false) {
        if (panel.hidden) return;
        account.setAttribute('aria-expanded', 'false');
        menuAnimation?.cancel(); clearTimeout(menuTimer);
        if (immediate || gentle()) panel.hidden = true;
        else {
            panel.inert = true;
            menuAnimation = panel.animate([{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(8px) scale(.96)' }], { duration: 160, easing: 'ease-in', fill: 'forwards' });
            menuTimer = setTimeout(() => { panel.hidden = true; panel.inert = false; menuAnimation?.cancel(); }, 165);
        }
        if (restoreFocus) account.focus({ preventScroll: true });
        placeLens();
    }
    function openAccount() {
        if (account.getAttribute('aria-expanded') === 'true') { closeAccount(true); return; }
        clearTimeout(menuTimer); menuAnimation?.cancel(); panel.inert = false; panel.hidden = false;
        account.setAttribute('aria-expanded', 'true'); choose('account');
        if (!gentle()) menuAnimation = panel.animate([{ opacity: .2, transform: 'translateY(14px) scale(.88)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 430, easing: 'cubic-bezier(.16,1,.3,1)' });
        menuClose.focus({ preventScroll: true });
    }
    function closeOtherPanels(except) {
        Object.entries(targets).forEach(([name, modal]) => {
            if (name === except || !nativeVisible(modal)) return;
            if (name === 'notes' && window.closeAccountVault) window.closeAccountVault();
            else window.smoothCloseModal?.(modal);
        });
    }
    // Capture before native onclick handlers, including those called from the mobile menu.
    document.addEventListener('click', event => {
        const trigger = event.target.closest('#openUserPanelBtn,#dockVaultBtn,#glassDockAccount,#loginBtn,#openModBtn,#dockLogoutBtn');
        if (!trigger || trigger.disabled) return;
        const name = trigger.dataset.glassAction || (trigger.id === 'loginBtn' ? 'login' : 'account');
        if (trigger.id === 'dockLogoutBtn') { closeAccount(false, true); return; }
        choose(name === 'login' ? 'account' : name);
        if (name !== 'account' || trigger.id === 'openModBtn') closeAccount(false, true);
        closeOtherPanels(name === 'account' ? (trigger.id === 'openModBtn' ? 'files' : null) : name);
        pendingPanel = name === 'account' ? (trigger.id === 'openModBtn' ? 'files' : null) : name;
    }, true);
    account.addEventListener('click', openAccount);
    menuClose.addEventListener('click', () => closeAccount(true));
    document.addEventListener('pointerdown', event => {
        if (!panel.hidden && !panel.contains(event.target) && !account.contains(event.target)) closeAccount();
    }, true);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); event.stopImmediatePropagation(); closeAccount(true); }
    }, true);
    dock.addEventListener('keydown', event => {
        const index = buttons.indexOf(document.activeElement);
        if (index < 0 || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next].focus();
    });
    Object.entries(targets).forEach(([name, modal]) => {
        if (!modal) return;
        let wasOpen = nativeVisible(modal);
        new MutationObserver(() => {
            const isOpen = nativeVisible(modal);
            const control = name === 'login' ? account : buttons.find(button => button.dataset.glassAction === name);
            if (name !== 'login') control?.setAttribute('aria-expanded', String(isOpen));
            if (isOpen && !wasOpen) {
                choose(name === 'login' ? 'account' : name);
                if (pendingPanel === name && !gentle()) {
                    const container = modal.querySelector('.mod-container');
                    if (container) {
                        const rect = container.getBoundingClientRect(), source = selected.getBoundingClientRect();
                        const x = Math.min(90, Math.max(10, ((source.left + source.width / 2 - rect.left) / rect.width) * 100));
                        container.style.transformOrigin = `${x}% 100%`;
                        const animation = container.animate([{ transform: 'translateY(16px) scale(.94)', opacity: .4 }, { transform: 'translateY(0) scale(1)', opacity: 1 }], { duration: 430, easing: 'cubic-bezier(.16,1,.3,1)' });
                        animation.onfinish = animation.oncancel = () => { container.style.transformOrigin = ''; };
                    }
                }
                pendingPanel = null;
            } else if (!isOpen && wasOpen) {
                // Gdy modal zostaje zamknięty, kapsułka wraca na swoje domyślne miejsce (Konto)
                const anyModalOpen = Object.values(targets).some(m => nativeVisible(m));
                if (!anyModalOpen && account.getAttribute('aria-expanded') !== 'true') {
                    choose(defaultAction);
                } else {
                    placeLens();
                }
            }
            wasOpen = isOpen;
        }).observe(modal, { attributes: true, attributeFilter: ['hidden','class','style'] });
    });
    const identity = document.getElementById('dockUserSection');
    const avatar = document.getElementById('glassDockAvatar');
    const guestAvatar = avatar.innerHTML;
    function syncIdentity() {
        const signedIn = identity && getComputedStyle(identity).display !== 'none';
        const name = document.getElementById('dockUsername')?.textContent.trim() || '';
        avatar.classList.toggle('is-signed-in', signedIn);
        if (signedIn) { const initial = Array.from(name)[0]?.toUpperCase() || 'U'; if (avatar.textContent !== initial) avatar.textContent = initial; }
        else if (!avatar.querySelector('svg')) avatar.innerHTML = guestAvatar;
        const badge = document.getElementById('dockProBadge');
        document.getElementById('glassDockPro').hidden = !(signedIn && badge && getComputedStyle(badge).display !== 'none');
        account.title = signedIn && name ? `${copy(0)} · ${name}` : copy(0);
        const loginLabel = document.querySelector('#loginBtn [data-glass-copy="signin"]');
        if (!signedIn && loginLabel && loginLabel.textContent !== copy(8)) loginLabel.textContent = copy(8);
    }
    if (identity) new MutationObserver(syncIdentity).observe(identity, { attributes: true, childList: true, characterData: true, subtree: true });
    const bar = document.getElementById('fsProgressBar'), track = document.getElementById('fsTrack'), success = document.getElementById('successFlow');
    let uploadSignal = false, wasUploading = false, wasSuccess = success && !success.hidden, completeTimer;
    function syncProgress() {
        const uploading = uploadSignal || Boolean(track && !track.hidden);
        const isSuccess = Boolean(success && !success.hidden);
        const fraction = Math.min(100, Math.max(0, parseFloat(bar?.style.width) || 0));
        dock.dataset.uploading = String(uploading);
        dock.style.setProperty('--dock-progress', String(fraction / 100));
        const accessibleProgress = document.getElementById('glassDockTransfer');
        accessibleProgress.hidden = !uploading; accessibleProgress.setAttribute('aria-valuenow', String(Math.round(fraction)));
        if (uploading && !wasUploading) { dock.dataset.complete = 'false'; clearTimeout(completeTimer); document.getElementById('glassDockStatus').textContent = copy(5); }
        if (isSuccess && !wasSuccess) {
            dock.dataset.complete = 'true'; document.getElementById('glassDockStatus').textContent = copy(6);
            completeTimer = setTimeout(() => { dock.dataset.complete = 'false'; }, 1700);
        }
        wasUploading = uploading; wasSuccess = isSuccess;
    }
    if (bar) new MutationObserver(syncProgress).observe(bar, { attributes: true, attributeFilter: ['style'] });
    if (track) new MutationObserver(syncProgress).observe(track, { attributes: true, attributeFilter: ['hidden'] });
    if (success) new MutationObserver(syncProgress).observe(success, { attributes: true, attributeFilter: ['hidden'] });
    window.addEventListener('dropsite:upload-state-changed', event => { uploadSignal = Boolean(event.detail?.isUploading); syncProgress(); });
    function localize() {
        document.querySelectorAll('[data-glass-copy]').forEach(element => { element.textContent = copy(fields[element.dataset.glassCopy]); });
        dock.setAttribute('aria-label', copy(4)); menuClose.setAttribute('aria-label', copy(3)); document.getElementById('glassDockTransfer').setAttribute('aria-label', copy(7));
        document.getElementById('dockLogoutBtn')?.setAttribute('aria-label', copy(2));
        syncIdentity(); placeLens();
    }
    new MutationObserver(localize).observe(document.documentElement, { attributes: true, attributeFilter: ['lang','class'] });
    new ResizeObserver(() => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(() => placeLens()); }).observe(dock);
    window.addEventListener('resize', () => { if (!panel.hidden) closeAccount(false, true); });
    reduced.addEventListener('change', () => { lensAnimation?.cancel(); menuAnimation?.cancel(); placeLens(); });
    localize(); syncProgress(); requestAnimationFrame(() => placeLens());
})();
