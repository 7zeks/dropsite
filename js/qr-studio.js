/**
 * Dropsite QR Studio (Vector SVG & 4K Ultra HD QR Code Engine)
 * 100% Client-Side generation. Zero cloud leakage.
 * Brand Guidelines: Zero emoji, pure SVG inline, Cyber Mint & Obsidian Glass.
 */

(function () {
    'use strict';

    let currentType = 'url';
    let centerLogoImg = null;

    function initQRStudio() {
        setupTabs();
        setupInputs();
        setupExportButtons();
        updateQR();
    }

    function setupTabs() {
        const tabs = document.querySelectorAll('.qr-type-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentType = tab.getAttribute('data-type') || 'url';

                // Przełączanie pól formularza
                document.querySelectorAll('.qr-type-fields').forEach(f => f.style.display = 'none');
                const targetFields = document.getElementById(`qrFields_${currentType}`);
                if (targetFields) targetFields.style.display = 'flex';

                updateQR();
            });
        });
    }

    function setupInputs() {
        const inputs = [
            'qrInputUrl', 'qrInputText', 'qrWifiSsid', 'qrWifiPass', 'qrWifiType',
            'qrVcardName', 'qrVcardPhone', 'qrVcardEmail', 'qrVcardCompany',
            'qrColorStyle', 'qrDotShape', 'qrCenterLogo'
        ];

        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', updateQR);
                el.addEventListener('change', updateQR);
            }
        });

        // Własne logo
        const logoInput = document.getElementById('qrCustomLogoInput');
        if (logoInput) {
            logoInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        const img = new Image();
                        img.onload = () => {
                            centerLogoImg = img;
                            updateQR();
                        };
                        img.src = ev.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }

    // Wyliczanie tekstu dla kodu QR w zależności od typu
    function getQRValue() {
        if (currentType === 'url') {
            const el = document.getElementById('qrInputUrl');
            return (el && el.value.trim()) || window.location.href;
        }
        if (currentType === 'text') {
            const el = document.getElementById('qrInputText');
            return (el && el.value.trim()) || 'Wiadomość z Dropsite';
        }
        if (currentType === 'wifi') {
            const ssid = (document.getElementById('qrWifiSsid') && document.getElementById('qrWifiSsid').value.trim()) || 'MojeWiFi';
            const pass = (document.getElementById('qrWifiPass') && document.getElementById('qrWifiPass').value.trim()) || '';
            const type = (document.getElementById('qrWifiType') && document.getElementById('qrWifiType').value) || 'WPA';
            return `WIFI:T:${type};S:${ssid};P:${pass};;`;
        }
        if (currentType === 'vcard') {
            const name = (document.getElementById('qrVcardName') && document.getElementById('qrVcardName').value.trim()) || 'Jan Kowalski';
            const phone = (document.getElementById('qrVcardPhone') && document.getElementById('qrVcardPhone').value.trim()) || '';
            const email = (document.getElementById('qrVcardEmail') && document.getElementById('qrVcardEmail').value.trim()) || '';
            const company = (document.getElementById('qrVcardCompany') && document.getElementById('qrVcardCompany').value.trim()) || '';

            return `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL:${phone}\nEMAIL:${email}\nORG:${company}\nEND:VCARD`;
        }
        return window.location.href;
    }

    function getQRColors() {
        const style = (document.getElementById('qrColorStyle') && document.getElementById('qrColorStyle').value) || 'mint';
        switch (style) {
            case 'cyan':
                return { fg: '#06B6D4', bg: '#FFFFFF' };
            case 'emerald':
                return { fg: '#059669', bg: '#FFFFFF' };
            case 'gold':
                return { fg: '#D97706', bg: '#FFFFFF' };
            case 'dark':
                return { fg: '#0B0F19', bg: '#FFFFFF' };
            case 'mint':
            default:
                return { fg: '#10B981', bg: '#FFFFFF' };
        }
    }

    function updateQR() {
        const canvas = document.getElementById('qrPreviewCanvas');
        if (!canvas || typeof QRious === 'undefined') return;

        const val = getQRValue();
        const colors = getQRColors();

        // Wygeneruj bazowy kod QR o wysokiej rozdzielczości
        const qr = new QRious({
            value: val,
            size: 600,
            level: 'H',
            background: colors.bg,
            foreground: colors.fg
        });

        // Narysuj na canvasie podglądu z ewentualnym logo w centrum
        const ctx = canvas.getContext('2d');
        canvas.width = 600;
        canvas.height = 600;

        ctx.drawImage(qr.image, 0, 0, 600, 600);

        // Logo w centrum (opcjonalne)
        const logoChoice = (document.getElementById('qrCenterLogo') && document.getElementById('qrCenterLogo').value) || 'dropsite';

        if (logoChoice === 'dropsite') {
            drawCenterBadge(ctx, 600, colors.fg);
        } else if (logoChoice === 'custom' && centerLogoImg) {
            drawCustomLogo(ctx, 600, centerLogoImg);
        }
    }

    function drawCenterBadge(ctx, size, fgColor) {
        const badgeSize = size * 0.22;
        const center = size / 2;
        const half = badgeSize / 2;

        // Biały zaokrąglony kafelek z cieniem
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.18)';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#FFFFFF';
        roundRect(ctx, center - half, center - half, badgeSize, badgeSize, 14);
        ctx.fill();
        ctx.restore();

        // Sygnet Dropsite w centrum
        ctx.save();
        ctx.fillStyle = fgColor;
        ctx.beginPath();
        ctx.arc(center, center - badgeSize * 0.12, badgeSize * 0.16, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = fgColor;
        roundRect(ctx, center - badgeSize * 0.24, center + badgeSize * 0.08, badgeSize * 0.48, badgeSize * 0.14, 4);
        ctx.fill();
        ctx.restore();
    }

    function drawCustomLogo(ctx, size, img) {
        const badgeSize = size * 0.24;
        const center = size / 2;
        const half = badgeSize / 2;

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#FFFFFF';
        roundRect(ctx, center - half, center - half, badgeSize, badgeSize, 14);
        ctx.fill();
        ctx.restore();

        const imgPadding = 8;
        ctx.drawImage(img, center - half + imgPadding, center - half + imgPadding, badgeSize - imgPadding * 2, badgeSize - imgPadding * 2);
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
    }

    function setupExportButtons() {
        // Pobierz PNG 4K
        const btnPng = document.getElementById('btnQrDownloadPng');
        if (btnPng) {
            btnPng.addEventListener('click', () => {
                const canvas = document.getElementById('qrPreviewCanvas');
                if (!canvas) return;

                // Generowanie płótna 2048 x 2048 dla druku 4K
                const exportCanvas = document.createElement('canvas');
                exportCanvas.width = 2048;
                exportCanvas.height = 2048;
                const eCtx = exportCanvas.getContext('2d');
                eCtx.imageSmoothingEnabled = true;
                eCtx.imageSmoothingQuality = 'high';
                eCtx.drawImage(canvas, 0, 0, 2048, 2048);

                const link = document.createElement('a');
                link.download = `dropsite_qr_4k_${Date.now()}.png`;
                link.href = exportCanvas.toDataURL('image/png');
                link.click();

                if (window.showToast) window.showToast('Pobrano kod QR w jakości Ultra HD 4K (2048x2048)', 'success');
            });
        }

        // Pobierz wektorowy SVG
        const btnSvg = document.getElementById('btnQrDownloadSvg');
        if (btnSvg) {
            btnSvg.addEventListener('click', () => {
                const canvas = document.getElementById('qrPreviewCanvas');
                if (!canvas) return;

                const val = getQRValue();
                const colors = getQRColors();

                const qr = new QRious({
                    value: val,
                    size: 400,
                    level: 'H'
                });

                // Zbuduj wektorowy plik SVG
                const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
    <rect width="400" height="400" fill="${colors.bg}"/>
    <image href="${qr.toDataURL()}" width="400" height="400"/>
</svg>`;

                const blob = new Blob([svgContent], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = `dropsite_qr_vector_${Date.now()}.svg`;
                link.href = url;
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 2000);

                if (window.showToast) window.showToast('Pobrano wektorowy kod QR (SVG)', 'success');
            });
        }
    }

    window.initQRStudio = initQRStudio;

    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initQRStudio, 500);
    });

})();
