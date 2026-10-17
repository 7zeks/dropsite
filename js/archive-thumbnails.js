/* Reuse the main player frame: no extra video requests or decoders. */
(() => {
    'use strict';
    const container=document.getElementById('dlPreviewContainer');if(!container)return;
    const frames=new Map();let pending=0;
    const key=url=>{try{const parsed=new URL(url,location.href);parsed.hash='';return parsed.href;}catch{return url;}};
    function display(){
        container.querySelectorAll('.archive-list-video-slot').forEach(slot=>{
            if(slot.firstChild)return;
            const targetUrl = slot.dataset.thumbnailSrc;
            const targetKey = key(targetUrl);
            const frame=frames.get(targetKey);
            if(frame) {
                const canvas=document.createElement('canvas');canvas.className='archive-list-thumbnail';
                canvas.width=frame.width;canvas.height=frame.height;
                canvas.getContext('2d').drawImage(frame,0,0);slot.append(canvas);
                return;
            }
            if (window.DropsiteThumbnailCache) {
                const cached = window.DropsiteThumbnailCache.get(targetUrl) || window.DropsiteThumbnailCache.get(targetKey);
                if (cached) {
                    const img = document.createElement('img');
                    img.className = 'archive-list-thumbnail';
                    img.src = cached;
                    slot.append(img);
                    return;
                }
            }
        });
    }
    function capture(event){
        const video=event.target;
        if(video.tagName!=='VIDEO'||video.id!=='archiveVideoPlayer'||video.readyState<2||!video.videoWidth)return;
        const source=key(video.currentSrc||video.src);if(!source||frames.has(source))return;
        const canvas=document.createElement('canvas');canvas.width=128;canvas.height=Math.max(1,Math.round(128*video.videoHeight/video.videoWidth));
        if(canvas.height>192){canvas.width=Math.max(1,Math.round(192*video.videoWidth/video.videoHeight));canvas.height=192;}
        try{
            canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
            if(frames.size>=24)frames.delete(frames.keys().next().value);
            frames.set(source,canvas);
            if (window.DropsiteThumbnailCache) {
                try {
                    window.DropsiteThumbnailCache.set(source, canvas.toDataURL('image/jpeg', 0.8));
                } catch(e) {}
            }
            display();
        }catch{/* Keep the file icon if capture is unavailable. */}
    }
    container.addEventListener('loadeddata',capture,true);
    container.addEventListener('seeked',capture,true);
    container.addEventListener('playing',capture,true);
    new MutationObserver(records=>{
        if(!records.some(record=>record.target.id==='archiveFileList'||[...record.addedNodes].some(node=>node.nodeType===1&&(node.id==='archiveFileList'||node.querySelector?.('#archiveFileList')))))return;
        if(pending)return;
        pending=requestAnimationFrame(()=>{pending=0;display();});
    }).observe(container,{childList:true,subtree:true});
    display();
})();
