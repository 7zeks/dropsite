/* Progressive enhancement of the existing file manager; no duplicate file state. */
(() => {
    'use strict';
    const modal = document.getElementById('modModal');
    const list = document.getElementById('modFileList');
    if (!modal || !list) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const en = () => document.documentElement.lang.startsWith('en');
    const label = (pl, english) => en() ? english : pl;
    let returnFocus, generation = 0;
    let pdfLibrary;
    function loadPdf() {
        if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
        if (!pdfLibrary) pdfLibrary = new Promise((resolve,reject)=>{
            const script=document.createElement('script'); script.src='js/pdf.min.js';
            script.onload=()=>resolve(window.pdfjsLib); script.onerror=()=>{pdfLibrary=null;script.remove();reject(new Error('PDF unavailable'));};
            document.head.append(script);
        });
        return pdfLibrary;
    }
    const upload = document.createElement('button');
    upload.type = 'button'; upload.className = 'files-upload';
    upload.addEventListener('click', () => window.triggerMyFilesUpload?.());
    modal.querySelector('.mod-header-actions')?.prepend(upload);
    const inspector = document.createElement('aside');
    inspector.className = 'files-inspector'; inspector.hidden = true;
    inspector.setAttribute('role', 'dialog'); inspector.setAttribute('aria-labelledby', 'filesInspectorTitle');
    const shell = document.createElement('div');
    shell.className = 'files-workspace-shell';
    const container = document.getElementById('modContainer');
    container.before(shell);
    shell.append(container, inspector);
    function close() {
        if (inspector.hidden) return;
        generation++; inspector.hidden = true;
        inspector.querySelectorAll('audio,video').forEach(media => { 
            media.pause(); 
            const src = media.currentSrc || media.src;
            if (src && src.startsWith('blob:')) {
                try { URL.revokeObjectURL(src); } catch (_) {}
            }
            media.removeAttribute('src'); 
            media.load(); 
        });
        inspector.querySelectorAll('img').forEach(img => {
            const src = img.src;
            if (src && src.startsWith('blob:')) {
                try { URL.revokeObjectURL(src); } catch (_) {}
            }
            img.removeAttribute('src');
        });
        inspector.querySelectorAll('canvas').forEach(cvs => {
            const ctx = cvs.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, cvs.width, cvs.height);
            cvs.width = 1; cvs.height = 1;
        });
        modal.classList.remove('files-inspecting');
        if (returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
    }
    function element(tag, cls, text) {
        const node = document.createElement(tag); if (cls) node.className = cls;
        if (text !== undefined) node.textContent = text; return node;
    }
    function open(row, trigger) {
        close(); returnFocus = trigger;
        const token = generation;
        const nameLink = row.querySelector('.card-file-name,.mod-file-name');
        const name = nameLink?.textContent || '';
        const copy = [...row.querySelectorAll('button')].find(b => (b.getAttribute('onclick') || '').startsWith('copyDirectLink('));
        const mediaSource = row.querySelector('img,video');
        const download = [...row.querySelectorAll('button')].find(b => (b.getAttribute('onclick') || '').startsWith('downloadDirectFile('));
        // The renderer supplies trusted URLs; read metadata instead of parsing inline code.
        const key = row.dataset.fileKey;
        const file = typeof loadedModFiles !== 'undefined' ? loadedModFiles.find(f => (f.key || f.name) === key) : null;
        let url = file?.directUrl;
        if (!url || !/^https?:\/\//.test(url) || url.includes('?f=')) url = mediaSource?.getAttribute('src') || mediaSource?.getAttribute('data-video-src');
        if (!url && key) url = 'https://pub-db4c47e6a54d440a9120992639865dd0.r2.dev/' + key;
        const expired = row.dataset.expired === 'true';
        inspector.replaceChildren();
        const head = element('div','files-inspector-head',label('Szczegóły pliku','File details'));
        const exit = element('button','files-inspector-close','×'); exit.type='button'; exit.setAttribute('aria-label',label('Zamknij szczegóły','Close details')); exit.onclick=close; head.append(exit);
        const media = element('div','files-inspector-media');
        const ext = name.split('.').pop().toLowerCase();
        const format = element('span','files-inspector-format',ext.length < 9 ? ext.toUpperCase() : 'FILE'); media.append(format);
        if (!expired && url && /^(https?):/.test(url)) {
            let preview;
            if (/^(png|jpe?g|webp|gif|avif|bmp|svg)$/.test(ext)) { preview = element('img'); preview.alt = name; preview.decoding='async'; }
            else if (/^(mp4|webm|mov|m4v)$/.test(ext)) { preview=element('video'); preview.controls=true; preview.preload='metadata'; preview.playsInline=true; }
            else if (/^(mp3|wav|ogg|flac|m4a|aac)$/.test(ext)) { preview=element('audio'); preview.controls=true; preview.preload='metadata'; }
            if (preview) { preview.src=url; preview.onerror=()=>preview.replaceWith(format); media.replaceChildren(preview); }
        }
        const title=element('h3',null,name); title.id='filesInspectorTitle';
        const details=element('dl');
        const status=expired ? label('Wygasły','Expired') : row.querySelector('.card-floating-badge,.mod-meta-row .mod-badge-size:last-child')?.textContent.trim() || '—';
        [[label('Format','Format'),ext.toUpperCase()], [label('Rozmiar','Size'),row.querySelector('.card-size-text,.mod-meta-row .mod-badge-size')?.textContent || '—'],[label('Dostępność','Availability'),status]].forEach(([key,value])=>{ const line=element('div'); line.append(element('dt',null,key),element('dd',null,value)); details.append(line); });
        const actions=element('div','files-inspector-actions');
        if (!expired && copy) { const btn=element('button','files-upload',label('Kopiuj link','Copy link')); btn.type='button'; btn.onclick=async()=>{ try { await navigator.clipboard.writeText(nameLink.href); btn.textContent=label('✓ Skopiowano','✓ Copied'); } catch { copy.click(); } }; actions.append(btn); }
        if (!expired && download) { const btn=element('button','files-inspector-close', '↓'); btn.style.cssText='width:100%;height:42px;font-size:13px'; btn.textContent=label('Pobierz plik','Download file'); btn.onclick=()=>download.click(); actions.append(btn); }
        if (!expired && nameLink) { const link=element('a',null,label('Otwórz stronę pliku ↗','Open file page ↗')); link.href=nameLink.href; link.target='_blank'; link.rel='noopener noreferrer'; actions.append(link); }
        inspector.append(head,media,title,details,actions);
        if (expired) inspector.append(element('p','files-inspector-status',label('Plik wygasł. Jego podgląd i pobieranie są niedostępne.','This file has expired. Preview and download are unavailable.')));
        inspector.hidden=false; modal.classList.add('files-inspecting'); exit.focus({preventScroll:true});
        if (!reduced.matches) inspector.animate([{opacity:0,transform:'translateX(24px)'},{opacity:1,transform:'translateX(0)'}],{duration:240,easing:'cubic-bezier(.2,.8,.2,1)'});
        // Render PDF only on demand, never for every card in the collection.
        if (!expired && ext === 'pdf' && url) {
            loadPdf().then(async library=>{
                if(token!==generation) return;
                library.GlobalWorkerOptions.workerSrc='js/pdf.worker.min.js';
                const pdf=await library.getDocument(url).promise;
                try { const page=await pdf.getPage(1); if (token!==generation) return; const viewport=page.getViewport({scale:.65}); const canvas=element('canvas'); canvas.width=viewport.width; canvas.height=viewport.height; await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise; if(token===generation) media.replaceChildren(canvas); } finally { pdf.destroy(); }
            }).catch(()=>{ if(token===generation) inspector.append(element('p','files-inspector-status',label('Podgląd PDF jest niedostępny. Możesz otworzyć stronę pliku lub go pobrać.','PDF preview is unavailable. Open the file page or download it.'))); });
        }
    }
    function enhance() {
        list.querySelectorAll('.mod-file-card,.mod-file-item').forEach(row=>{
            if (row.dataset.enhanced || modal.classList.contains('is-admin-dashboard')) return; row.dataset.enhanced='true';
            const dock=row.querySelector('.card-action-dock,.mod-actions'); if(!dock) return;
            const button=element('button',row.matches('.mod-file-card') ? 'card-action-btn files-details-button' : 'btn-mod-action files-details-button','⋯');
            button.type='button'; button.title=label('Szczegóły pliku','File details'); button.setAttribute('aria-label',button.title); button.onclick=()=>open(row,button); dock.append(button);
            const name=row.querySelector('.card-file-name,.mod-file-name');
            name?.addEventListener('click',event=>{ if(event.ctrlKey || event.metaKey || event.shiftKey) return; event.preventDefault(); event.stopImmediatePropagation(); open(row,button); },true);
            const preview=row.querySelector('.card-preview-area,.mod-preview-thumb-wrap,.mod-preview-icon');
            if(preview) {
                preview.tabIndex=0; preview.setAttribute('role','button'); preview.setAttribute('aria-label',button.title);
                preview.addEventListener('click',event=>{ if(event.target.closest('.card-select-checkbox-wrap,input')) return; event.preventDefault(); event.stopImmediatePropagation(); open(row,button); },true);
                preview.addEventListener('keydown',event=>{ if(event.target!==preview) return; if(event.key==='Enter'||event.key===' '){event.preventDefault();open(row,button);} });
            }
        });
    }
    let enhanceScheduled = false;
    function scheduleEnhance() {
        if (enhanceScheduled) return;
        enhanceScheduled = true;
        requestAnimationFrame(() => {
            enhanceScheduled = false;
            enhance();
        });
    }
    new MutationObserver(scheduleEnhance).observe(list,{childList:true});
    new MutationObserver(()=>{ if(modal.hidden || modal.classList.contains('is-admin-dashboard') || modal.classList.contains('is-closing')) close(); }).observe(modal,{attributes:true,attributeFilter:['hidden','class']});
    modal.addEventListener('keydown',event=>{ if(inspector.hidden) return; if(event.key==='Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); } if(event.key==='Tab') { const nodes=[...inspector.querySelectorAll('button,a[href],audio[controls],video[controls]')]; const first=nodes[0],last=nodes.at(-1); if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();} else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();} } },true);
    const refreshLabels=()=>{ upload.textContent=label('+ Dodaj pliki','+ Add files'); scheduleEnhance(); };
    if (typeof renderModFilesList === 'function') {
        const render = renderModFilesList;
        renderModFilesList = function(files) {
            close();
            render(files);
            scheduleEnhance();
        };
    }
    document.addEventListener('dropsite_language_changed',()=>{close();refreshLabels();});
    refreshLabels();
})();
