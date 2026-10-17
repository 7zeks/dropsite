/* Presentation only. File selection, encryption and transfers remain owned by app.js. */
(() => {
    'use strict';
    const hero = document.getElementById('motionHero');
    if (!hero) return;
    const box = document.getElementById('uploadBox');
    const stage = hero.querySelector('.studio-hero-right');
    const progress = document.getElementById('fsProgressBar');
    const track = document.getElementById('fsTrack');
    const success = document.getElementById('successFlow');
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = matchMedia('(pointer: fine)');
    const home = document.getElementById('view-glowna');
    // Reuse the application's single click handler and its automatic ripple cleanup.
    function prepareRipple(button) {
        if (!button || button.hasAttribute('data-ripple')) return;
        button.setAttribute('data-ripple', '');
        if (getComputedStyle(button).position === 'static') button.classList.add('motion-ripple-host');
    }
    home.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (button && !button.disabled) prepareRipple(button);
    }, { capture: true, passive: true });
    const copy = {
        en: {
            title: 'Big files.', titleAccent: 'Light work.', description: 'Drop your files. Get a link. Keep things moving.', explore: 'A whole studio, too',
            ready: 'Ready when you are', selected: 'Your files, ready to go', uploading: 'Transfer in motion', complete: 'Ready to share', drag: 'A good place to drop it',
            journey: 'LESS BETWEEN YOU AND THEM', journeyTitle: 'From your device.\nTo their next big thing.', journeyDesc: 'The final cut. The first draft. The entire project. Give your work a little momentum.',
            step1: 'Drop it.', step1Desc: 'Choose your files or drag them into the transfer window.', step2: 'Send it.', step2Desc: 'Choose how long your link stays available. Start your transfer.', step3: 'Pass it on.', step3Desc: 'Copy your link and share it with whoever needs it.',
            studioLabel: 'MORE ROOM TO CREATE', studioTitle: 'Before you send.\nMake it yours.', studioDesc: 'A set of tools that works right in your browser. A smoother path from almost done to ready to share.',
            pdfTitle: 'Your finishing touch.', pdfDesc: 'Edit, annotate and sign your PDF.', xrayTitle: 'Share the image. Keep the rest.', xrayDesc: 'Inspect and remove photo metadata.', qrTitle: 'A shortcut to anywhere.', qrDesc: 'Create a QR code that looks like you.',
            trustLabel: 'CLEAR BY DESIGN', trustTitle: 'Your files.\nYour decisions.', trust1: 'A link, with a lifetime.', trust1Desc: 'Cloud transfers store your files on a server. Choose the retention period before sending.', trust2: 'A direct route.', trust2Desc: 'Beam sends between browsers. Both people need to stay connected during the transfer.', trust3: 'Tools that stay close.', trust3Desc: 'PDF editing and photo metadata processing happen locally in your browser.', more: 'Explore every Dropsite feature'
        },
        pl: {
            title: 'Wyślij.', titleAccent: 'W nowym standardzie.', description: 'Odbierz link w sekundę. Niech Twoja praca ruszy dalej.', explore: 'Odkryj też całe studio',
            ready: 'Gotowe na Twoje pliki', selected: 'Twoja paczka jest gotowa', uploading: 'Transfer w ruchu', complete: 'Gotowe do udostępnienia', drag: 'Tutaj możesz je upuścić',
            journey: 'MNIEJ DZIELI WAS OD CELU', journeyTitle: 'Z Twojego urządzenia.\nDo czyjegoś wielkiego planu.', journeyDesc: 'Ostatni montaż. Pierwszy szkic. Cały projekt. Nadaj swojej pracy trochę rozpędu.',
            step1: 'Wrzuć.', step1Desc: 'Wybierz pliki lub przeciągnij je do okna transferu.', step2: 'Wyślij.', step2Desc: 'Wybierz czas dostępności linku. Rozpocznij transfer.', step3: 'Podaj dalej.', step3Desc: 'Skopiuj link i przekaż go osobie, która czeka na Twoje pliki.',
            studioLabel: 'WIĘCEJ MIEJSCA NA TWORZENIE', studioTitle: 'Zanim wyślesz.\nDodaj coś od siebie.', studioDesc: 'Zestaw narzędzi w Twojej przeglądarce. Krótsza droga od „prawie gotowe” do „można wysyłać”.',
            pdfTitle: 'Ostatni szlif. Twój podpis.', pdfDesc: 'Edytuj, opisuj i podpisuj dokumenty PDF.', xrayTitle: 'Udostępnij zdjęcie. Resztę zachowaj.', xrayDesc: 'Sprawdź i usuń metadane ze zdjęć.', qrTitle: 'Skrót do Twojego świata.', qrDesc: 'Stwórz kod QR w swoim stylu.',
            trustLabel: 'JASNE ZASADY', trustTitle: 'Twoje pliki.\nTwoje decyzje.', trust1: 'Link z terminem ważności.', trust1Desc: 'Transfer w chmurze zapisuje pliki na serwerze. Czas przechowywania wybierasz przed wysłaniem.', trust2: 'Bezpośrednia droga.', trust2Desc: 'Beam przesyła między przeglądarkami. Obie osoby muszą pozostać połączone podczas transferu.', trust3: 'Narzędzia blisko Ciebie.', trust3Desc: 'Edycja PDF i przetwarzanie metadanych zdjęć odbywają się lokalnie w Twojej przeglądarce.', more: 'Poznaj wszystkie możliwości Dropsite'
        }
    };
    copy.de = {
        title: 'Große Dateien.', titleAccent: 'Leicht geteilt.', description: 'Dateien ablegen. Link erhalten. Gemeinsam weiterkommen.', explore: 'Das ganze Studio entdecken', ready: 'Bereit für deine Dateien', selected: 'Dein Paket ist bereit', uploading: 'Übertragung läuft', complete: 'Bereit zum Teilen', drag: 'Hier ablegen',
        journey: 'WENIGER ZWISCHEN EUCH', journeyTitle: 'Von deinem Gerät.\nZum nächsten großen Projekt.', journeyDesc: 'Der letzte Schnitt. Der erste Entwurf. Das ganze Projekt. Bring deine Arbeit in Bewegung.', step1: 'Ablegen.', step1Desc: 'Wähle Dateien aus oder ziehe sie ins Übertragungsfenster.', step2: 'Senden.', step2Desc: 'Wähle die Verfügbarkeit des Links und starte die Übertragung.', step3: 'Weitergeben.', step3Desc: 'Kopiere den Link und teile ihn mit den richtigen Menschen.',
        studioLabel: 'MEHR RAUM ZUM GESTALTEN', studioTitle: 'Vor dem Senden.\nDeine persönliche Note.', studioDesc: 'Werkzeuge direkt im Browser. Der kurze Weg von fast fertig zu bereit zum Teilen.', pdfTitle: 'Dein letzter Schliff.', pdfDesc: 'PDFs bearbeiten, kommentieren und unterschreiben.', xrayTitle: 'Bild teilen. Den Rest behalten.', xrayDesc: 'Foto-Metadaten prüfen und entfernen.', qrTitle: 'Dein Weg in die Welt.', qrDesc: 'Erstelle einen QR-Code in deinem Stil.',
        trustLabel: 'KLARE REGELN', trustTitle: 'Deine Dateien.\nDeine Entscheidungen.', trust1: 'Ein Link mit Ablaufdatum.', trust1Desc: 'Cloud-Transfers speichern Dateien auf einem Server. Wähle die Speicherdauer vor dem Senden.', trust2: 'Der direkte Weg.', trust2Desc: 'Beam überträgt zwischen Browsern. Beide Personen müssen während der Übertragung verbunden bleiben.', trust3: 'Werkzeuge ganz nah.', trust3Desc: 'PDF-Bearbeitung und Foto-Metadaten werden lokal in deinem Browser verarbeitet.', more: 'Alle Funktionen von Dropsite entdecken'
    };
    copy.es = {
        title: 'Archivos grandes.', titleAccent: 'Sin esfuerzo.', description: 'Suelta tus archivos. Obtén un enlace. Sigue creando.', explore: 'Descubre todo el estudio', ready: 'Listo para tus archivos', selected: 'Tu paquete está listo', uploading: 'Transferencia en curso', complete: 'Listo para compartir', drag: 'Suéltalos aquí',
        journey: 'MENOS DISTANCIA ENTRE VOSOTROS', journeyTitle: 'Desde tu dispositivo.\nHasta su próxima gran idea.', journeyDesc: 'El montaje final. El primer borrador. Todo el proyecto. Dale impulso a tu trabajo.', step1: 'Suelta.', step1Desc: 'Elige tus archivos o arrástralos a la ventana de transferencia.', step2: 'Envía.', step2Desc: 'Elige cuánto durará el enlace e inicia la transferencia.', step3: 'Comparte.', step3Desc: 'Copia el enlace y compártelo con quien lo necesite.',
        studioLabel: 'MÁS ESPACIO PARA CREAR', studioTitle: 'Antes de enviar.\nDale tu toque.', studioDesc: 'Herramientas en tu navegador. Un camino más corto de casi terminado a listo para compartir.', pdfTitle: 'Tu toque final.', pdfDesc: 'Edita, anota y firma documentos PDF.', xrayTitle: 'Comparte la foto. Guarda el resto.', xrayDesc: 'Revisa y elimina los metadatos de tus fotos.', qrTitle: 'Un atajo a tu mundo.', qrDesc: 'Crea un código QR con tu estilo.',
        trustLabel: 'REGLAS CLARAS', trustTitle: 'Tus archivos.\nTus decisiones.', trust1: 'Un enlace con fecha de caducidad.', trust1Desc: 'Las transferencias en la nube guardan archivos en un servidor. Elige su duración antes de enviar.', trust2: 'El camino directo.', trust2Desc: 'Beam transfiere entre navegadores. Ambas personas deben permanecer conectadas durante la transferencia.', trust3: 'Herramientas cerca de ti.', trust3Desc: 'La edición de PDF y el procesamiento de metadatos se realizan localmente en tu navegador.', more: 'Descubre todas las funciones de Dropsite'
    };
    copy.fr = {
        title: 'Grands fichiers.', titleAccent: 'En toute légèreté.', description: 'Déposez vos fichiers. Obtenez un lien. Continuez à créer.', explore: 'Découvrez aussi le studio', ready: 'Prêt pour vos fichiers', selected: 'Votre envoi est prêt', uploading: 'Transfert en cours', complete: 'Prêt à partager', drag: 'Déposez-les ici',
        journey: 'MOINS DE DISTANCE ENTRE VOUS', journeyTitle: 'De votre appareil.\nÀ leur prochaine grande idée.', journeyDesc: 'Le montage final. La première ébauche. Le projet entier. Donnez de l’élan à votre travail.', step1: 'Déposez.', step1Desc: 'Choisissez vos fichiers ou glissez-les dans la fenêtre de transfert.', step2: 'Envoyez.', step2Desc: 'Choisissez la durée du lien et lancez le transfert.', step3: 'Partagez.', step3Desc: 'Copiez le lien et partagez-le avec les bonnes personnes.',
        studioLabel: 'PLUS DE PLACE POUR CRÉER', studioTitle: 'Avant d’envoyer.\nAjoutez votre touche.', studioDesc: 'Des outils dans votre navigateur. Le chemin le plus court entre presque terminé et prêt à partager.', pdfTitle: 'Votre touche finale.', pdfDesc: 'Modifiez, annotez et signez vos PDF.', xrayTitle: 'Partagez la photo. Gardez le reste.', xrayDesc: 'Inspectez et supprimez les métadonnées des photos.', qrTitle: 'Un raccourci vers votre monde.', qrDesc: 'Créez un code QR à votre image.',
        trustLabel: 'DES RÈGLES CLAIRES', trustTitle: 'Vos fichiers.\nVos décisions.', trust1: 'Un lien à durée définie.', trust1Desc: 'Les transferts cloud stockent vos fichiers sur un serveur. Choisissez la durée avant l’envoi.', trust2: 'Le chemin direct.', trust2Desc: 'Beam transfère entre navigateurs. Les deux personnes doivent rester connectées pendant le transfert.', trust3: 'Des outils tout près.', trust3Desc: 'L’édition PDF et le traitement des métadonnées se font localement dans votre navigateur.', more: 'Découvrez toutes les fonctions de Dropsite'
    };
    copy.uk = {
        title: 'Великі файли.', titleAccent: 'Легка передача.', description: 'Додайте файли. Отримайте посилання. Рухайтеся далі.', explore: 'Відкрийте всю студію', ready: 'Готові до ваших файлів', selected: 'Ваш пакет готовий', uploading: 'Передача триває', complete: 'Можна ділитися', drag: 'Перетягніть сюди',
        journey: 'МЕНШЕ ПЕРЕШКОД МІЖ ВАМИ', journeyTitle: 'З вашого пристрою.\nДо чиєїсь великої ідеї.', journeyDesc: 'Фінальний монтаж. Перший ескіз. Увесь проєкт. Надайте своїй роботі руху.', step1: 'Додайте.', step1Desc: 'Виберіть файли або перетягніть їх у вікно передачі.', step2: 'Надішліть.', step2Desc: 'Виберіть термін дії посилання та почніть передачу.', step3: 'Поділіться.', step3Desc: 'Скопіюйте посилання й передайте тим, хто чекає на ваші файли.',
        studioLabel: 'БІЛЬШЕ ПРОСТОРУ ДЛЯ ТВОРЧОСТІ', studioTitle: 'Перш ніж надіслати.\nДодайте щось своє.', studioDesc: 'Інструменти у вашому браузері. Коротший шлях від «майже готово» до «можна надсилати».', pdfTitle: 'Ваш фінальний штрих.', pdfDesc: 'Редагуйте, коментуйте й підписуйте PDF.', xrayTitle: 'Діліться фото. Решту збережіть.', xrayDesc: 'Перевіряйте та видаляйте метадані фотографій.', qrTitle: 'Короткий шлях у ваш світ.', qrDesc: 'Створіть QR-код у своєму стилі.',
        trustLabel: 'ПРОЗОРІ ПРАВИЛА', trustTitle: 'Ваші файли.\nВаші рішення.', trust1: 'Посилання з терміном дії.', trust1Desc: 'Хмарна передача зберігає файли на сервері. Виберіть термін зберігання перед надсиланням.', trust2: 'Прямий шлях.', trust2Desc: 'Beam передає між браузерами. Обидві сторони мають залишатися підключеними під час передачі.', trust3: 'Інструменти поруч.', trust3Desc: 'Редагування PDF та обробка метаданих фото відбуваються локально у вашому браузері.', more: 'Дізнайтеся про всі можливості Dropsite'
    };
    function dictionary() { return copy[document.documentElement.lang] || copy.en; }
    function localize() {
        const text = dictionary();
        document.querySelectorAll('[data-motion-copy]').forEach(el => {
            const value = text[el.dataset.motionCopy];
            if (value) el.textContent = value;
        });
        updateState();
    }
    let dragging = false;
    let dragDepth = 0;
    let previousState;
    function updateState() {
        const state = dragging ? 'drag' : !success.hidden ? 'complete' : !track.hidden ? 'uploading' : box.classList.contains('has-files') ? 'selected' : 'ready';
        hero.dataset.transferState = state;
        const label = document.getElementById('motionStateLabel');
        const value = dictionary()[state];
        if (label.textContent !== value) label.textContent = value;
        const percent = parseFloat(progress.style.width) || 0;
        const fill = state === 'complete' ? 100 : state === 'uploading' ? Math.max(0, Math.min(100, percent)) : 0;
        box.style.setProperty('--motion-progress', `${fill}%`);
        if (previousState && previousState !== state && !reduceMotion.matches && !document.documentElement.classList.contains('eco-mode')) {
            document.getElementById('motionStateLabel').animate([{ opacity: .35 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' });
        }
        previousState = state;
    }
    const observer = new MutationObserver(updateState);
    observer.observe(box, { attributes: true, attributeFilter: ['class'] });
    observer.observe(success, { attributes: true, attributeFilter: ['hidden'] });
    observer.observe(track, { attributes: true, attributeFilter: ['hidden'] });
    observer.observe(progress, { attributes: true, attributeFilter: ['style'] });
    new MutationObserver(localize).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    let pointerFrame = 0;
    let lastX = -1, lastY = -1;
    stage.addEventListener('pointermove', event => {
        if (reduceMotion.matches || !finePointer.matches || document.documentElement.classList.contains('eco-mode') || document.body.classList.contains('is-modal-active')) return;
        if (success && !success.hidden) return; // Optymalizacja: zatrzymaj przeliczanie koordynatów podczas wyświetlania okna sukcesu
        cancelAnimationFrame(pointerFrame);
        pointerFrame = requestAnimationFrame(() => {
            const rect = stage.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            const x = Math.round(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * 100);
            const y = Math.round(Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) * 100);
            if (Math.abs(x - lastX) < 1 && Math.abs(y - lastY) < 1) return;
            lastX = x;
            lastY = y;
            box.style.setProperty('--motion-x', `${x}%`);
            box.style.setProperty('--motion-y', `${y}%`);
        });
    });
    stage.addEventListener('pointerleave', () => {
        cancelAnimationFrame(pointerFrame);
    });
    // Never cancel a drag event: existing upload handlers own file ingestion.
    document.addEventListener('dragenter', event => {
        if (!Array.from(event.dataTransfer?.types || []).includes('Files')) return;
        dragDepth++;
        dragging = true;
        updateState();
    });
    document.addEventListener('dragleave', () => {
        dragDepth = Math.max(0, dragDepth - 1);
        if (!dragDepth) { dragging = false; updateState(); }
    });
    function resetDrag() { dragDepth = 0; dragging = false; updateState(); }
    document.addEventListener('drop', resetDrag);
    document.addEventListener('dragend', resetDrag);
    window.addEventListener('blur', resetDrag);
    document.querySelectorAll('[data-motion-tool]').forEach(button => {
        button.addEventListener('click', () => {
            if (typeof window.openToolTab === 'function') window.openToolTab(button.dataset.motionTool);
        });
    });
    // A finite reveal, with no hidden content or perpetual scroll animation.
    if ('IntersectionObserver' in window) {
        const reveal = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                if (!reduceMotion.matches && !document.documentElement.classList.contains('eco-mode')) {
                    entry.target.animate([{ transform: 'translateY(20px)', opacity: .65 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 650, easing: 'cubic-bezier(.2,.7,.2,1)' });
                }
                reveal.unobserve(entry.target);
            });
        }, { threshold: .15 });
        document.querySelectorAll('.motion-steps article, .motion-tool, .motion-trust').forEach(el => reveal.observe(el));
    }
    // =========================================================================
    // ELASTIC HORIZON & PARALLAX SPLIT ACCORDION CONTROLLER (.motion-more)
    // =========================================================================
    (function initElasticHorizon() {
        const details = document.getElementById('motionMoreDetails') || document.querySelector('.motion-more');
        if (!details) return;
        const summary = details.querySelector('summary');
        const content = details.querySelector('.motion-more-content') || details.querySelector('.bento-showcase-section');
        if (!summary || !content) return;

        let isBusy = false;

        function playHorizonAudio(isOpening) {
            try {
                if (reduceMotion.matches || document.documentElement.classList.contains('eco-mode')) return;
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                const ctx = window.DropsiteSoundCtx || new AudioCtx();
                window.DropsiteSoundCtx = ctx;
                if (ctx.state === 'suspended') ctx.resume();

                const now = ctx.currentTime;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
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

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.25);
            } catch (e) { }
        }

        summary.addEventListener('click', (e) => {
            e.preventDefault();
            if (isBusy) return;

            const isCurrentlyOpen = details.hasAttribute('open');

            if (!isCurrentlyOpen) {
                // OPENING: String Sag -> Flash Snap -> WAAPI Spring Height -> Parallax Split
                isBusy = true;
                playHorizonAudio(true);

                summary.classList.add('is-snapping');
                details.classList.remove('is-closing');
                details.classList.add('is-opening');

                const startHeight = details.offsetHeight;
                details.setAttribute('open', '');

                content.style.contentVisibility = 'visible';
                const fullHeight = content.scrollHeight;
                const targetHeight = summary.offsetHeight + fullHeight;

                const anim = details.animate(
                    [
                        { height: `${startHeight}px` },
                        { height: `${targetHeight}px` }
                    ],
                    {
                        duration: 650,
                        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
                    }
                );

                anim.onfinish = () => {
                    details.style.height = 'auto';
                    summary.classList.remove('is-snapping');
                    details.classList.remove('is-opening');
                    details.classList.add('is-expanded');
                    content.style.contentVisibility = '';
                    isBusy = false;
                };
            } else {
                // CLOSING: Fluid Horizon Collapse
                isBusy = true;
                playHorizonAudio(false);

                details.classList.remove('is-expanded', 'is-opening');
                details.classList.add('is-closing');

                const startHeight = details.offsetHeight;
                const targetHeight = summary.offsetHeight;

                const anim = details.animate(
                    [
                        { height: `${startHeight}px` },
                        { height: `${targetHeight}px` }
                    ],
                    {
                        duration: 460,
                        easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
                    }
                );

                anim.onfinish = () => {
                    details.removeAttribute('open');
                    details.style.height = '';
                    details.classList.remove('is-closing');
                    isBusy = false;
                };
            }
        });
    })();

    localize();
    if (!reduceMotion.matches && !document.documentElement.classList.contains('eco-mode') && !home.hidden) {
        hero.querySelectorAll('.motion-eyebrow, .motion-title, .studio-hero-desc, .motion-explore, .studio-hero-right').forEach((element, index) => {
            element.animate([{ opacity: .5, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], {
                duration: 560, delay: index * 60, easing: 'cubic-bezier(.16,1,.3,1)'
            });
        });
    }
})();
