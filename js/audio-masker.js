/**
 * ============================================================================
 * DROPSITE AUDIO SANITIZER & VOICE MASKER
 * ============================================================================
 * 100% Client-Side Web Audio API in RAM • Zero Server Leakage
 * Cleans audio metadata, real-time waveform visualizer, voice pitch & formant
 * scrambling for whistleblower / privacy protection, lossless WAV export in RAM.
 * ============================================================================
 */

(function () {
    'use strict';

    let audioCtx = null;
    let rawAudioBuffer = null;
    let currentSourceNode = null;
    let analyserNode = null;
    let gainNode = null;
    let filterNode = null;
    let distNode = null;

    let isPlaying = false;
    let playbackStartTime = 0;
    let pausedAt = 0;
    let animFrameId = null;

    const state = {
        activeFile: null,
        pitchSemitones: -4, // -12 do +12 (Domyślnie -4 dla obniżenia głosu świadka)
        formantCutoff: 1800, // 300Hz do 8000Hz
        distortionAmount: 15, // 0 do 100
        isFilterEnabled: true
    };

    function getAudioContext() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    /**
     * Krzywa zniekształcenia dla WaveShaper (Radio / Vocoder privacy)
     */
    function makeDistortionCurve(amount) {
        const k = typeof amount === 'number' ? amount : 50;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1;
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    /**
     * Odtwarzanie przetworzonego audio
     */
    function playAudio(startOffset = 0) {
        const ctx = getAudioContext();
        stopAudio(false);

        if (!rawAudioBuffer) return;

        currentSourceNode = ctx.createBufferSource();
        currentSourceNode.buffer = rawAudioBuffer;

        // 1. Modulacja wysokości tonu (Pitch shift)
        const rate = Math.pow(2, state.pitchSemitones / 12);
        currentSourceNode.playbackRate.value = rate;

        // 2. Filtr formantów (Maskowanie unikalnej barwy gardłowej)
        filterNode = ctx.createBiquadFilter();
        filterNode.type = 'lowpass';
        filterNode.frequency.value = state.formantCutoff;
        filterNode.Q.value = 3.5;

        // 3. Modulator szumu / zniekształcenia
        distNode = ctx.createWaveShaper();
        if (state.distortionAmount > 0) {
            distNode.curve = makeDistortionCurve(state.distortionAmount);
            distNode.oversample = '4x';
        }

        // 4. Analizator spektrum i oscyloskop
        analyserNode = ctx.createAnalyser();
        analyserNode.fftSize = 256;

        gainNode = ctx.createGain();
        gainNode.gain.value = 1.0;

        // Połączenie grafu: Source -> Filter -> Dist -> Gain -> Analyser -> Destination
        currentSourceNode.connect(filterNode);
        filterNode.connect(distNode);
        distNode.connect(gainNode);
        gainNode.connect(analyserNode);
        analyserNode.connect(ctx.destination);

        const offsetInSource = (startOffset * (1 / rate));
        currentSourceNode.start(0, Math.min(rawAudioBuffer.duration, offsetInSource));
        playbackStartTime = ctx.currentTime - startOffset;
        isPlaying = true;

        updatePlayButtonState(true);
        startVisualizerLoop();

        currentSourceNode.onended = () => {
            if (isPlaying && (ctx.currentTime - playbackStartTime) >= (rawAudioBuffer.duration / rate)) {
                stopAudio(true);
            }
        };
    }

    function stopAudio(resetPosition = false) {
        if (currentSourceNode) {
            try { currentSourceNode.stop(); } catch (_) {}
            currentSourceNode.disconnect();
            currentSourceNode = null;
        }
        if (resetPosition) {
            pausedAt = 0;
            const slider = document.getElementById('audioTimelineSlider');
            if (slider) slider.value = 0;
        } else if (audioCtx && isPlaying) {
            pausedAt = audioCtx.currentTime - playbackStartTime;
        }
        isPlaying = false;
        updatePlayButtonState(false);
    }

    function updatePlayButtonState(playing) {
        const btn = document.getElementById('audioBtnPlay');
        if (!btn) return;
        if (playing) {
            btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
        } else {
            btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        }
    }

    /**
     * Pętla rysowania spektrogramu i fali na żywo w Canvas
     */
    function startVisualizerLoop() {
        const canvas = document.getElementById('audioVisualizerCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        function draw() {
            if (!isPlaying || !analyserNode) {
                // Rysuj stan spoczynku
                drawIdleWaveform(ctx, canvas);
                return;
            }
            animFrameId = requestAnimationFrame(draw);

            const bufferLength = analyserNode.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyserNode.getByteTimeDomainData(dataArray);

            ctx.fillStyle = 'rgba(9, 14, 23, 0.35)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.lineWidth = 2;
            ctx.strokeStyle = '#34D399';
            ctx.shadowBlur = 8;
            ctx.shadowColor = 'rgba(52, 211, 153, 0.6)';

            ctx.beginPath();
            const sliceWidth = (canvas.width * 1.0) / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * canvas.height) / 2;

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);

                x += sliceWidth;
            }

            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();

            // Pasek czasu
            if (rawAudioBuffer && audioCtx) {
                const rate = Math.pow(2, state.pitchSemitones / 12);
                const curTime = (audioCtx.currentTime - playbackStartTime);
                const totalDur = rawAudioBuffer.duration / rate;
                const slider = document.getElementById('audioTimelineSlider');
                const curTimeEl = document.getElementById('audioTimeCurrent');
                if (slider && !slider.matches(':active')) {
                    slider.value = Math.min(100, (curTime / totalDur) * 100);
                }
                if (curTimeEl) curTimeEl.textContent = formatTime(curTime);
            }
        }

        draw();
    }

    function drawIdleWaveform(ctx, canvas) {
        ctx.fillStyle = '#090E17';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.25)';
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
    }

    /**
     * Konwersja przetworzonego AudioBuffer do czystego pliku WAV (PCM 16-bit) w RAM
     */
    async function exportSanitizedWav() {
        if (!rawAudioBuffer) return null;

        const rate = Math.pow(2, state.pitchSemitones / 12);
        const targetDuration = rawAudioBuffer.duration / rate;

        // Renderowanie offline przez OfflineAudioContext
        const offlineCtx = new OfflineAudioContext(
            rawAudioBuffer.numberOfChannels,
            Math.ceil(rawAudioBuffer.sampleRate * targetDuration),
            rawAudioBuffer.sampleRate
        );

        const src = offlineCtx.createBufferSource();
        src.buffer = rawAudioBuffer;
        src.playbackRate.value = rate;

        const flt = offlineCtx.createBiquadFilter();
        flt.type = 'lowpass';
        flt.frequency.value = state.formantCutoff;
        flt.Q.value = 3.5;

        const dst = offlineCtx.createWaveShaper();
        if (state.distortionAmount > 0) {
            dst.curve = makeDistortionCurve(state.distortionAmount);
            dst.oversample = '4x';
        }

        src.connect(flt);
        flt.connect(dst);
        dst.connect(offlineCtx.destination);
        src.start(0);

        const renderedBuffer = await offlineCtx.startRendering();
        return audioBufferToWav(renderedBuffer);
    }

    function audioBufferToWav(buffer) {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;

        let result;
        if (numChannels === 2) {
            result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
        } else {
            result = buffer.getChannelData(0);
        }

        return encodeWAV(result, format, sampleRate, numChannels, bitDepth);
    }

    function interleave(inputL, inputR) {
        const length = inputL.length + inputR.length;
        const result = new Float32Array(length);
        let index = 0;
        let inputIndex = 0;

        while (index < length) {
            result[index++] = inputL[inputIndex];
            result[index++] = inputR[inputIndex];
            inputIndex++;
        }
        return result;
    }

    function encodeWAV(samples, format, sampleRate, numChannels, bitDepth) {
        const bytesPerSample = bitDepth / 8;
        const blockAlign = numChannels * bytesPerSample;
        const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
        const view = new DataView(buffer);

        /* RIFF identifier */
        writeString(view, 0, 'RIFF');
        /* file length */
        view.setUint32(4, 36 + samples.length * bytesPerSample, true);
        /* RIFF type */
        writeString(view, 8, 'WAVE');
        /* format chunk identifier */
        writeString(view, 12, 'fmt ');
        /* format chunk length */
        view.setUint32(16, 16, true);
        /* sample format (raw) */
        view.setUint16(20, format, true);
        /* channel count */
        view.setUint16(22, numChannels, true);
        /* sample rate */
        view.setUint32(24, sampleRate, true);
        /* byte rate (sample rate * block align) */
        view.setUint32(28, sampleRate * blockAlign, true);
        /* block align (channel count * bytes per sample) */
        view.setUint16(32, blockAlign, true);
        /* bits per sample */
        view.setUint16(34, bitDepth, true);
        /* data chunk identifier */
        writeString(view, 36, 'data');
        /* data chunk length */
        view.setUint32(40, samples.length * bytesPerSample, true);

        floatTo16BitPCM(view, 44, samples);
        return new Blob([view], { type: 'audio/wav' });
    }

    function floatTo16BitPCM(output, offset, input) {
        for (let i = 0; i < input.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
    }

    function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    function formatTime(sec) {
        if (!sec || isNaN(sec)) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    function initAudioMaskerUI() {
        const dropzone = document.getElementById('audioDropzone');
        const fileInput = document.getElementById('audioFileInput');
        const deck = document.getElementById('audioStudioDeck');
        const btnPlay = document.getElementById('audioBtnPlay');
        const sliderTimeline = document.getElementById('audioTimelineSlider');
        const sliderPitch = document.getElementById('audioSliderPitch');
        const sliderFormant = document.getElementById('audioSliderFormant');
        const sliderDist = document.getElementById('audioSliderDist');
        const btnExport = document.getElementById('audioBtnExportWav');
        const btnSend = document.getElementById('audioBtnSendWav');

        if (dropzone && fileInput) {
            dropzone.addEventListener('click', () => fileInput.click());
            dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
            dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.classList.remove('drag-over');
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    loadAudioFile(e.dataTransfer.files[0]);
                }
            });
            fileInput.addEventListener('change', () => {
                if (fileInput.files && fileInput.files[0]) {
                    loadAudioFile(fileInput.files[0]);
                }
            });
        }

        async function loadAudioFile(file) {
            state.activeFile = file;
            if (deck) deck.classList.add('active');

            try {
                const ctx = getAudioContext();
                const arrayBuf = await file.arrayBuffer();
                rawAudioBuffer = await ctx.decodeAudioData(arrayBuf);

                const durEl = document.getElementById('audioTimeTotal');
                const nameEl = document.getElementById('audioTrackName');
                if (durEl) durEl.textContent = formatTime(rawAudioBuffer.duration);
                if (nameEl) nameEl.textContent = file.name;

                // Od razu odpal podgląd
                playAudio(0);
                if (window.showToast) window.showToast('Plik audio załadowany do pamięci RAM. Metadane oczyszczone.', 'success');
            } catch (err) {
                console.error('[Audio Error]', err);
                if (window.showToast) window.showToast('Nie udało się odczytać formatu audio.', 'error');
            }
        }

        // Play / Pause
        if (btnPlay) {
            btnPlay.addEventListener('click', () => {
                if (isPlaying) {
                    stopAudio(false);
                } else {
                    playAudio(pausedAt);
                }
            });
        }

        // Timeline Slider
        if (sliderTimeline) {
            sliderTimeline.addEventListener('input', () => {
                if (!rawAudioBuffer) return;
                const pct = sliderTimeline.value / 100;
                const rate = Math.pow(2, state.pitchSemitones / 12);
                const targetSec = (rawAudioBuffer.duration / rate) * pct;
                playAudio(targetSec);
            });
        }

        // Suwak Pitch
        if (sliderPitch) {
            sliderPitch.addEventListener('input', () => {
                state.pitchSemitones = parseInt(sliderPitch.value, 10);
                const valEl = document.getElementById('audioPitchVal');
                if (valEl) valEl.textContent = `${state.pitchSemitones > 0 ? '+' : ''}${state.pitchSemitones} st`;
                if (isPlaying) playAudio(audioCtx.currentTime - playbackStartTime);
            });
        }

        // Suwak Formant
        if (sliderFormant) {
            sliderFormant.addEventListener('input', () => {
                state.formantCutoff = parseInt(sliderFormant.value, 10);
                const valEl = document.getElementById('audioFormantVal');
                if (valEl) valEl.textContent = `${state.formantCutoff} Hz`;
                if (filterNode) filterNode.frequency.value = state.formantCutoff;
            });
        }

        // Suwak Zniekształcenia (Distortion)
        if (sliderDist) {
            sliderDist.addEventListener('input', () => {
                state.distortionAmount = parseInt(sliderDist.value, 10);
                const valEl = document.getElementById('audioDistVal');
                if (valEl) valEl.textContent = `${state.distortionAmount}%`;
                if (distNode) distNode.curve = makeDistortionCurve(state.distortionAmount);
            });
        }

        // Eksport czystego WAV
        if (btnExport) {
            btnExport.addEventListener('click', async () => {
                if (!rawAudioBuffer) return;
                btnExport.disabled = true;
                btnExport.textContent = 'Generowanie czystego WAV...';

                try {
                    const wavBlob = await exportSanitizedWav();
                    const url = URL.createObjectURL(wavBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    const baseName = state.activeFile ? state.activeFile.name.replace(/\.[^/.]+$/, '') : 'audio';
                    a.download = `${baseName}_masked.wav`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    setTimeout(() => URL.revokeObjectURL(url), 5000);
                    if (window.showToast) window.showToast('Wyeksportowano oczyszczony plik WAV (Zero-Knowledge).', 'success');
                } catch (err) {
                    console.error('[Export Error]', err);
                    if (window.showToast) window.showToast('Błąd eksportu pliku.', 'error');
                } finally {
                    btnExport.disabled = false;
                    btnExport.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Pobierz zanonimizowane audio`;
                }
            });
        }

        // Wyślij bezpośrednio przez Dropsite
        if (btnSend) {
            btnSend.addEventListener('click', async () => {
                if (!rawAudioBuffer) return;
                try {
                    const wavBlob = await exportSanitizedWav();
                    const baseName = state.activeFile ? state.activeFile.name.replace(/\.[^/.]+$/, '') : 'audio';
                    const targetFile = new File([wavBlob], `${baseName}_masked.wav`, { type: 'audio/wav' });

                    const navHome = document.querySelector('.nav-btn[data-target="view-glowna"]');
                    if (navHome) navHome.click();

                    setTimeout(() => {
                        if (typeof window.handleFilesSelectionDirectly === 'function') {
                            window.handleFilesSelectionDirectly([targetFile]);
                        } else {
                            const mainInput = document.getElementById('fileInput');
                            if (mainInput) {
                                const dt = new DataTransfer();
                                dt.items.add(targetFile);
                                mainInput.files = dt.files;
                                mainInput.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }
                    }, 200);
                } catch (err) {
                    console.error('[Send Error]', err);
                }
            });
        }
    }

    window.DropsiteAudioMasker = {
        init: initAudioMaskerUI
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAudioMaskerUI);
    } else {
        initAudioMaskerUI();
    }
})();
