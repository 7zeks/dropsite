/**
 * Dropsite Audio Waveform Player (Studio Hi-Fi)
 * Real-time audio decoding and waveform rendering in RAM via Web Audio API.
 * Brand Guidelines: Zero emoji, pure SVG inline, Cyber Mint & Obsidian Glass.
 */

(function () {
    'use strict';

    let audioCtx = null;

    function getAudioContext() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                audioCtx = new AudioContextClass();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    // Formatowanie sekund do formatu MM:SS
    function formatTime(secs) {
        if (isNaN(secs) || secs < 0) return '00:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }

    /**
     * Główny generator odtwarzacza Audio z Falą Dźwiękową
     * @param {HTMLElement} targetEl - Element nadrzędny, w którym renderujemy odtwarzacz
     * @param {File|Blob|string} source - Źródło pliku (obiekt File lub URL do pobrania)
     * @param {string} fileName - Nazwa pliku do wyświetlenia
     * @param {number|string} fileSize - Rozmiar pliku
     */
    async function renderAudioWaveformPlayer(targetEl, source, fileName = 'Utwór Audio', fileSize = '') {
        if (!targetEl) return null;

        targetEl.innerHTML = `
            <div class="audio-waveform-card" id="audioWaveformCard">
                <div class="audio-waveform-header">
                    <div class="audio-waveform-meta">
                        <div class="audio-waveform-icon-wrap">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M9 18V5l12-2v13"></path>
                                <circle cx="6" cy="18" r="3"></circle>
                                <circle cx="18" cy="16" r="3"></circle>
                            </svg>
                        </div>
                        <div class="audio-waveform-title-wrap">
                            <h3 class="audio-waveform-title" title="${escapeHtml(fileName)}">${escapeHtml(fileName)}</h3>
                            <div class="audio-waveform-badge">
                                <span>Hi-Fi Audio</span> • ${fileSize ? escapeHtml(fileSize) : 'W pamięci RAM'}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="audio-waveform-stage" id="waveformStage">
                    <canvas class="audio-waveform-canvas" id="waveformCanvas"></canvas>
                    <div class="audio-waveform-hover-time" id="waveformHoverTime">00:00</div>
                    <div class="audio-waveform-loading" id="waveformLoading">
                        <div class="audio-waveform-spinner"></div>
                        <span>Generowanie fali w RAM...</span>
                    </div>
                </div>

                <div class="audio-waveform-controls">
                    <div class="audio-waveform-left-controls">
                        <button type="button" class="audio-waveform-play-btn" id="btnWaveformPlay" aria-label="Odtwórz">
                            <svg id="wavePlayIcon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 4l15 8-15 8V4z"></path>
                            </svg>
                            <svg id="wavePauseIcon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="display: none;">
                                <rect x="6" y="4" width="4" height="16" rx="1"></rect>
                                <rect x="14" y="4" width="4" height="16" rx="1"></rect>
                            </svg>
                        </button>
                        <div class="audio-waveform-time">
                            <span class="current" id="waveformCurrentTime">00:00</span> / <span id="waveformTotalTime">00:00</span>
                        </div>
                    </div>

                    <div class="audio-waveform-right-controls">
                        <button type="button" class="audio-waveform-btn-icon" id="btnWaveformLoop" title="Zapętl utwór">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="17 1 21 5 17 9"></polyline>
                                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                                <polyline points="7 23 3 19 7 15"></polyline>
                                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                            </svg>
                        </button>
                        <button type="button" class="audio-waveform-btn-icon" id="btnWaveformMute" title="Wycisz dźwięk">
                            <svg id="waveMuteOffIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                            </svg>
                            <svg id="waveMuteOnIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                <line x1="23" y1="9" x2="17" y2="15"></line>
                                <line x1="17" y1="9" x2="23" y2="15"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;

        const canvas = targetEl.querySelector('#waveformCanvas');
        const stage = targetEl.querySelector('#waveformStage');
        const loading = targetEl.querySelector('#waveformLoading');
        const playBtn = targetEl.querySelector('#btnWaveformPlay');
        const playIcon = targetEl.querySelector('#wavePlayIcon');
        const pauseIcon = targetEl.querySelector('#wavePauseIcon');
        const currentEl = targetEl.querySelector('#waveformCurrentTime');
        const totalEl = targetEl.querySelector('#waveformTotalTime');
        const loopBtn = targetEl.querySelector('#btnWaveformLoop');
        const muteBtn = targetEl.querySelector('#btnWaveformMute');
        const muteOffIcon = targetEl.querySelector('#waveMuteOffIcon');
        const muteOnIcon = targetEl.querySelector('#waveMuteOnIcon');
        const hoverTime = targetEl.querySelector('#waveformHoverTime');

        // Audio HTML element dla odtwarzania
        const audio = new Audio();
        let audioUrl = '';
        if (typeof source === 'string') {
            audioUrl = source;
            audio.src = source;
        } else if (source instanceof Blob || source instanceof File) {
            audioUrl = URL.createObjectURL(source);
            audio.src = audioUrl;
        }

        let peaks = [];
        const BARS_COUNT = 90;
        let isSeeking = false;

        // Pobranie bufora danych do analizy fali
        async function loadAndDecode() {
            try {
                let arrayBuf;
                if (source instanceof ArrayBuffer) {
                    arrayBuf = source;
                } else if (source instanceof Blob || source instanceof File) {
                    arrayBuf = await source.arrayBuffer();
                } else if (typeof source === 'string') {
                    const resp = await fetch(source);
                    arrayBuf = await resp.arrayBuffer();
                }

                const ctx = getAudioContext();
                if (!ctx || !arrayBuf) {
                    fallbackPeaks();
                    return;
                }

                // Bezpieczne klonowanie bufora przed dekodowaniem
                const copyBuf = arrayBuf.slice(0);
                const audioBuffer = await ctx.decodeAudioData(copyBuf);

                peaks = extractPeaks(audioBuffer, BARS_COUNT);
                if (totalEl) totalEl.textContent = formatTime(audioBuffer.duration);
            } catch (err) {
                console.warn('[AudioWaveform] Fallback fali:', err);
                fallbackPeaks();
            } finally {
                if (loading) loading.style.display = 'none';
                drawWaveform();
            }
        }

        function extractPeaks(buffer, count) {
            const channelData = buffer.getChannelData(0);
            const step = Math.floor(channelData.length / count);
            const res = [];
            for (let i = 0; i < count; i++) {
                let max = 0;
                const start = i * step;
                for (let j = 0; j < step; j += 6) {
                    const val = Math.abs(channelData[start + j] || 0);
                    if (val > max) max = val;
                }
                res.push(Math.max(0.08, Math.min(1, max * 1.6)));
            }
            return res;
        }

        function fallbackPeaks() {
            peaks = [];
            for (let i = 0; i < BARS_COUNT; i++) {
                const wave = Math.sin(i / 5) * 0.4 + 0.5;
                peaks.push(Math.max(0.12, Math.min(0.9, wave + (Math.random() * 0.2 - 0.1))));
            }
            if (loading) loading.style.display = 'none';
        }

        function drawWaveform() {
            if (!canvas) return;
            const dpr = window.devicePixelRatio || 1;
            const w = stage.clientWidth;
            const h = stage.clientHeight;

            canvas.width = w * dpr;
            canvas.height = h * dpr;

            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);
            ctx.clearRect(0, 0, w, h);

            const progress = (audio.duration && audio.duration > 0) ? (audio.currentTime / audio.duration) : 0;
            const barSpacing = w / peaks.length;
            const barWidth = Math.max(2, barSpacing - 2.5);

            for (let i = 0; i < peaks.length; i++) {
                const x = i * barSpacing;
                const barHeight = Math.max(6, peaks[i] * (h - 16));
                const y = (h - barHeight) / 2;

                const isPlayed = (i / peaks.length) <= progress;

                if (isPlayed) {
                    const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
                    grad.addColorStop(0, '#34D399');
                    grad.addColorStop(1, '#059669');
                    ctx.fillStyle = grad;
                } else {
                    ctx.fillStyle = 'rgba(148, 163, 184, 0.28)';
                }

                // Rysowanie zaokrąglonego słupka
                roundRect(ctx, x, y, barWidth, barHeight, 2);
            }
        }

        function roundRect(ctx, x, y, width, height, radius) {
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
            ctx.fill();
        }

        // Interakcja ze sceną (Scrubbing / Seeking)
        function seekFromEvent(e) {
            const rect = stage.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const ratio = Math.max(0, Math.min(1, clickX / rect.width));
            if (audio.duration) {
                audio.currentTime = ratio * audio.duration;
                drawWaveform();
                if (currentEl) currentEl.textContent = formatTime(audio.currentTime);
            }
        }

        stage.addEventListener('click', (e) => {
            getAudioContext();
            seekFromEvent(e);
        });

        stage.addEventListener('mousemove', (e) => {
            const rect = stage.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const ratio = Math.max(0, Math.min(1, clickX / rect.width));
            if (audio.duration && hoverTime) {
                hoverTime.style.display = 'block';
                hoverTime.style.left = `${clickX}px`;
                hoverTime.textContent = formatTime(ratio * audio.duration);
            }
        });

        stage.addEventListener('mouseleave', () => {
            if (hoverTime) hoverTime.style.display = 'none';
        });

        // Kontrolki Play / Pause
        function togglePlay() {
            getAudioContext();
            if (audio.paused) {
                audio.play().then(() => {
                    if (playIcon) playIcon.style.display = 'none';
                    if (pauseIcon) pauseIcon.style.display = 'block';
                }).catch(() => {});
            } else {
                audio.pause();
                if (playIcon) playIcon.style.display = 'block';
                if (pauseIcon) pauseIcon.style.display = 'none';
            }
        }

        if (playBtn) playBtn.addEventListener('click', togglePlay);

        // Zapętlenie
        if (loopBtn) {
            loopBtn.addEventListener('click', () => {
                audio.loop = !audio.loop;
                loopBtn.classList.toggle('active', audio.loop);
            });
        }

        // Wyciszenie
        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                audio.muted = !audio.muted;
                if (muteOffIcon) muteOffIcon.style.display = audio.muted ? 'none' : 'block';
                if (muteOnIcon) muteOnIcon.style.display = audio.muted ? 'block' : 'none';
                muteBtn.classList.toggle('active', audio.muted);
            });
        }

        // Aktualizacja czasu i rysowanie
        audio.addEventListener('timeupdate', () => {
            if (!isSeeking) {
                drawWaveform();
                if (currentEl) currentEl.textContent = formatTime(audio.currentTime);
            }
        });

        audio.addEventListener('loadedmetadata', () => {
            if (totalEl) totalEl.textContent = formatTime(audio.duration);
            drawWaveform();
        });

        audio.addEventListener('ended', () => {
            if (!audio.loop) {
                if (playIcon) playIcon.style.display = 'block';
                if (pauseIcon) pauseIcon.style.display = 'none';
            }
        });

        window.addEventListener('resize', drawWaveform);

        // Start dekodowania fali
        loadAndDecode();

        return {
            audio: audio,
            cleanup: function () {
                audio.pause();
                audio.src = '';
                if (audioUrl && audioUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(audioUrl);
                }
                window.removeEventListener('resize', drawWaveform);
            }
        };
    }

    function escapeHtml(str) {
        return (str || '').replace(/[&<>"']/g, function (m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[m];
        });
    }

    // Globalna funkcja
    window.renderAudioWaveformPlayer = renderAudioWaveformPlayer;

    // Automatyczny nasłuch na pliki audio w widoku pobierania
    function checkAndMountAudioPlayer() {
        const audioExtRegex = /\.(mp3|wav|aac|flac|ogg|m4a)$/i;

        const dlContainer = document.getElementById('dlPreviewContainer');
        if (!dlContainer || dlContainer.querySelector('.audio-waveform-card')) return;

        let fileKey = window._lastUploadedFileKey;
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('f')) fileKey = urlParams.get('f');

        if (fileKey && audioExtRegex.test(fileKey)) {
            const cleanName = fileKey.split('/').pop() || fileKey;
            const directUrl = `https://pub-db4c47e6a54d440a9120992639865dd0.r2.dev/${fileKey}`;

            renderAudioWaveformPlayer(dlContainer, directUrl, cleanName);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(checkAndMountAudioPlayer, 600);
    });

})();
