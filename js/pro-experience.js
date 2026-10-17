/* A finite presentation layer around the existing PRO and payment state. */
(() => {
    'use strict';
    const modal = document.getElementById('proModalWrap');
    const button = document.getElementById('openProBtn');
    const card = modal?.querySelector('.pro-modal-container');
    if (!modal || !card || !button) return;
    const closeButton = document.getElementById('closeProModal');
    const features = card.querySelector('.pro-features-summary');
    const subtitle = card.querySelector('.pro-modal-subtitle');
    const header = card.querySelector('.mod-header');
    const layout = document.createElement('div'); layout.className = 'pro-experience-layout';
    const story = document.createElement('section'); story.className = 'pro-experience-story';
    story.innerHTML = '<div class="pro-experience-eyebrow">DROPSITE / MEMBERSHIP</div><h3 class="pro-experience-headline"><span id="proExperienceTitle"></span><br><span id="proExperienceAccent"></span></h3>';
    if (subtitle) story.append(subtitle);
    if (features) story.append(features);
    const options = document.createElement('section'); options.className = 'pro-experience-options';
    Array.from(card.children).forEach(element => { if (element !== header) options.append(element); });
    layout.append(story, options); card.append(layout);
    card.querySelectorAll('button,a').forEach(element => element.setAttribute('data-ripple', ''));
    const translations = {
        pl: ['Więcej miejsca.', 'Więcej możliwości.', 'Twoja przestrzeń.', 'W wersji PRO.'],
        en: ['More room.','More possibilities.','Your space.','In PRO.'],
        de: ['Mehr Raum.','Mehr Möglichkeiten.','Dein Raum.','Mit PRO.'],
        es: ['Más espacio.','Más posibilidades.','Tu espacio.','En PRO.'],
        fr: ['Plus d’espace.','Plus de possibilités.','Votre espace.','En PRO.'],
        uk: ['Більше простору.','Більше можливостей.','Ваш простір.','З PRO.']
    };
    function localize() {
        const text = translations[document.documentElement.lang] || translations.en;
        const offset = document.body.classList.contains('is-pro') ? 2 : 0;
        document.getElementById('proExperienceTitle').textContent = text[offset];
        document.getElementById('proExperienceAccent').textContent = text[offset + 1];
    }
    new MutationObserver(localize).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    new MutationObserver(localize).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    localize();
    const overlay = document.createElement('div'); overlay.id = 'proRibbonOverlay'; overlay.hidden = true; overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<canvas id="proRibbonCanvas"></canvas><div class="pro-ribbon-fallback" hidden></div>';
    document.body.append(overlay);
    const canvas = document.getElementById('proRibbonCanvas'), fallback = overlay.querySelector('.pro-ribbon-fallback');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const gentle = () => reduced.matches || document.documentElement.classList.contains('eco-mode');
    let state = 'closed', progress = 0, token = 0, raf = 0, renderer, rendererPromise, rendererLost = false, deadlineTimer;
    let source, target, returnFocus = button;
    const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const proScriptEl = document.querySelector('script[src*="pro-experience.js"]');
    const proBaseUrl = proScriptEl ? new URL('.', proScriptEl.src).href : new URL('js/', location.origin).href;
    const proRibbonUrl = new URL('pro-ribbon-scene.js?v=2', proBaseUrl).href;
    function prepare() {
        if (gentle() || rendererPromise) return rendererPromise;
        rendererPromise = import(proRibbonUrl).then(module => {
            renderer = module.createProRibbon({ canvas, onContextLost: () => { rendererLost = true; canvas.hidden = true; fallback.hidden = false; overlay.dataset.renderer = 'fallback'; } });
            return renderer;
        }).catch((err) => { console.error('Pro Ribbon init error:', err); return null; });
        return rendererPromise;
    }
    button.addEventListener('pointerenter', () => prepare(), { passive: true });
    button.addEventListener('focus', () => prepare());
    function measure() {
        const rect = button.getBoundingClientRect();
        source = rect.width && rect.bottom > 0 && rect.top < innerHeight ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : { x: innerWidth - 108, y: 18, width: 88, height: 42 };
        const end = card.getBoundingClientRect(); target = { x: end.x, y: end.y, width: end.width, height: end.height };
        fallback.style.cssText = `left:${target.x}px;top:${target.y}px;width:${target.width}px;height:${target.height}px;`;
    }
    function draw(value, useWebGL) {
        progress = value;
        card.style.setProperty('--pro-content-opacity', String(smooth(.78, 1, value)));
        if (useWebGL && !rendererLost) {
            try { renderer.render(value, source, target); return; }
            catch (_) { rendererLost = true; canvas.hidden = true; fallback.hidden = false; overlay.dataset.renderer = 'fallback'; }
        }
        const flight = smooth(0, .85, value);
        const dx = (source.x + source.width / 2 - target.x - target.width / 2) * (1 - flight);
        const dy = (source.y + source.height / 2 - target.y - target.height / 2) * (1 - flight);
        const scale = .07 + .93 * flight;
        fallback.style.transform = `translate(${dx}px,${dy}px) rotateY(${(1 - flight) * -70}deg) rotateZ(${(1 - flight) * -12}deg) scale(${scale})`;
        fallback.style.opacity = String(1 - smooth(.82, 1, value));
    }
    function cancelFrame() { cancelAnimationFrame(raf); raf = 0; clearTimeout(deadlineTimer); }
    function clean() {
        cancelFrame(); overlay.hidden = true; modal.classList.remove('pro-cinematic'); modal.removeAttribute('aria-busy');
        modal.inert = false; card.style.removeProperty('--pro-content-opacity'); button.removeAttribute('aria-busy');
    }
    function finishOpen(request) {
        if (request !== token) return;
        progress = 1; state = 'open'; clean(); button.setAttribute('aria-expanded', 'true');
        if (!modal.hidden) closeButton.focus({ preventScroll: true });
    }
    function finishClose(request) {
        if (request !== token) return;
        state = 'closed'; progress = 0; clean(); modal.hidden = true; modal.style.display = 'none'; modal.classList.remove('is-closing');
        window.unregisterClosedModal?.(modal); button.setAttribute('aria-expanded', 'false');
        if (returnFocus?.isConnected && returnFocus.getClientRects().length) returnFocus.focus({ preventScroll: true });
    }
    function play(to, useWebGL, request) {
        cancelFrame();
        const from = progress;
        // Zwinne, profesjonalne tempo animacji (460ms wejście, 340ms wyjście)
        const duration = Math.max(160, (to === 1 ? 460 : 340) * Math.abs(to - from));
        const start = performance.now();
        function frame(now) {
            if (request !== token) return;
            const linearProgress = Math.min(1, Math.max(0, (now - start) / duration));
            // Elegancki cubic-bezier (0.16, 1, 0.3, 1) – szybki start, miękkie wyhamowanie
            const easeProgress = to === 1 
                ? (1 - Math.pow(1 - linearProgress, 3)) 
                : Math.pow(linearProgress, 2.5);
            draw(from + (to - from) * easeProgress, useWebGL);
            if (linearProgress < 1) raf = requestAnimationFrame(frame);
            else if (to === 1) finishOpen(request); else finishClose(request);
        }
        raf = requestAnimationFrame(frame);
        // Also settle when a browser stops scheduling frames for a background tab.
        deadlineTimer = setTimeout(() => { if (request === token) { if (to === 1) finishOpen(request); else finishClose(request); } }, duration + 200);
    }
    async function reveal() {
        if (state === 'open' || state === 'opening') return;
        state = 'opening';
        localize();
        button.setAttribute('aria-expanded', 'true');
        finishOpen(token);
    }
    function close() {
        if (state === 'closed') return false;
        state = 'closing';
        button.removeAttribute('aria-busy');
        finishClose(token);
        return false; // Pozwól smoothCloseModal wykonać naturalny CSS fade-out modala
    }
    function settle() { if (state === 'opening') finishOpen(token); else if (state === 'closing') finishClose(token); }
    window.addEventListener('resize', settle);
    document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });
    reduced.addEventListener('change', () => { if (gentle()) settle(); });
    new MutationObserver(() => { if (gentle()) settle(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(() => { if (modal.hidden && state !== 'closed') finishClose(token); }).observe(modal, { attributes: true, attributeFilter: ['hidden'] });
    modal.addEventListener('keydown', event => {
        if (event.key !== 'Tab' || modal.hidden || state !== 'open') return;
        const focusable = Array.from(modal.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select,textarea,[tabindex="0"]')).filter(element => element.getClientRects().length);
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    });
    window.addEventListener('pagehide', event => { settle(); if (!event.persisted) renderer?.dispose(); });
    window.DropsiteProExperience = { reveal, close };
})();
