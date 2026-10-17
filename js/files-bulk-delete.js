/* Batch removal mirrors the existing personal/admin deletion scopes. */
(() => {
    'use strict';
    const bar=document.getElementById('modSelectionBar');
    if(!bar)return;
    const button=document.createElement('button');button.type='button';button.className='files-bulk-delete';
    const english=()=>document.documentElement.lang.startsWith('en');
    const text=(pl,en)=>english()?en:pl;
    const icon='<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>';
    let armed=null,confirmTimer=null;
    function label(){button.innerHTML=icon;const span=document.createElement('span');span.textContent=armed?text('Potwierdź usunięcie','Confirm deletion'):text('Usuń zaznaczone','Delete selected');button.append(span);button.classList.toggle('is-confirming',!!armed);}
    function reset(){clearTimeout(confirmTimer);confirmTimer=null;armed=null;if(!button.disabled)label();}
    label();bar.lastElementChild.prepend(button);
    // Keep a single ripple implementation for all selection actions.
    bar.querySelectorAll('button').forEach(action=>action.classList.remove('btn-primary','btn-secondary'));
    bar.addEventListener('click',event=>{
        const action=event.target.closest('button');
        if(!action||action.disabled||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
        const rect=action.getBoundingClientRect();
        const x=event.detail===0?rect.width/2:event.clientX-rect.left;
        const y=event.detail===0?rect.height/2:event.clientY-rect.top;
        requestAnimationFrame(()=>{
            const ripple=document.createElement('span');ripple.className='files-action-ripple';ripple.setAttribute('aria-hidden','true');
            const size=Math.hypot(rect.width,rect.height)*2;
            ripple.style.cssText=`width:${size}px;height:${size}px;left:${x-size/2}px;top:${y-size/2}px;`;
            action.append(ripple);
            const animation=ripple.animate([{transform:'scale(0)',opacity:1},{transform:'scale(1)',opacity:0}],{duration:520,easing:'cubic-bezier(.2,.7,.2,1)'});
            animation.finished.then(()=>ripple.remove(),()=>ripple.remove());
        });
    },true);
    document.addEventListener('dropsite_language_changed',reset);
    document.addEventListener('keydown',event=>{if(event.key==='Escape')reset();});
    const count=document.getElementById('selectedFilesCount');
    if(count)new MutationObserver(reset).observe(count,{childList:true,characterData:true,subtree:true});
    new MutationObserver(()=>{if(bar.style.display==='none')reset();}).observe(bar,{attributes:true,attributeFilter:['style']});
    button.addEventListener('click',async()=>{
        if(button.disabled)return;
        const keys=[...(window.selectedFilesForAlbum||[])];if(!keys.length)return;
        const admin=isSuperAdmin()&&currentActiveRole==='admin'&&currentAdminPanelScope==='all';
        const signature=JSON.stringify([admin,[...keys].sort()]);
        if(armed!==signature){armed=signature;clearTimeout(confirmTimer);confirmTimer=setTimeout(reset,4000);label();return;}
        clearTimeout(confirmTimer);confirmTimer=null;armed=null;
        button.disabled=true;button.textContent=text('Usuwanie…','Deleting…');
        try {
            const secret=admin?sessionStorage.getItem('adminSecret'):null;
            if(admin&&!secret)throw new Error(text('Sesja administratora wygasła. Zaloguj się ponownie.','Admin session expired. Sign in again.'));
            const email=typeof auth!=='undefined'?auth.currentUser?.email:'';
            const removed=new Set(),failed=new Set();
            // Limit concurrency and refresh only once after the entire batch.
            let cursor=0;
            async function worker(){
                while(cursor<keys.length){
                    const key=keys[cursor++];
                    try {
                        const response=await fetch(`${WORKER_URL}/delete/${encodeURIComponent(key)}`,{method:'DELETE',headers:admin?{'X-Admin-Secret':secret}:email?{'X-User-Email':email}:{}});
                        if(admin&&!response.ok&&response.status!==404)throw new Error('Delete failed');
                        removed.add(key);
                    }catch{if(admin)failed.add(key);else removed.add(key);}
                }
            }
            await Promise.all(Array.from({length:Math.min(3,keys.length)},worker));
            if(!admin){
                const history=getLocalHistory().filter(item=>{
                    const name=item.duration&&!item.name.includes('/')?`${item.duration}/${item.name}`:item.name;
                    return ![name,item.name,item.key,item.url,item.directUrl].some(key=>removed.has(key));
                });
                localStorage.setItem(getHistoryStorageKey(),JSON.stringify(history));
            }
            removed.forEach(key=>window.selectedFilesForAlbum.delete(key));
            const count=document.getElementById('selectedFilesCount');if(count)count.textContent=String(window.selectedFilesForAlbum.size);
            if(!window.selectedFilesForAlbum.size)bar.style.display='none';
            await fetchModFiles();
            if(admin&&removed.size)fetchDiskStats();
            const success=admin?text(`Usunięto z serwera: ${removed.size}.`,`Deleted from server: ${removed.size}.`):text(`Usunięto z panelu: ${removed.size}.`,`Removed from panel: ${removed.size}.`);
            showNotification(failed.size?success+' '+text(`Nie udało się usunąć: ${failed.size}. Pozostają zaznaczone.`,`Failed: ${failed.size}. These remain selected.`):success,failed.size?'warning':'success');
        }catch(error){showNotification(error.message||text('Nie udało się usunąć plików.','Could not delete files.'),'error');}
        finally{button.disabled=false;label();}
    });
})();
