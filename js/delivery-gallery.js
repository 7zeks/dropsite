/* Open recipient layout. Reuse the existing rows, previews and download action. */
(() => {
    'use strict';
    const view=document.getElementById('view-download'),preview=document.getElementById('dlPreviewContainer');
    if(!view||!preview)return;
    const text=(pl,en)=>document.documentElement.lang.startsWith('pl')?pl:en;
    const header=view.querySelector('.dl-header-unified'),download=document.getElementById('dlDownloadBtn');
    if(header&&download){
        const actions=document.createElement('div');actions.className='delivery-header-actions';actions.append(download);header.append(actions);
    }
    let mode='strip',frame=0,observedList=null;
    const sizeObserver='ResizeObserver' in window?new ResizeObserver(()=>observedList?._updateStripEdges?.()):null;
    function applyMode(){
        preview.classList.toggle('delivery-filmstrip',mode==='strip');
        preview.querySelectorAll('[data-delivery-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.deliveryMode===mode)));
        observedList?._updateStripEdges?.();
    }
    function refresh(){
        const explorer=preview.querySelector('#archiveExplorerBox'),list=preview.querySelector('#archiveFileList');
        if(!explorer||!list||list.classList.contains('album-gallery-grid'))return;
        if(!explorer.querySelector('.delivery-strip-navigation')){
            const nav=document.createElement('div');nav.className='delivery-strip-navigation';
            for(const direction of [-1,1]){
                const button=document.createElement('button');button.type='button';
                button.setAttribute('aria-label',direction<0?text('Poprzednie pliki','Previous files'):text('Następne pliki','Next files'));
                button.innerHTML=`<svg aria-hidden="true" viewBox="0 0 24 24"><path d="${direction<0?'M14 6l-6 6 6 6':'M10 6l6 6-6 6'}"/></svg>`;
                button.onclick=()=>list.scrollBy({left:direction*Math.max(160,list.clientWidth-170),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
                nav.append(button);
            }
            explorer.querySelector('.archive-explorer-header')?.append(nav);
        }
        if(observedList!==list){sizeObserver?.disconnect();observedList=list;sizeObserver?.observe(list);}
        list._updateStripEdges=()=>{
            const max=Math.max(0,list.scrollWidth-list.clientWidth),left=list.scrollLeft>2,right=list.scrollLeft<max-2;
            list.classList.toggle('strip-fade-left',mode==='strip'&&left);list.classList.toggle('strip-fade-right',mode==='strip'&&right);
            const nav=explorer.querySelector('.delivery-strip-navigation');if(!nav)return;
            nav.hidden=mode!=='strip'||max<3;
            const buttons=nav.querySelectorAll('button');buttons[0].disabled=!left;buttons[1].disabled=!right;
        };
        if(!list.dataset.stripScrollBound){list.dataset.stripScrollBound='true';list.addEventListener('scroll',()=>list._updateStripEdges?.(),{passive:true});}
        if(!explorer.querySelector('.delivery-view-switch')){
            const toggle=document.createElement('div');toggle.className='delivery-view-switch';toggle.setAttribute('role','group');toggle.setAttribute('aria-label',text('Widok zawartości','Contents view'));
            for(const [value,pl,en] of [['strip','Miniatury','Thumbnails'],['list','Lista','List']]){
                const button=document.createElement('button');button.type='button';button.dataset.deliveryMode=value;button.textContent=text(pl,en);button.onclick=()=>{mode=value;applyMode();};toggle.append(button);
            }
            explorer.querySelector('.archive-explorer-header')?.append(toggle);
        }
        list.querySelectorAll('.archive-file-row').forEach(row=>{
            if(row.dataset.galleryReady)return;row.dataset.galleryReady='true';
            row.tabIndex=0;row.setAttribute('role','button');
            row.addEventListener('keydown',event=>{if(event.target!==row)return;if(event.key==='Enter'||event.key===' '){event.preventDefault();row.click();}});
        });
        applyMode();
    }
    new MutationObserver(records=>{
        if(!records.some(record=>record.target.id==='archiveFileList'||[...record.addedNodes].some(node=>node.nodeType===1&&(node.id==='archiveExplorerBox'||node.querySelector?.('#archiveExplorerBox')))))return;
        if(frame)return;frame=requestAnimationFrame(()=>{frame=0;refresh();});
    }).observe(preview,{childList:true,subtree:true});
    document.addEventListener('dropsite_language_changed',()=>{preview.querySelector('.delivery-view-switch')?.remove();refresh();});
    refresh();
})();
