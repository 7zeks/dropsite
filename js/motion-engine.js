/**
 * ============================================================================
 * DROPSITE LEAN MOTION ENGINE (Spotlight & Reactive Tactile Physics)
 * ============================================================================
 * Single event-delegated pointer listener with requestAnimationFrame.
 * Zero CPU overhead • Auto-throttled • Eco-Mode aware.
 * ============================================================================
 */

(function initDropsiteMotionEngine() {
    'use strict';

    if (typeof window === 'undefined') return;

    // Sprawdź czy użytkownik nie wymusił ograniczenia ruchu
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let isRafScheduled = false;
    let targetCard = null;
    let clientX = 0;
    let clientY = 0;

    // Globalne śledzenie przeciągania plików na body (aktywuje magnetyczny pulse uploadera)
    let bodyDragCounter = 0;
    window.addEventListener('dragenter', (e) => {
        if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) {
            bodyDragCounter++;
            document.body.classList.add('is-dragging');
        }
    }, { passive: true });

    window.addEventListener('dragleave', () => {
        bodyDragCounter--;
        if (bodyDragCounter <= 0) {
            bodyDragCounter = 0;
            document.body.classList.remove('is-dragging');
        }
    }, { passive: true });

    window.addEventListener('drop', () => {
        bodyDragCounter = 0;
        document.body.classList.remove('is-dragging');
    }, { passive: true });

    window.addEventListener('dragend', () => {
        bodyDragCounter = 0;
        document.body.classList.remove('is-dragging');
    }, { passive: true });

    // Delegowane śledzenie kursora dla szafirowego rozświetlenia szklanych kart
    const spotlightSelector = '.upload-container, .bento-card, .toolbox-tool-card, .hud-showcase-card, .grabber-stage-wrapper';

    document.addEventListener('pointermove', (e) => {
        if (document.documentElement.classList.contains('eco-mode') || document.body.classList.contains('is-modal-active')) return;
        if (e.pointerType === 'touch') return; // Wyłącz na ekranach dotykowych
        const sFlow = document.getElementById('successFlow');
        if (sFlow && !sFlow.hidden) return; // Optymalizacja GPU: wyłącz ciągłe odświeżanie --spot-x/y na oknie sukcesu

        const card = e.target.closest(spotlightSelector);
        if (!card) {
            targetCard = null;
            return;
        }

        targetCard = card;
        clientX = e.clientX;
        clientY = e.clientY;

        if (!isRafScheduled) {
            isRafScheduled = true;
            requestAnimationFrame(updateSpotlight);
        }
    }, { passive: true });

    function updateSpotlight() {
        isRafScheduled = false;
        if (!targetCard) return;

        const rect = targetCard.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        targetCard.style.setProperty('--spot-x', `${x}px`);
        targetCard.style.setProperty('--spot-y', `${y}px`);
    }

    console.log('[Dropsite] Motion Engine v1.0 zainicjalizowany (100% GPU / rAF)');
})();
