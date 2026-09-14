/**
 * Dropsite Beam - Silnik Nielimitowanego Transferu P2P (WebRTC RTCDataChannel)
 * 100% Client-Side • 0 zł kosztów serwera • Bezpośredni strumień RAM do RAM
 */

class DropsiteBeamEngine {
    constructor() {
        this.workerUrl = typeof WORKER_URL !== 'undefined' ? WORKER_URL : 'https://uploud-api.dropsite33.workers.dev';
        this.rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };
        this.pc = null;
        this.dataChannel = null;
        this.pollInterval = null;
        this.activePin = null;
        this.activeRole = null;
        this.isTransferring = false;
        this.chunkSize = 64 * 1024; // 64 KB na pakiet WebRTC
        this.bufferedThreshold = 4 * 1024 * 1024; // 4 MB flow control
    }

    /**
     * Zamyka i czyści wszystkie aktywne połączenia i interwały
     */
    reset() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        if (this.dataChannel) {
            try { this.dataChannel.close(); } catch (_) {}
            this.dataChannel = null;
        }
        if (this.pc) {
            try { this.pc.close(); } catch (_) {}
            this.pc = null;
        }
        if (this.activePin && this.activeRole === 'sender') {
            fetch(`${this.workerUrl}/api/beam/session?pin=${this.activePin}`, { method: 'DELETE' }).catch(() => {});
        }
        this.activePin = null;
        this.activeRole = null;
        this.isTransferring = false;
    }

    /**
     * TRYB NADAWCY: Tworzy sesję, nasłuchuje odbiorcy i wysyła plik P2P
     */
    async startSender(file, callbacks = {}) {
        this.reset();
        this.activeRole = 'sender';

        const onStatus = callbacks.onStatus || (() => {});
        const onProgress = callbacks.onProgress || (() => {});
        const onComplete = callbacks.onComplete || (() => {});
        const onError = callbacks.onError || console.error;

        onStatus('initiating', 'Tworzenie bezpiecznej sesji Beam...');

        try {
            // 1. Rejestracja sesji w Cloudflare Worker
            const sessionRes = await fetch(`${this.workerUrl}/api/beam/session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.type || 'application/octet-stream'
                })
            });
            const sessionData = await sessionRes.json();
            if (!sessionData.success || !sessionData.pin) {
                throw new Error(sessionData.message || 'Nie udało się zainicjować sesji Beam.');
            }

            this.activePin = sessionData.pin;
            const pin = sessionData.pin;
            const beamUrl = `${window.location.origin}${window.location.pathname}?beam=${pin}`;

            if (callbacks.onSessionReady) {
                callbacks.onSessionReady({ pin, beamUrl, file });
            }

            onStatus('waiting', 'Radar aktywny — oczekiwanie na odbiorcę...');

            // 2. Inicjalizacja RTCPeerConnection
            this.pc = new RTCPeerConnection(this.rtcConfig);
            const iceCandidates = [];

            this.pc.onicecandidate = (event) => {
                if (event.candidate) {
                    iceCandidates.push(event.candidate);
                }
            };

            this.pc.oniceconnectionstatechange = () => {
                const state = this.pc.iceConnectionState;
                if (state === 'disconnected' || state === 'failed') {
                    onError('Połączenie P2P zostało przerwane.');
                }
            };

            // 3. Utworzenie DataChannel dla plików
            this.dataChannel = this.pc.createDataChannel('dropsite-beam-stream', { ordered: true });
            this.dataChannel.binaryType = 'arraybuffer';

            this.dataChannel.onopen = async () => {
                if (this.pollInterval) clearInterval(this.pollInterval);
                onStatus('connected', 'Nawiązano bezpośrednie połączenie P2P!');
                if (typeof playSound === 'function') playSound('success');
                this.sendFileStream(file, onProgress, onComplete, onError);
            };

            this.dataChannel.onerror = (err) => {
                onError('Błąd kanału danych: ' + (err.message || 'DataChannel error'));
            };

            // 4. Utworzenie i wysłanie SDP Offer
            const offer = await this.pc.createOffer();
            await this.pc.setLocalDescription(offer);

            // Poczekaj krótko na zebranie pierwszych kandydatów lokalnych
            await new Promise(r => setTimeout(r, 600));

            await fetch(`${this.workerUrl}/api/beam/signal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pin: pin,
                    role: 'sender',
                    type: 'offer',
                    data: this.pc.localDescription,
                    candidates: iceCandidates
                })
            });

            // 5. Odpytywanie (Polling) w oczekiwaniu na SDP Answer od odbiorcy
            let hasAnswer = false;
            this.pollInterval = setInterval(async () => {
                if (hasAnswer || !this.pc) return;
                try {
                    const pollRes = await fetch(`${this.workerUrl}/api/beam/signal`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ pin, role: 'sender', type: 'poll' })
                    });
                    const pollData = await pollRes.json();

                    if (pollData.receiverAnswer && !hasAnswer) {
                        hasAnswer = true;
                        onStatus('connecting', 'Odbiorca połączony — negocjacja kanału P2P...');
                        await this.pc.setRemoteDescription(new RTCSessionDescription(pollData.receiverAnswer));

                        if (Array.isArray(pollData.peerCandidates)) {
                            for (const c of pollData.peerCandidates) {
                                try { await this.pc.addIceCandidate(new RTCIceCandidate(c)); } catch (_) {}
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Beam polling warning:', e);
                }
            }, 900);

        } catch (err) {
            onError(err.message || 'Wystąpił błąd podczas uruchamiania Beam.');
        }
    }

    /**
     * Strumieniowanie pliku przez DataChannel z kontrolą bufora (Backpressure)
     */
    async sendFileStream(file, onProgress, onComplete, onError) {
        this.isTransferring = true;
        const totalSize = file.size;
        let offset = 0;
        let lastSpeedCheck = Date.now();
        let bytesSinceLastCheck = 0;
        let currentSpeed = 0;

        // Wyślij nagłówek JSON
        const header = {
            type: 'BEAM_HEADER',
            name: file.name,
            size: totalSize,
            mime: file.type || 'application/octet-stream'
        };
        this.dataChannel.send(JSON.stringify(header));

        const reader = new FileReader();

        const readNextChunk = () => {
            if (!this.isTransferring || !this.dataChannel) return;

            if (offset >= totalSize) {
                // Koniec pliku — wyślij znacznik ukończenia
                this.dataChannel.send(JSON.stringify({ type: 'BEAM_DONE' }));
                this.isTransferring = false;
                onComplete({ fileName: file.name, fileSize: totalSize });
                return;
            }

            // Kontrola bufora: jeśli bufor jest zbyt duży, czekaj na zdarzenie bufferedamountlow
            if (this.dataChannel.bufferedAmount > this.bufferedThreshold) {
                this.dataChannel.onbufferedamountlow = () => {
                    this.dataChannel.onbufferedamountlow = null;
                    readNextChunk();
                };
                return;
            }

            const slice = file.slice(offset, offset + this.chunkSize);
            reader.readAsArrayBuffer(slice);
        };

        reader.onload = (e) => {
            if (!this.dataChannel || this.dataChannel.readyState !== 'open') return;

            const chunk = e.target.result;
            this.dataChannel.send(chunk);
            offset += chunk.byteLength;
            bytesSinceLastCheck += chunk.byteLength;

            const now = Date.now();
            const elapsed = (now - lastSpeedCheck) / 1000;
            if (elapsed >= 0.5) {
                currentSpeed = bytesSinceLastCheck / elapsed; // B/s
                bytesSinceLastCheck = 0;
                lastSpeedCheck = now;
            }

            const percent = Math.min(100, (offset / totalSize) * 100);
            onProgress({
                percent,
                transferred: offset,
                total: totalSize,
                speedBytesSec: currentSpeed,
                speedMbSec: (currentSpeed / (1024 * 1024)).toFixed(1)
            });

            readNextChunk();
        };

        reader.onerror = (err) => {
            onError('Błąd odczytu pliku z dysku: ' + err);
        };

        // Uruchomienie pętli wysyłania
        readNextChunk();
    }

    /**
     * TRYB ODBIORCY: Dołącza do sesji po kodzie PIN i pobiera plik P2P
     */
    async startReceiver(pin, callbacks = {}) {
        this.reset();
        this.activeRole = 'receiver';
        this.activePin = pin;

        const onStatus = callbacks.onStatus || (() => {});
        const onProgress = callbacks.onProgress || (() => {});
        const onComplete = callbacks.onComplete || (() => {});
        const onError = callbacks.onError || console.error;

        onStatus('initiating', 'Wyszukiwanie sesji nadawcy...');

        try {
            // 1. Pobierz stan sesji z Cloudflare Worker
            const sessionRes = await fetch(`${this.workerUrl}/api/beam/session?pin=${encodeURIComponent(pin)}`);
            const sessionData = await sessionRes.json();

            if (!sessionData.success || !sessionData.session) {
                throw new Error(sessionData.message || 'Sesja Beam o podanym kodzie PIN nie istnieje lub wygasła.');
            }

            const session = sessionData.session;
            if (!session.senderOffer) {
                throw new Error('Nadawca jeszcze nie przygotował oferty. Spróbuj za chwilę.');
            }

            if (callbacks.onSessionFound) {
                callbacks.onSessionFound(session);
            }

            onStatus('connecting', 'Nawiązywanie bezpośredniego połączenia WebRTC...');

            // 2. Inicjalizacja RTCPeerConnection
            this.pc = new RTCPeerConnection(this.rtcConfig);
            const iceCandidates = [];

            this.pc.onicecandidate = (event) => {
                if (event.candidate) {
                    iceCandidates.push(event.candidate);
                }
            };

            let fileMeta = null;
            let receivedChunks = [];
            let receivedBytes = 0;
            let lastSpeedCheck = Date.now();
            let bytesSinceLastCheck = 0;
            let currentSpeed = 0;

            // 3. Obsługa DataChannel stworzonego przez nadawcę
            this.pc.ondatachannel = (event) => {
                this.dataChannel = event.channel;
                this.dataChannel.binaryType = 'arraybuffer';

                this.dataChannel.onopen = () => {
                    onStatus('transferring', 'Rozpoczęto bezpośrednią transmisję strumieniową...');
                    if (typeof playSound === 'function') playSound('success');
                };

                this.dataChannel.onmessage = (e) => {
                    if (typeof e.data === 'string') {
                        try {
                            const msg = JSON.parse(e.data);
                            if (msg.type === 'BEAM_HEADER') {
                                fileMeta = msg;
                                receivedChunks = [];
                                receivedBytes = 0;
                                if (callbacks.onFileHeader) callbacks.onFileHeader(fileMeta);
                            } else if (msg.type === 'BEAM_DONE') {
                                // Zakończenie transmisji — złożenie pliku z pamięci RAM
                                const blob = new Blob(receivedChunks, { type: fileMeta?.mime || 'application/octet-stream' });
                                const downloadUrl = URL.createObjectURL(blob);
                                if (typeof playSound === 'function') playSound('success');

                                onComplete({
                                    fileName: fileMeta?.name || 'pobrany_plik',
                                    fileSize: fileMeta?.size || receivedBytes,
                                    blob: blob,
                                    downloadUrl: downloadUrl
                                });
                            }
                        } catch (err) {
                            console.error('Błąd parsowania wiadomości Beam:', err);
                        }
                    } else if (e.data instanceof ArrayBuffer) {
                        receivedChunks.push(e.data);
                        receivedBytes += e.data.byteLength;
                        bytesSinceLastCheck += e.data.byteLength;

                        const now = Date.now();
                        const elapsed = (now - lastSpeedCheck) / 1000;
                        if (elapsed >= 0.5) {
                            currentSpeed = bytesSinceLastCheck / elapsed;
                            bytesSinceLastCheck = 0;
                            lastSpeedCheck = now;
                        }

                        const total = fileMeta?.size || receivedBytes;
                        const percent = total > 0 ? Math.min(100, (receivedBytes / total) * 100) : 50;

                        onProgress({
                            percent,
                            transferred: receivedBytes,
                            total: total,
                            speedBytesSec: currentSpeed,
                            speedMbSec: (currentSpeed / (1024 * 1024)).toFixed(1)
                        });
                    }
                };

                this.dataChannel.onerror = (err) => {
                    onError('Błąd kanału danych odbiorcy: ' + (err.message || 'DataChannel error'));
                };
            };

            // 4. Ustawienie remote description z Offer nadawcy
            await this.pc.setRemoteDescription(new RTCSessionDescription(session.senderOffer));

            if (Array.isArray(session.senderCandidates)) {
                for (const c of session.senderCandidates) {
                    try { await this.pc.addIceCandidate(new RTCIceCandidate(c)); } catch (_) {}
                }
            }

            // 5. Utworzenie i wysłanie SDP Answer
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);

            await new Promise(r => setTimeout(r, 400));

            await fetch(`${this.workerUrl}/api/beam/signal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pin: pin,
                    role: 'receiver',
                    type: 'answer',
                    data: this.pc.localDescription,
                    candidates: iceCandidates
                })
            });

        } catch (err) {
            onError(err.message || 'Nie udało się połączyć z nadawcą.');
        }
    }
}

window.DropsiteBeam = new DropsiteBeamEngine();
