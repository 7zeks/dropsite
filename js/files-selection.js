/* Paint selection: starting on a selected file paints deselection instead. */
(() => {
    'use strict';
    const modal=document.getElementById('modModal'),list=document.getElementById('modFileList'),scroller=document.getElementById('modContainer');
    if(!modal||!list||!scroller)return;
    let drag=null,frame=0,suppressClick=false;
    const controls='button,input,textarea,select,.card-select-checkbox-wrap,.mod-file-check-col';
    function apply(checkbox,checked){
        if(checkbox.checked===checked)return;
        checkbox.checked=checked;
        window.toggleFileSelectionForAlbum?.(checkbox.dataset.key,checked,checkbox);
    }
    function finish(restore=false){
        if(!drag)return;
        if(restore)list.querySelectorAll('.file-select-checkbox').forEach(cb=>apply(cb,drag.initial.has(cb.dataset.key)));
        const active=drag.active;drag=null;cancelAnimationFrame(frame);frame=0;modal.classList.remove('is-selecting-files');
        if(active){suppressClick=true;setTimeout(()=>{suppressClick=false;},0);}
    }
    // Segment/rectangle intersection also catches files crossed between pointer events.
    function crosses(x1,y1,x2,y2,r){
        let low=0,high=1;
        for(const [start,delta,min,max] of [[x1,x2-x1,r.left,r.right],[y1,y2-y1,r.top,r.bottom]]){
            if(!delta){if(start<min||start>max)return false;continue;}
            const a=(min-start)/delta,b=(max-start)/delta;
            low=Math.max(low,Math.min(a,b));high=Math.min(high,Math.max(a,b));
            if(low>high)return false;
        }
        return true;
    }
    let cachedRows = [];
    let cachedBounds = null;

    function refreshCachedGeometry(){
        if (!scroller || !list) return;
        cachedBounds = scroller.getBoundingClientRect();
        cachedRows = Array.from(list.querySelectorAll('.mod-file-card,.mod-file-item')).map(row=>{
            const checkbox = row.querySelector('.file-select-checkbox');
            if (!checkbox) return null;
            const r = row.getBoundingClientRect();
            return {
                checkbox,
                visible: {
                    left: Math.max(r.left, cachedBounds.left),
                    right: Math.min(r.right, cachedBounds.right),
                    top: Math.max(r.top, cachedBounds.top),
                    bottom: Math.min(r.bottom, cachedBounds.bottom)
                }
            };
        }).filter(Boolean);
    }

    function paint(){
        if(!drag?.active || !cachedRows.length) return;
        for(let i=0; i<cachedRows.length; i++){
            const item = cachedRows[i];
            const v = item.visible;
            if(v.left<=v.right && v.top<=v.bottom && crosses(drag.lastX,drag.lastY,drag.x,drag.y,v)){
                if(drag.checked===null) drag.checked = !item.checkbox.checked;
                apply(item.checkbox, drag.checked);
            }
        }
        drag.lastX=drag.x; drag.lastY=drag.y;
    }
    function update(){
        if(!drag?.active)return;
        if(modal.hidden||!list.isConnected){finish();return;}
        const bounds = cachedBounds || scroller.getBoundingClientRect();
        const speed=drag.y<bounds.top+48 ? -Math.min(18,(bounds.top+48-drag.y)*.4) : drag.y>bounds.bottom-48 ? Math.min(18,(drag.y-bounds.bottom+48)*.4) : 0;
        if(speed){
            scroller.scrollTop+=speed;
            refreshCachedGeometry();
        }
        paint();
        frame=requestAnimationFrame(update);
    }
    modal.addEventListener('pointerdown',event=>{
        if(event.button!==0||event.pointerType!=='mouse'||modal.classList.contains('is-admin-dashboard')||event.target.closest(controls))return;
        if(!list.contains(event.target)&&event.target.id!=='modFilesScreen')return;
        const startCheckbox=event.target.closest('.mod-file-card,.mod-file-item')?.querySelector('.file-select-checkbox');
        drag={downX:event.clientX,downY:event.clientY,lastX:event.clientX,lastY:event.clientY,x:event.clientX,y:event.clientY,active:false,checked:startCheckbox?!startCheckbox.checked:null,initial:new Set(window.selectedFilesForAlbum||[])};
    },true);
    document.addEventListener('pointermove',event=>{
        if(!drag)return;
        if(!(event.buttons&1)){finish();return;}
        drag.x=event.clientX;drag.y=event.clientY;
        if(!drag.active&&Math.hypot(drag.x-drag.downX,drag.y-drag.downY)>6){
            drag.active=true;
            modal.classList.add('is-selecting-files');
            window.getSelection()?.removeAllRanges();
            refreshCachedGeometry();
            frame=requestAnimationFrame(update);
        }
        if(drag.active){event.preventDefault();}
    },{capture:true,passive:false});
    document.addEventListener('pointerup',()=>finish(),true);
    document.addEventListener('pointercancel',()=>finish(true),true);
    window.addEventListener('blur',()=>finish());
    modal.addEventListener('dragstart',event=>{if(drag)event.preventDefault();},true);
    modal.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopImmediatePropagation();}},true);
    document.addEventListener('keydown',event=>{if(drag&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();finish(true);}},{capture:true});
})();
