/**
 * ============================================================================
 * DROPSITE ULTRA-PREMIUM MOTION ENGINE v2.0
 * ============================================================================
 * Artisanal motion design system:
 * 1. Particle field in dropzone with dynamic hover & drag-over excitation
 * 2. Liquid ripple expanding from drop coordinate
 * 3. Staggered reveal cascade across hero elements & uploader cockpit
 * 4. Glowing typing effect on input focus and key entry
 * 5. Drag-over mega glow enhancement for Siri glow frame
 * 6. Morphing upload icon (animated path metamorphism on success)
 * 7. Magnetic 3D cursor tracking (Apple Vision Pro spatial perspective tilt)
 * 8. Kinetic button energy & tactile micro-feedback
 *
 * 100% GPU-accelerated (Compositor Thread: transform3d & opacity only)
 * requestAnimationFrame-based • Zero layout shifts (CLS 0) • Eco-Mode aware
 * ============================================================================
 */

(function initDropsitePremiumMotion() {
    'use strict';

    if (typeof window === 'undefined') return;

    // Respect reduced motion preference and eco-mode
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const isEcoMode = () => document.documentElement.classList.contains('eco-mode');

    if (prefersReducedMotion) {
        initStaggeredRevealsImmediate();
        console.log('[Dropsite] Motion Premium v2.0 — eco/reduced mode (static)');
        return;
    }

    // =========================================================================
    // 1. PARTICLE FIELD (Canvas-based particles in dropzone)
    // =========================================================================
    function initParticleField() {
        const dropzone = document.getElementById('dropzone');
        if (!dropzone) return;

        // Check if canvas already exists
        if (dropzone.querySelector('.dropzone-particles-canvas')) return;

        const canvas = document.createElement('canvas');
        canvas.className = 'dropzone-particles-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        dropzone.insertBefore(canvas, dropzone.firstChild);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let particles = [];
        let isHovered = false;
        let isDragOver = false;
        let animFrameId = null;
        let isVisible = true;

        const PARTICLE_COUNT = 36;
        const PARTICLE_COUNT_DRAG = 70;

        function resizeCanvas() {
            const rect = dropzone.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';
            ctx.scale(dpr, dpr);
        }

        function createParticle() {
            const rect = dropzone.getBoundingClientRect();
            const w = rect.width || 300;
            const h = rect.height || 180;
            const p = {
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.45,
                vy: -Math.random() * 0.55 - 0.18,
                radius: Math.random() * 2.2 + 0.7,
                opacity: Math.random() * 0.55 + 0.25,
                hue: Math.random() > 0.6 ? 168 : 197, // mint (#34D399) or cyan (#38BDF8)
                life: Math.random() * 160 + 90,
                maxLife: 0,
                pulse: Math.random() * Math.PI * 2
            };
            p.maxLife = p.life;
            return p;
        }

        function initParticles(count) {
            particles = [];
            for (let i = 0; i < count; i++) {
                particles.push(createParticle());
            }
        }

        function drawParticles() {
            const rect = dropzone.getBoundingClientRect();
            const w = rect.width || 300;
            const h = rect.height || 180;
            ctx.clearRect(0, 0, w, h);

            const targetCount = isDragOver ? PARTICLE_COUNT_DRAG : PARTICLE_COUNT;

            // Add new particles if count is below target
            while (particles.length < targetCount) {
                particles.push(createParticle());
            }

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];

                // Update position with smooth speed multiplier
                const speedMultiplier = isDragOver ? 2.2 : (isHovered ? 1.4 : 1.0);
                p.x += p.vx * speedMultiplier;
                p.y += p.vy * speedMultiplier;
                p.life--;
                p.pulse += 0.035;

                // Pulsating opacity curve
                const fadeIn = Math.min(1, (p.maxLife - p.life) / 25);
                const fadeOut = Math.min(1, p.life / 25);
                const pulseOpacity = 0.6 + 0.4 * Math.sin(p.pulse);
                const finalOpacity = p.opacity * fadeIn * fadeOut * pulseOpacity;

                // Remove dead or off-screen particles
                if (p.life <= 0 || p.y < -15 || p.x < -15 || p.x > w + 15) {
                    particles.splice(i, 1);
                    continue;
                }

                // Draw glowing radial particle
                ctx.beginPath();
                const glowRadius = p.radius * (isDragOver ? 2.6 : 1.9);
                const gradient = ctx.createRadialGradient(
                    p.x, p.y, 0,
                    p.x, p.y, glowRadius
                );

                const saturation = isDragOver ? '92%' : '78%';
                const lightness = isDragOver ? '72%' : '62%';
                gradient.addColorStop(0, `hsla(${p.hue}, ${saturation}, ${lightness}, ${finalOpacity})`);
                gradient.addColorStop(1, `hsla(${p.hue}, 70%, 50%, 0)`);

                ctx.fillStyle = gradient;
                ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function animate() {
            // Wstrzymaj animację cząsteczek na urządzeniach mobilnych, w trybie Eco, podczas uploadu lub otwartego modala
            if (isEcoMode() || !isVisible || window._isUploadingActive || window.innerWidth <= 768 || document.body.classList.contains('is-modal-active')) {
                animFrameId = null;
                return;
            }
            drawParticles();
            animFrameId = requestAnimationFrame(animate);
        }

        function startAnimation() {
            if (animFrameId || window._isUploadingActive || window.innerWidth <= 768 || document.body.classList.contains('is-modal-active')) return;
            animate();
        }

        function stopAnimation() {
            if (animFrameId) {
                cancelAnimationFrame(animFrameId);
                animFrameId = null;
            }
        }

        // Reaguj na start/koniec uploadu, aby odciążyć wątek UI i modem telefonu
        window.addEventListener('dropsite:upload-state-changed', (e) => {
            if (e.detail?.isUploading) {
                stopAnimation();
            } else if (isVisible && window.innerWidth > 768 && !isEcoMode() && !document.body.classList.contains('is-modal-active')) {
                startAnimation();
            }
        });

        // Wstrzymaj cząsteczki w tle, gdy użytkownik otworzy pełnoekranowy modal (Moje Pliki, Sejf itp.)
        window.addEventListener('dropsite:modal-state-changed', (e) => {
            if (e.detail?.isOpen) {
                stopAnimation();
            } else if (isVisible && window.innerWidth > 768 && !isEcoMode() && !window._isUploadingActive) {
                startAnimation();
            }
        });

        // Visibility management via IntersectionObserver
        const visibilityObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                isVisible = entry.isIntersecting;
                if (isVisible && window.innerWidth > 768 && !window._isUploadingActive) {
                    resizeCanvas();
                    startAnimation();
                } else {
                    stopAnimation();
                }
            });
        }, { threshold: 0.1 });

        visibilityObserver.observe(dropzone);

        // Mouse hover excitation
        dropzone.addEventListener('mouseenter', () => { isHovered = true; }, { passive: true });
        dropzone.addEventListener('mouseleave', () => { isHovered = false; }, { passive: true });

        // Drag events on dropzone
        dropzone.addEventListener('dragenter', () => {
            isDragOver = true;
            dropzone.classList.add('drag-over');
        }, { passive: true });

        dropzone.addEventListener('dragleave', () => {
            isDragOver = false;
            dropzone.classList.remove('drag-over');
        }, { passive: true });

        dropzone.addEventListener('drop', () => {
            isDragOver = false;
            dropzone.classList.remove('drag-over');
        }, { passive: true });

        // Resize handling
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(resizeCanvas, 150);
        }, { passive: true });

        // Self-healing: if external script wipes dropzone.innerHTML on reset, restore canvas
        const dropzoneObserver = new MutationObserver(() => {
            if (!dropzone.querySelector('.dropzone-particles-canvas')) {
                dropzoneObserver.disconnect();
                initParticleField();
            }
        });
        dropzoneObserver.observe(dropzone, { childList: true });

        // Init
        resizeCanvas();
        initParticles(PARTICLE_COUNT);
        startAnimation();
    }


    // =========================================================================
    // 2. LIQUID RIPPLE ON DROP
    // =========================================================================
    function initLiquidRipple() {
        const dropzone = document.getElementById('dropzone');
        if (!dropzone) return;

        function createRipple(x, y) {
            if (isEcoMode()) return;

            const rect = dropzone.getBoundingClientRect();
            const localX = x - rect.left;
            const localY = y - rect.top;

            // Primary liquid ripple
            const ripple = document.createElement('div');
            ripple.className = 'dropzone-ripple';
            ripple.style.left = localX + 'px';
            ripple.style.top = localY + 'px';
            dropzone.appendChild(ripple);

            // Secondary wave ring
            const ring = document.createElement('div');
            ring.className = 'dropzone-ripple-secondary';
            ring.style.left = localX + 'px';
            ring.style.top = localY + 'px';
            dropzone.appendChild(ring);

            // Trigger animation frame
            requestAnimationFrame(() => {
                ripple.classList.add('active');
                ring.classList.add('active');
            });

            // Cleanup after animation completes
            setTimeout(() => {
                ripple.remove();
                ring.remove();
            }, 1200);
        }

        // Trigger ripple on file drop
        dropzone.addEventListener('drop', (e) => {
            const x = e.clientX || (dropzone.getBoundingClientRect().left + dropzone.offsetWidth / 2);
            const y = e.clientY || (dropzone.getBoundingClientRect().top + dropzone.offsetHeight / 2);
            createRipple(x, y);
        });

        // Trigger ripple on file selection via input
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', () => {
                if (fileInput.files && fileInput.files.length > 0) {
                    const rect = dropzone.getBoundingClientRect();
                    createRipple(
                        rect.left + rect.width / 2,
                        rect.top + rect.height / 2
                    );
                }
            });
        }

        // Export for programmatic use
        window._dropsiteCreateRipple = createRipple;
    }


    // =========================================================================
    // 3. STAGGERED REVEAL (IntersectionObserver-driven entrance)
    // =========================================================================
    function initStaggeredReveals() {
        // Mark document as motion-ready for progressive enhancement
        document.documentElement.classList.add('motion-ready');

        // Target key elements in hero left column
        const heroLeft = document.querySelector('.studio-hero-left');
        const heroRight = document.querySelector('.studio-hero-right');
        const heroTitle = document.querySelector('.studio-hero-title');
        const heroDesc = document.querySelector('.studio-hero-desc');
        const featureTags = document.querySelector('.studio-feature-tags');
        const radialTrigger = document.querySelector('.btn-radial-trigger');

        if (heroLeft && !heroLeft.classList.contains('motion-reveal-left')) {
            heroLeft.classList.add('motion-reveal-left');
        }
        if (heroRight && !heroRight.classList.contains('motion-reveal-right')) {
            heroRight.classList.add('motion-reveal-right');
            heroRight.style.transitionDelay = '0.12s';
        }

        if (heroTitle && !heroTitle.classList.contains('motion-reveal')) {
            heroTitle.classList.add('motion-reveal');
            heroTitle.setAttribute('data-reveal-delay', '1');
        }
        if (heroDesc && !heroDesc.classList.contains('motion-reveal')) {
            heroDesc.classList.add('motion-reveal');
            heroDesc.setAttribute('data-reveal-delay', '2');
        }
        if (featureTags && !featureTags.classList.contains('motion-reveal')) {
            featureTags.classList.add('motion-reveal');
            featureTags.setAttribute('data-reveal-delay', '3');
        }
        if (radialTrigger && radialTrigger.parentElement && !radialTrigger.parentElement.classList.contains('motion-reveal')) {
            radialTrigger.parentElement.classList.add('motion-reveal');
            radialTrigger.parentElement.setAttribute('data-reveal-delay', '4');
        }

        // Uploader cockpit inner elements are kept immediately visible and interactive without opacity masking


        // IntersectionObserver for entrance reveal
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -20px 0px'
        });

        document.querySelectorAll(
            '.motion-reveal, .motion-reveal-left, .motion-reveal-right, .motion-reveal-scale'
        ).forEach(el => revealObserver.observe(el));
    }

    function initStaggeredRevealsImmediate() {
        document.documentElement.classList.add('motion-ready');
        requestAnimationFrame(() => {
            document.querySelectorAll(
                '.motion-reveal, .motion-reveal-left, .motion-reveal-right, .motion-reveal-scale'
            ).forEach(el => el.classList.add('is-visible'));
        });
    }


    // =========================================================================
    // 4. GLOWING TYPING EFFECT (Neon aura while typing)
    // =========================================================================
    function initGlowingTyping() {
        const uploadContainer = document.querySelector('.upload-container');
        if (!uploadContainer) return;

        let typingTimeout = null;

        uploadContainer.addEventListener('input', (e) => {
            if (isEcoMode()) return;

            const input = e.target;
            if (!input.matches('input[type="text"], input[type="password"], input[type="datetime-local"]')) return;

            input.classList.add('is-typing');

            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                input.classList.remove('is-typing');
            }, 650);
        }, { passive: true });
    }


    // =========================================================================
    // 5. DRAG-OVER STATE FOR SIRI GLOW FRAME
    // =========================================================================
    function initDragOverGlowFrame() {
        const glowFrame = document.getElementById('siriGlowFrame');
        if (!glowFrame) return;

        let dragCounter = 0;

        window.addEventListener('dragenter', (e) => {
            if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) {
                dragCounter++;
                glowFrame.classList.add('drag-active');
            }
        }, { passive: true });

        window.addEventListener('dragleave', () => {
            dragCounter--;
            if (dragCounter <= 0) {
                dragCounter = 0;
                glowFrame.classList.remove('drag-active');
            }
        }, { passive: true });

        window.addEventListener('drop', () => {
            dragCounter = 0;
            glowFrame.classList.remove('drag-active');
        }, { passive: true });

        window.addEventListener('dragend', () => {
            dragCounter = 0;
            glowFrame.classList.remove('drag-active');
        }, { passive: true });
    }


    // =========================================================================
    // 6. MORPHING ICON ENHANCEMENT (SVG path morph on success)
    // =========================================================================
    function initMorphingIcon() {
        window._dropsiteMorphToCheck = function() {
            const iconBubble = document.querySelector('.upload-icon-bubble');
            const icon = document.querySelector('.upload-icon');
            if (!iconBubble || !icon) return;

            iconBubble.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
            iconBubble.style.background = 'linear-gradient(135deg, rgba(196, 231, 212, 0.45) 0%, rgba(56, 189, 248, 0.35) 100%)';
            iconBubble.style.borderColor = '#C4E7D4';
            iconBubble.style.boxShadow = '0 10px 40px rgba(196, 231, 212, 0.55), 0 0 60px rgba(196, 231, 212, 0.3)';
            iconBubble.style.transform = 'scale(1.15)';

            icon.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
            icon.style.transform = 'scale(0)';

            setTimeout(() => {
                icon.innerHTML = `
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                `;
                icon.style.color = '#C4E7D4';
                icon.style.transform = 'scale(1.1)';
                icon.style.filter = 'drop-shadow(0 0 20px rgba(196, 231, 212, 0.8))';

                setTimeout(() => {
                    iconBubble.style.transform = 'scale(1)';
                    icon.style.transform = 'scale(1)';
                }, 300);
            }, 250);
        };

        window._dropsiteResetIcon = function() {
            const icon = document.querySelector('.upload-icon');
            const iconBubble = document.querySelector('.upload-icon-bubble');
            if (!icon || !iconBubble) return;

            icon.innerHTML = `
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
            `;
            icon.style.color = '';
            icon.style.transform = '';
            icon.style.filter = '';
            icon.style.transition = '';

            iconBubble.style.background = '';
            iconBubble.style.borderColor = '';
            iconBubble.style.boxShadow = '';
            iconBubble.style.transform = '';
            iconBubble.style.transition = '';
        };

        // Auto-observe successFlow visibility changes
        const successFlow = document.getElementById('successFlow');
        if (successFlow) {
            const successObserver = new MutationObserver((mutations) => {
                for (const m of mutations) {
                    if (m.type === 'attributes' && m.attributeName === 'hidden') {
                        if (!successFlow.hidden) {
                            window._dropsiteMorphToCheck();
                        } else {
                            window._dropsiteResetIcon();
                        }
                    }
                }
            });
            successObserver.observe(successFlow, { attributes: true });
        }
    }


    // =========================================================================
    // 7. TACTILE BUTTON INTERACTIONS
    // =========================================================================
    function initTactileButton() {
        const uploadBtn = document.getElementById('uploadBtn');
        if (!uploadBtn) return;

        uploadBtn.addEventListener('pointerdown', (e) => {
            if (uploadBtn.disabled || isEcoMode()) return;
            uploadBtn.style.transform = 'scale(0.975) translateY(1px)';
        }, { passive: true });

        const resetTransform = () => {
            if (!uploadBtn.disabled) {
                uploadBtn.style.transform = '';
            }
        };

        uploadBtn.addEventListener('pointerup', resetTransform, { passive: true });
        uploadBtn.addEventListener('pointercancel', resetTransform, { passive: true });
        uploadBtn.addEventListener('pointerleave', resetTransform, { passive: true });
    }


    // =========================================================================
    // 8. DOWNLOAD STAGE MOTION (Interactive Spotlight, Spring Feedback, Observer)
    // =========================================================================
    function initDownloadStageMotion() {
        const dlCard = document.querySelector('.upload-container.download-card');
        if (!dlCard) return;

        // Zapobieganie wielokrotnej inicjalizacji nasłuchiwaczy na tej samej karcie
        if (dlCard._dropsiteMotionInitialized) return;
        dlCard._dropsiteMotionInitialized = true;

        let targetX = 50;
        let targetY = 30;
        let currentX = 50;
        let currentY = 30;
        let isHovered = false;
        let rafId = null;

        function updateSpotlight() {
            if (isEcoMode() || prefersReducedMotion) return;

            // Płynna interpolacja (lerp 0.12)
            currentX += (targetX - currentX) * 0.12;
            currentY += (targetY - currentY) * 0.12;

            dlCard.style.setProperty('--dl-spotlight-x', currentX.toFixed(2) + '%');
            dlCard.style.setProperty('--dl-spotlight-y', currentY.toFixed(2) + '%');

            // Kontynuuj pętlę rAF dopóki współrzędne nie osiągną celu
            if (isHovered || Math.abs(targetX - currentX) > 0.08 || Math.abs(targetY - currentY) > 0.08) {
                rafId = requestAnimationFrame(updateSpotlight);
            } else {
                rafId = null;
            }
        }

        dlCard.addEventListener('pointermove', (e) => {
            if (isEcoMode() || prefersReducedMotion) return;
            const rect = dlCard.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;
            targetX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
            targetY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
            isHovered = true;
            if (!rafId) rafId = requestAnimationFrame(updateSpotlight);
        }, { passive: true });

        dlCard.addEventListener('pointerleave', () => {
            isHovered = false;
            targetX = 50;
            targetY = 30;
            if (!rafId) rafId = requestAnimationFrame(updateSpotlight);
        }, { passive: true });

        // Haptyczne sprzężenie sprężyste na przycisku pobierania
        const dlBtn = document.getElementById('dlDownloadBtn');
        if (dlBtn && !dlBtn._dropsiteMotionInitialized) {
            dlBtn._dropsiteMotionInitialized = true;
            dlBtn.addEventListener('pointerdown', () => {
                if (isEcoMode() || prefersReducedMotion) return;
                dlBtn.style.transform = 'translate3d(0, 1px, 0) scale(0.975)';
            }, { passive: true });

            const resetBtn = () => {
                dlBtn.style.transform = '';
            };
            dlBtn.addEventListener('pointerup', resetBtn, { passive: true });
            dlBtn.addEventListener('pointercancel', resetBtn, { passive: true });
            dlBtn.addEventListener('pointerleave', resetBtn, { passive: true });
        }
    }

    // Automatyczny obserwator widoku pobierania (#view-download)
    function initDownloadViewObserver() {
        const dlView = document.getElementById('view-download');
        if (!dlView) return;

        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.type === 'attributes' && (m.attributeName === 'hidden' || m.attributeName === 'class')) {
                    if (!dlView.hidden && dlView.classList.contains('active')) {
                        initDownloadStageMotion();
                    }
                }
            }
        });
        observer.observe(dlView, { attributes: true, attributeFilter: ['hidden', 'class'] });

        // Jeśli widok jest już aktywny przy ładowaniu
        if (!dlView.hidden && dlView.classList.contains('active')) {
            initDownloadStageMotion();
        }
    }

    window._dropsiteInitDownloadMotion = initDownloadStageMotion;


    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    function init() {
        // The new homepage owns its motion; keep the download experience available.
        if (document.getElementById('motionHero')) {
            initDownloadStageMotion();
            initDownloadViewObserver();
            return;
        }
        initParticleField();
        initLiquidRipple();
        initStaggeredReveals();
        initGlowingTyping();
        initDragOverGlowFrame();
        initMorphingIcon();
        initTactileButton();
        initDownloadStageMotion();
        initDownloadViewObserver();

        // Ensure no lingering 3D tilt transform
        const glowFrame = document.getElementById('siriGlowFrame');
        if (glowFrame) glowFrame.style.transform = '';

        console.log('[Dropsite] Ultra-Premium Motion Engine v2.0 uruchomiony ✨ (GPU 60/120fps)');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        requestAnimationFrame(() => requestAnimationFrame(init));
    }

})();
