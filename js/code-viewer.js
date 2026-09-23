/**
 * Dropsite Code & Text Viewer (Studio Syntax Highlighter)
 * 100% XSS-Safe RAM rendering and syntax coloring for developer files.
 * Brand Guidelines: Zero emoji, pure SVG inline, Cyber Mint & Obsidian Glass.
 */

(function () {
    'use strict';

    // Mapowanie rozszerzeń na nazwy języków
    const LANG_MAP = {
        'js': 'JavaScript',
        'mjs': 'JavaScript',
        'ts': 'TypeScript',
        'tsx': 'TypeScript React',
        'jsx': 'React JSX',
        'py': 'Python',
        'json': 'JSON',
        'css': 'CSS',
        'scss': 'SCSS',
        'html': 'HTML',
        'htm': 'HTML',
        'xml': 'XML',
        'svg': 'SVG Vector',
        'md': 'Markdown',
        'sql': 'SQL',
        'sh': 'Shell Script',
        'bash': 'Bash Script',
        'yml': 'YAML',
        'yaml': 'YAML',
        'txt': 'Zwykły Tekst',
        'env': 'Config / Env'
    };

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

    /**
     * Lekki, bezpieczny silnik kolorowania składni
     * Działa na już zescapowanym tekście HTML!
     */
    function highlightCode(escapedCode, lang) {
        let code = escapedCode;

        // 1. Komentarze liniowe i blokowe
        code = code.replace(/(\/\/[^\n]*|#[^\n]*)/g, '<span class="token-comment">$1</span>');
        code = code.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token-comment">$1</span>');

        // 2. Łańcuchy znaków (Strings)
        code = code.replace(/(&quot;[\s\S]*?&quot;|&#39;[\s\S]*?&#39;|`[\s\S]*?`)/g, '<span class="token-string">$1</span>');

        // 3. Słowa kluczowe (Keywords)
        const keywords = [
            'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'export',
            'from', 'default', 'class', 'extends', 'async', 'await', 'try', 'catch', 'throw', 'new',
            'def', 'self', 'elif', 'with', 'as', 'lambda', 'select', 'from', 'where', 'insert', 'update',
            'delete', 'create', 'table', 'null', 'void', 'typeof', 'instanceof'
        ];
        const kwRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
        code = code.replace(kwRegex, '<span class="token-keyword">$1</span>');

        // 4. Wartości boolowskie
        code = code.replace(/\b(true|false|True|False)\b/g, '<span class="token-boolean">$1</span>');

        // 5. Liczby
        code = code.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="token-number">$1</span>');

        // 6. Wywołania funkcji
        code = code.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\()/g, '<span class="token-function">$1</span>');

        return code;
    }

    /**
     * Renderowanie karty przeglądarki kodu
     */
    function renderCodeViewer(targetEl, rawCode, fileName = 'plik.txt', customLang = '') {
        if (!targetEl) return;

        const ext = (fileName.split('.').pop() || '').toLowerCase();
        const langName = customLang || LANG_MAP[ext] || 'Tekst';

        const lines = (rawCode || '').split('\n');
        const linesCount = lines.length;

        // Generowanie numerów linii
        const lineNumsHtml = lines.map((_, i) => `<div>${i + 1}</div>`).join('');

        // Escapowanie i podświetlanie
        const escapedRaw = escapeHtml(rawCode);
        const highlightedHtml = highlightCode(escapedRaw, ext);

        targetEl.innerHTML = `
            <div class="code-viewer-card" id="codeViewerCard">
                <div class="code-viewer-header">
                    <div class="code-viewer-meta">
                        <span class="code-lang-pill">${escapeHtml(langName)}</span>
                        <h4 class="code-file-name" title="${escapeHtml(fileName)}">${escapeHtml(fileName)}</h4>
                        <span class="code-stats-pill">${linesCount} ${linesCount === 1 ? 'linia' : 'linii'}</span>
                    </div>
                    <div class="code-viewer-actions">
                        <button type="button" class="code-btn-copy" id="btnCodeCopy">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <span>Kopiuj kod</span>
                        </button>
                    </div>
                </div>

                <div class="code-viewer-body">
                    <div class="code-line-numbers" aria-hidden="true">${lineNumsHtml}</div>
                    <pre class="code-content-block"><code>${highlightedHtml}</code></pre>
                </div>
            </div>
        `;

        const copyBtn = targetEl.querySelector('#btnCodeCopy');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(rawCode).then(() => {
                    const label = copyBtn.querySelector('span');
                    if (label) label.textContent = 'Skopiowano!';
                    setTimeout(() => { if (label) label.textContent = 'Kopiuj kod'; }, 2000);
                    if (window.showToast) window.showToast('Kod skopiowany do schowka', 'success');
                }).catch(() => {
                    if (window.showToast) window.showToast('Zaznacz i skopiuj ręcznie', 'info');
                });
            });
        }
    }

    window.renderCodeViewer = renderCodeViewer;

    // Automatyczny nasłuch na pliki kodu w widoku pobierania
    async function checkAndMountCodeViewer() {
        const codeExtRegex = /\.(js|mjs|ts|tsx|jsx|py|json|css|scss|html|xml|svg|md|sql|sh|bash|yml|yaml|txt|env)$/i;

        const dlContainer = document.getElementById('dlPreviewContainer');
        if (!dlContainer || dlContainer.querySelector('.code-viewer-card')) return;

        let fileKey = window._lastUploadedFileKey;
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('f')) fileKey = urlParams.get('f');

        if (fileKey && codeExtRegex.test(fileKey)) {
            const cleanName = fileKey.split('/').pop() || fileKey;
            const directUrl = `https://pub-db4c47e6a54d440a9120992639865dd0.r2.dev/${fileKey}`;

            try {
                const resp = await fetch(directUrl);
                if (resp.ok) {
                    const text = await resp.text();
                    renderCodeViewer(dlContainer, text, cleanName);
                }
            } catch (e) {
                console.warn('[CodeViewer] Nie udało się pobrać treści pliku do podglądu:', e);
            }
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(checkAndMountCodeViewer, 700);
    });

})();
