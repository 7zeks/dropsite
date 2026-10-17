/* Accessible HTML controls own the tools; the local WebGL scene is a progressive enhancement. */
(() => {
    'use strict';
    const view = document.getElementById('view-narzedzia');
    if (!view) return;
    const wrapper = view.querySelector('.toolbox-clean-wrapper');
    const tools = ['stego', 'edit', 'video-compress', 'qr-studio'];
    const copy = {
        pl: ['Twoje pliki.', 'Nowy wymiar.', 'Wybierz narzędzie. Zobacz, co kryje się pod powierzchnią. Zrób z plikiem coś więcej.', 'Cyfrowy kamuflaż', 'Wiadomość ukryta w obrazie', 'Studio PDF', 'Twój dokument. Twój podpis.', 'Kompresor wideo', 'Ten sam film. Mniejszy plik.', 'Generator QR', 'Mały kod. Wiele możliwości.', 'Ukryj plik w zdjęciu. Rozsuń warstwy demonstracji, a potem stwórz własny kamuflaż.', 'Edytuj dokument, dodaj tekst lub podpis. Wszystko w swojej przeglądarce.', 'Dopasuj rozmiar filmu do swoich potrzeb. Wybierz jakość i skompresuj plik lokalnie.', 'Zamień link, tekst lub dane kontaktowe w kod QR. Nadaj mu własny styl.', 'Otwórz narzędzie', 'Rozsuń warstwy', 'Złóż warstwy', 'Wszystkie narzędzia', 'Wróć do pracowni', 'Przeciągnij, żeby obrócić', 'Podgląd demonstracyjny', 'Pracownia działa lokalnie. Twoje pliki zostają w przeglądarce.', 'Otwieranie…', 'Nie udało się otworzyć narzędzia. Spróbuj ponownie.', 'Pełny Workspace', 'Prześlij pliki (Dropsite)'],
        en: ['Your files.', 'Another dimension.', 'Choose a tool. See beneath the surface. Take your files a little further.', 'Digital camouflage', 'A message hidden in an image', 'PDF studio', 'Your document. Your signature.', 'Video compressor', 'The same film. A smaller file.', 'QR generator', 'A small code. Endless possibilities.', 'Hide a file inside a photo. Separate the demo layers, then create your own camouflage.', 'Edit a document, add text or sign it. All inside your browser.', 'Find the right size for your video. Choose the quality and compress it locally.', 'Turn a link, text or contact details into a QR code. Make it your own.', 'Open tool', 'Separate layers', 'Bring layers together', 'All tools', 'Back to the studio', 'Drag to rotate', 'Demonstration preview', 'A local workspace. Your files stay in your browser.', 'Opening…', 'Could not open the tool. Please try again.', 'Full Workspace', 'Transfer files (Dropsite)'],
        de: ['Deine Dateien.', 'Eine neue Dimension.', 'Wähle ein Werkzeug. Entdecke, was unter der Oberfläche steckt.', 'Digitale Tarnung', 'Eine Nachricht im Bild', 'PDF-Studio', 'Dein Dokument. Deine Unterschrift.', 'Videokompressor', 'Gleicher Film. Kleinere Datei.', 'QR-Generator', 'Kleiner Code. Viele Möglichkeiten.', 'Verstecke eine Datei in einem Foto. Trenne die Demo-Ebenen und erstelle deine eigene Tarnung.', 'Dokumente bearbeiten, Text hinzufügen und unterschreiben. Direkt im Browser.', 'Wähle die passende Qualität und komprimiere dein Video lokal.', 'Verwandle Links, Text oder Kontaktdaten in einen eigenen QR-Code.', 'Werkzeug öffnen', 'Ebenen trennen', 'Ebenen verbinden', 'Alle Werkzeuge', 'Zurück ins Studio', 'Zum Drehen ziehen', 'Demonstrationsvorschau', 'Lokale Werkzeuge. Deine Dateien bleiben im Browser.', 'Wird geöffnet…', 'Das Werkzeug konnte nicht geöffnet werden. Versuche es erneut.', 'Kompletter Workspace', 'Dateien senden (Dropsite)'],
        es: ['Tus archivos.', 'Otra dimensión.', 'Elige una herramienta. Descubre qué hay bajo la superficie.', 'Camuflaje digital', 'Un mensaje oculto en una imagen', 'Estudio PDF', 'Tu documento. Tu firma.', 'Compresor de vídeo', 'El mismo vídeo. Menos tamaño.', 'Generador QR', 'Un código. Muchas posibilidades.', 'Oculta un archivo en una foto. Separa las capas del ejemplo y crea tu propio camuflaje.', 'Edita documentos, añade texto o firma en tu navegador.', 'Elige la calidad y comprime tu vídeo localmente.', 'Convierte enlaces, texto o contactos en un código QR a tu estilo.', 'Abrir herramienta', 'Separar capas', 'Unir capas', 'Todas las herramientas', 'Volver al estudio', 'Arrastra para girar', 'Vista de demostración', 'Un estudio local. Tus archivos permanecen en tu navegador.', 'Abriendo…', 'No se pudo abrir la herramienta. Inténtalo de nuevo.', 'Espacio de trabajo', 'Enviar archivos (Dropsite)'],
        fr: ['Vos fichiers.', 'Une autre dimension.', 'Choisissez un outil. Découvrez ce qui se cache sous la surface.', 'Camouflage numérique', 'Un message caché dans une image', 'Studio PDF', 'Votre document. Votre signature.', 'Compression vidéo', 'Même vidéo. Fichier plus léger.', 'Générateur QR', 'Un petit code. Tant de possibilities.', 'Cachez un fichier dans une photo. Séparez les couches de démonstration, puis créez votre camouflage.', 'Modifiez, annotez et signez des documents dans votre navigateur.', 'Choisissez la qualité et compressez votre vidéo localement.', 'Transformez liens, textes ou contacts en un code QR à votre image.', 'Ouvrir l’outil', 'Séparer les couches', 'Réunir les couches', 'Tous les outils', 'Retour au studio', 'Glissez pour tourner', 'Aperçu de démonstration', 'Un studio local. Vos fichiers restent dans votre navigateur.', 'Ouverture…', 'Impossible d’ouvrir l’outil. Réessayez.', 'Espace de travail', 'Transférer des fichiers'],
        uk: ['Ваші файли.', 'Новий вимір.', 'Виберіть інструмент. Дізнайтеся, що приховано під поверхнею.', 'Цифровий камуфляж', 'Повідомлення всередині зображення', 'PDF-студія', 'Ваш документ. Ваш підпис.', 'Стиснення відео', 'Те саме відео. Менший файл.', 'Генератор QR', 'Маленький код. Багато можливостей.', 'Сховайте файл у фотографії. Розділіть демонстраційні шари та створіть власний камуфляж.', 'Редагуйте, коментуйте й підписуйте документи у браузері.', 'Виберіть якість і стисніть відео локально.', 'Перетворіть посилання, текст або контакти на власний QR-код.', 'Відкрити інструмент', 'Розділити шари', 'З’єднати шари', 'Усі інструменти', 'Назад до студії', 'Перетягніть для обертання', 'Демонстраційний перегляд', 'Локальна студія. Ваші файли залишаються у браузері.', 'Відкриття…', 'Не вдалося відкрити інструмент. Спробуйте ще раз.', 'Повний Workspace', 'Надіслати файли (Dropsite)']
    };
    const t = index => (copy[document.documentElement.lang] || copy.en)[index];
    const lobby = document.createElement('section');
    lobby.className = 'atelier-lobby';
    lobby.setAttribute('aria-labelledby', 'atelierTitle');
    lobby.innerHTML = `<header class="atelier-heading"><div><div class="atelier-eyebrow">DROPSITE / ATELIER</div><h1 id="atelierTitle"><span data-atelier-copy="0"></span><br><span data-atelier-copy="1"></span></h1></div><div class="atelier-heading-right"><p data-atelier-copy="2"></p><nav class="atelier-heading-links"><button type="button" class="atelier-text-link" id="btnAtelierToHome"><span data-atelier-copy="26"></span></button><span class="atelier-link-sep" aria-hidden="true">·</span><button type="button" class="atelier-text-link is-accent" id="btnAtelierToWorkspace"><span data-atelier-copy="25"></span> <span aria-hidden="true">→</span></button></nav></div></header>
      <div class="atelier-stage-layout"><div class="atelier-stage" id="atelierStage"><div class="atelier-stage-info"><span id="atelierObjectLabel">01 / CAMOUFLAGE</span><span>SPATIAL STUDIO</span></div><div class="atelier-fallback" aria-hidden="true"><i></i><i></i><i></i></div><canvas class="atelier-canvas" id="atelierCanvas" aria-hidden="true"></canvas><div class="atelier-stage-hint"><span data-atelier-copy="20"></span> · <span data-atelier-copy="21"></span></div></div>
      <div class="atelier-choices" aria-label="Studios">${tools.map((tool, i) => `<button type="button" class="atelier-choice" data-atelier-select="${tool}" aria-pressed="${i === 0}" data-ripple><span class="atelier-choice-num">0${i + 1}</span><span class="atelier-choice-copy"><strong data-atelier-copy="${3 + i * 2}"></strong><small data-atelier-copy="${4 + i * 2}"></small></span><span class="atelier-choice-arrow" aria-hidden="true">↗</span></button>`).join('')}
      <div class="atelier-selection"><p id="atelierDescription" aria-live="polite"></p><button type="button" class="atelier-open" id="atelierOpen" data-ripple><span data-atelier-copy="15"></span><span class="atelier-btn-arrow" aria-hidden="true">↗</span></button><button type="button" class="atelier-workspace-direct" id="atelierWorkspaceDirect" data-ripple title="Otwórz pełny pulpit ze wszystkimi narzędziami"><span data-atelier-copy="25"></span><span class="atelier-btn-arrow" aria-hidden="true">→</span></button><button type="button" class="atelier-layer-toggle" id="atelierLayers" aria-pressed="false"><span aria-hidden="true">≋</span><span data-atelier-copy="16"></span></button></div></div></div>
      <details class="atelier-catalog" id="atelierCatalogDetails"><summary class="atelier-catalog-summary"><div class="atelier-catalog-header"><span class="atelier-catalog-title" data-atelier-copy="18"></span><span class="motion-elastic-icon" aria-hidden="true"><span class="elastic-arm arm-h"></span><span class="elastic-arm arm-v-top"></span><span class="elastic-arm arm-v-bot"></span></span></div><div class="motion-horizon-membrane"><div class="horizon-string"></div><div class="horizon-flash"></div></div></summary><div class="atelier-catalog-content" id="atelierCatalogContent"><div class="atelier-catalog-grid" id="atelierCatalog"></div></div></details><p class="atelier-footnote" data-atelier-copy="22"></p><p id="atelierStatus" class="atelier-footnote" role="status"></p>`;
    const workbar = document.createElement('div');
    workbar.className = 'atelier-workbar'; workbar.hidden = true;
    workbar.innerHTML = '<button type="button" class="atelier-workbar-btn atelier-back" id="atelierBack" data-ripple><span class="atelier-workbar-btn-icon" aria-hidden="true">←</span><span data-atelier-copy="19"></span></button><div class="atelier-workbar-right"><span class="atelier-workbar-label">DROPSITE / WORKSPACE</span></div>';
    wrapper.prepend(workbar); wrapper.prepend(lobby);
    view.classList.add('atelier-enabled');
    const stage = document.getElementById('atelierStage');
    const openButton = document.getElementById('atelierOpen');
    const layerButton = document.getElementById('atelierLayers');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let selected = 'stego', expanded = false, scene, scenePromise, token = 0;
    let inViewport = true;
    const inView = () => !view.hidden && !lobby.hidden && !document.hidden;
    const active = () => inView() && inViewport;
    const gentle = () => reduced.matches || document.documentElement.classList.contains('eco-mode');
    const atelierScriptEl = document.querySelector('script[src*="tools-atelier.js"]');
    const atelierBaseUrl = atelierScriptEl ? new URL('.', atelierScriptEl.src).href : new URL('js/', location.origin).href;
    const sceneModuleUrl = new URL('tools-atelier-scene.js?v=12', atelierBaseUrl).href;
    const catalogItems = [];
    wrapper.querySelectorAll('.tb-sidebar .tb-tool-card').forEach(source => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'atelier-catalog-tool'; button.dataset.atelierOpen = source.dataset.tool; button.setAttribute('data-ripple', '');
        const icon = source.querySelector('svg'); if (icon) button.append(icon.cloneNode(true));
        const label = document.createElement('span'); button.append(label);
        document.getElementById('atelierCatalog').append(button);
        catalogItems.push({ source, label });
    });
    function localize() {
        const galleryOwnsSelection=stage.classList.contains('has-tool-cards');
        view.querySelectorAll('[data-atelier-copy]').forEach(el => {
            if(galleryOwnsSelection && el.dataset.atelierCopy==='15')return;
            el.textContent = t(Number(el.dataset.atelierCopy));
        });
        if(!galleryOwnsSelection)document.getElementById('atelierDescription').textContent = t(11 + tools.indexOf(selected));
        layerButton.querySelector('[data-atelier-copy]').textContent = t(expanded ? 17 : 16);
        catalogItems.forEach(({ source, label }) => { label.textContent = source.querySelector('.tb-sidebar-label')?.textContent.trim() || source.textContent.trim(); });
    }
    function select(tool) {
        if (!tools.includes(tool)) return;
        selected = tool; expanded = false;
        lobby.querySelectorAll('[data-atelier-select]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.atelierSelect === tool)));
        stage.dataset.expanded = 'false';
        layerButton.hidden = tool !== 'stego'; layerButton.setAttribute('aria-pressed', 'false');
        document.getElementById('atelierObjectLabel').textContent = ['01 / CAMOUFLAGE', '02 / PDF STUDIO', '03 / VIDEO', '04 / QR STUDIO'][tools.indexOf(tool)];
        scene?.select(tool);
        const descEl = document.getElementById('atelierDescription');
        if (descEl && !gentle()) {
            descEl.animate([
                { opacity: 0.35, transform: 'translateY(3px)' },
                { opacity: 1, transform: 'translateY(0)' }
            ], { duration: 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
        }
        localize();
    }
    async function ensureScene() {
        // Direct cards replace the 3D renderer; keep the surrounding Atelier controls.
    }
    function visibility() { if (inView()) ensureScene(); scene?.setActive(active()); }
    function showWorkspace(tool) {
        if (tools.includes(tool)) selected = tool;
        const alreadyInWorkspace = view.classList.contains('atelier-in-workspace');
        ++token;
        view.classList.add('atelier-in-workspace');
        lobby.hidden = true;
        lobby.classList.remove('is-exiting');
        workbar.hidden = false;
        const deck = wrapper.querySelector('#toolboxWorkspaceDeck');
        if (deck && !alreadyInWorkspace) {
            deck.classList.remove('is-exiting');
            deck.classList.add('is-entering');
            setTimeout(() => deck.classList.remove('is-entering'), 350);
        }
        openButton.disabled = false;
        lobby.removeAttribute('aria-busy');
        scene?.setOpening(false);
        visibility();
    }
    window._atelierShowWorkspace = showWorkspace;
    window._atelierShowLobby = showLobby;

    function showLobby(focus = true) {
        ++token;
        const currentToken = token;
        const deck = wrapper.querySelector('#toolboxWorkspaceDeck');
        const transitionTime = gentle() ? 0 : 200;

        if (deck && !gentle()) {
            deck.classList.add('is-exiting');
        }

        setTimeout(() => {
            if (currentToken !== token) return;
            if (deck) deck.classList.remove('is-exiting');
            view.classList.remove('atelier-in-workspace');
            lobby.hidden = false;
            lobby.classList.add('is-entering');
            setTimeout(() => lobby.classList.remove('is-entering'), 350);
            workbar.hidden = true;
            openButton.disabled = false;
            lobby.removeAttribute('aria-busy');
            scene?.setOpening(false);
            select(selected);
            const url = new URL(location.href);
            url.pathname = '/narzedzia';
            url.searchParams.delete('tool');
            url.searchParams.delete('tab');
            history.replaceState({}, '', url);
            visibility();
            if (focus) lobby.querySelector(`[data-atelier-select="${selected}"]`)?.focus({ preventScroll: true });
        }, transitionTime);
    }
    async function openTool(tool, animate = true) {
        const request = ++token;
        openButton.disabled = true;
        lobby.setAttribute('aria-busy', 'true');
        document.getElementById('atelierStatus').textContent = t(23);
        if (tools.includes(tool)) select(tool);
        scene?.setOpening(true);
        if (!gentle() && animate) {
            lobby.classList.add('is-exiting');
        }
        try {
            await Promise.all([window.loadToolboxScripts?.(), new Promise(resolve => setTimeout(resolve, gentle() || !animate || !scene ? 0 : 640))]);
            if (request !== token || view.hidden) return;
            window.openToolTab(tool);
            showWorkspace(tool);
            document.getElementById('atelierBack').focus({ preventScroll: true });
            window.scrollTo({ top: 0, behavior: 'auto' });
        } catch (_) {
            lobby.classList.remove('is-exiting');
            document.getElementById('atelierStatus').textContent = t(24);
            scene?.setOpening(false);
        } finally {
            openButton.disabled = false;
            lobby.removeAttribute('aria-busy');
            if (document.getElementById('atelierStatus').textContent === t(23)) document.getElementById('atelierStatus').textContent = '';
        }
    }
    function goToDropsiteHome() {
        if (typeof window.playSound === 'function') window.playSound('pop');
        if (typeof window.navigateToHome === 'function') {
            window.navigateToHome(false);
        } else if (typeof window.switchView === 'function') {
            window.switchView('view-glowna', true);
        } else {
            const homeBtn = document.querySelector('.nav-btn[data-target="view-glowna"]') || document.querySelector('[data-target="view-glowna"]');
            homeBtn?.click();
        }
        try {
            window.history.pushState({}, document.title, window.location.origin + '/');
        } catch (_) {}
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    let lastRippleTime = 0;
    function createAtelierRipple(btn, event) {
        if (!btn || btn.disabled) return;
        const now = Date.now();
        if (now - lastRippleTime < 180) return;
        lastRippleTime = now;
        const rect = btn.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'atelier-ripple-wave';
        const isTouchOrKeyboard = !event || typeof event.clientX !== 'number' || (event.clientX === 0 && event.clientY === 0);
        const x = isTouchOrKeyboard ? rect.width / 2 : event.clientX - rect.left;
        const y = isTouchOrKeyboard ? rect.height / 2 : event.clientY - rect.top;
        const size = Math.max(rect.width, rect.height) * 2.6;
        ripple.style.width = `${size}px`;
        ripple.style.height = `${size}px`;
        ripple.style.left = `${x - size / 2}px`;
        ripple.style.top = `${y - size / 2}px`;
        btn.appendChild(ripple);
        setTimeout(() => { if (ripple.parentNode) ripple.remove(); }, 1050);
    }
    lobby.addEventListener('pointerdown', event => {
        const btn = event.target.closest('#atelierOpen, #atelierWorkspaceDirect');
        if (btn) createAtelierRipple(btn, event);
    });
    workbar.addEventListener('pointerdown', event => {
        const btn = event.target.closest('.atelier-workbar-btn');
        if (btn) createAtelierRipple(btn, event);
    });
    lobby.addEventListener('click', event => {
        const rippleBtn = event.target.closest('#atelierOpen, #atelierWorkspaceDirect');
        if (rippleBtn) createAtelierRipple(rippleBtn, event);
        if (event.target.closest('#btnAtelierToHome')) {
            goToDropsiteHome();
            return;
        }
        if (event.target.closest('#btnAtelierToWorkspace') || event.target.closest('#atelierWorkspaceDirect')) {
            if (typeof window.playSound === 'function') window.playSound('pop');
            openTool(selected || 'edit');
            return;
        }
        const choice = event.target.closest('[data-atelier-select]'); if (choice) select(choice.dataset.atelierSelect);
        const direct = event.target.closest('[data-atelier-open]'); if (direct) openTool(direct.dataset.atelierOpen, false);
    });
    workbar.addEventListener('click', event => {
        if (event.target.closest('#btnWorkbarToHome')) {
            goToDropsiteHome();
        }
    });
    openButton.addEventListener('click', () => openTool(selected));
    layerButton.addEventListener('click', () => { expanded = !expanded; stage.dataset.expanded = String(expanded); layerButton.setAttribute('aria-pressed', String(expanded)); scene?.setExpanded(expanded); localize(); });
    document.getElementById('atelierBack')?.addEventListener('click', () => showLobby());
    document.addEventListener('dropsite:tool-selected', event => showWorkspace(event.detail.tool));
    // Horizon-style acoustic pluck synthesizer for accordion
    function playHorizonAudio(isOpening) {
        if (reduced.matches || document.body.classList.contains('eco-mode')) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = window.DropsiteSoundCtx || new AudioCtx();
            window.DropsiteSoundCtx = ctx;
            if (ctx.state === 'suspended') ctx.resume();

            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = 'triangle';
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2200, now);

            if (isOpening) {
                osc.frequency.setValueAtTime(320, now);
                osc.frequency.exponentialRampToValueAtTime(140, now + 0.07);
                osc.frequency.exponentialRampToValueAtTime(420, now + 0.15);
                gain.gain.setValueAtTime(0.045, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            } else {
                osc.frequency.setValueAtTime(380, now);
                osc.frequency.exponentialRampToValueAtTime(160, now + 0.12);
                gain.gain.setValueAtTime(0.035, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            }

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.25);
        } catch (_) {}
    }

    // Interactive smooth accordion controller for 'Wszystkie narzędzia'
    const catalogDetails = lobby.querySelector('#atelierCatalogDetails');
    const catalogSummary = catalogDetails?.querySelector('.atelier-catalog-summary');
    const catalogContent = lobby.querySelector('#atelierCatalogContent');
    let catalogBusy = false;

    if (catalogDetails && catalogSummary && catalogContent) {
        catalogSummary.addEventListener('click', event => {
            event.preventDefault();
            if (catalogBusy) return;

            const isOpen = catalogDetails.hasAttribute('open');

            // Trigger string sag deformation & horizontal flash
            catalogDetails.classList.remove('is-snapping');
            void catalogDetails.offsetWidth;
            catalogDetails.classList.add('is-snapping');
            setTimeout(() => catalogDetails.classList.remove('is-snapping'), 500);

            playHorizonAudio(!isOpen);

            if (reduced.matches) {
                if (isOpen) {
                    catalogDetails.removeAttribute('open');
                } else {
                    catalogDetails.setAttribute('open', '');
                }
                return;
            }

            catalogBusy = true;

            if (isOpen) {
                catalogDetails.classList.add('is-closing');
                const startHeight = catalogDetails.offsetHeight;
                const endHeight = catalogSummary.offsetHeight;

                const anim = catalogDetails.animate([
                    { height: `${startHeight}px` },
                    { height: `${endHeight}px` }
                ], {
                    duration: 440,
                    easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
                });

                anim.onfinish = () => {
                    catalogDetails.removeAttribute('open');
                    catalogDetails.classList.remove('is-closing');
                    catalogDetails.style.height = '';
                    catalogBusy = false;
                };
            } else {
                catalogDetails.classList.add('is-opening');
                catalogDetails.setAttribute('open', '');

                const startHeight = catalogSummary.offsetHeight;
                const endHeight = catalogSummary.offsetHeight + catalogContent.scrollHeight;

                const anim = catalogDetails.animate([
                    { height: `${startHeight}px` },
                    { height: `${endHeight}px` }
                ], {
                    duration: 580,
                    easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
                });

                anim.onfinish = () => {
                    catalogDetails.classList.remove('is-opening');
                    catalogDetails.style.height = 'auto';
                    catalogBusy = false;
                };
            }
        });
    }

    document.addEventListener('click', event => {
        if (event.isTrusted && event.target.closest('[data-target="view-narzedzia"]')) showLobby(false);
    }, true);
    new MutationObserver(visibility).observe(view, { attributes: true, attributeFilter: ['hidden', 'class'] });
    new MutationObserver(() => { localize(); scene?.refresh(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'class'] });
    reduced.addEventListener('change', () => scene?.refresh());
    document.addEventListener('visibilitychange', visibility);
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => { inViewport = entries[0].isIntersecting; visibility(); }, { threshold: .05 }).observe(stage);
    const params = new URLSearchParams(location.search);
    const path = location.pathname.replace(/\/$/, '');
    if (params.has('tool') || (path && !['/narzedzia', '/tools', '/index.html'].includes(path))) {
        const activeCard = wrapper.querySelector('.tb-tool-card.active');
        if (!view.hidden || params.has('tool')) showWorkspace(params.get('tool') || activeCard?.dataset.tool);
    }
    localize(); visibility();
})();
