/* Five direct entry points, retaining the existing tool engines and deep links. */
(() => {
    'use strict';
    const view=document.getElementById('view-narzedzia');
    const wrapper=view?.querySelector('.toolbox-clean-wrapper');
    if(!wrapper) return;
    const pl=()=>document.documentElement.lang.startsWith('pl');
    const text=(polish,english)=>pl()?polish:english;
    const icons={edit:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 17l7-7 2 2-7 7H8z"/>',qr:'<path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h3v3h-3zM21 15v6h-6M12 3v3M3 12h6M12 9v6M12 21h0"/>',compress:'<path d="M4 4l6 6M4 10h6V4M20 20l-6-6M14 20v-6h6M14 4h6v6M4 14v6h6"/>',xray:'<path d="M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><circle cx="12" cy="11" r="3"/><path d="M12 8v6M9 11h6"/>',video:'<path d="M12 3v12M7 10l5 5 5-5M4 16v5h16v-5"/>'};
    const data=[['edit','mint','PDF STUDIO','Studio PDF','PDF studio','Edytuj, podpisuj i porządkuj dokumenty. Wszystko w jednym miejscu.','Edit, sign and organize documents in one place.'],['qr-studio','blue','QR / SVG','Generator QR','QR generator','Zamień link lub tekst w kod QR. Dopasuj styl i pobierz gotowy kod.','Turn a link or text into a QR code. Customize its style and export.'],['compression','gold','IMAGE / VIDEO','Kompresja i konwersja','Compress & convert','Mniejsze pliki, odpowiedni format. Wybierz zdjęcia lub wideo.','Smaller files, the right format. Choose images or video.'],['xray','violet','METADATA / GPS','Cyber Rentgen','Cyber X-ray','Sprawdź metadane i lokalizację GPS. Usuń informacje ze swoich plików.','Inspect metadata and GPS location. Remove information from your files.'],['grabber','rose','VIDEO DOWNLOAD','Pobieracz wideo','Video downloader','Wklej link do filmu i przejdź do dostępnych opcji pobierania.','Paste a video link and explore the available download options.']];
    const gallery=document.createElement('section');gallery.className='tools-gallery';gallery.setAttribute('aria-labelledby','toolsGalleryTitle');
    const stage=document.getElementById('atelierStage');
    if(!stage) return;
    const back=document.getElementById('atelierBack');
    stage.append(gallery);stage.classList.add('has-tool-cards');
    let busy=false;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let rotation=0, selectedIndex=0, drag=null, dragged=false;
    const picks=stage.parentElement.querySelector('.atelier-choices');
    function positionCards(){
        // Hidden views have no layout. Wait for a real stage width before placing cards.
        const width=stage.clientWidth;
        if(width<=0)return;
        const cards=[...gallery.querySelectorAll('.tools-gallery-card')];
        cards.forEach((card,i)=>{
            const angle=i*72+rotation, radians=angle*Math.PI/180;
            const x=Math.sin(radians)*Math.min(width*.29,205), z=Math.cos(radians);
            card.style.setProperty('--orbit-x',x+'px');
            card.style.setProperty('--orbit-y',((1-z)*-32)+'px');
            card.style.setProperty('--orbit-angle',(-Math.sin(radians)*27)+'deg');
            card.style.setProperty('--orbit-scale',String(.73+(z+1)*.135));
            card.style.zIndex=String(Math.round((z+1)*50));
            card.style.opacity=String(.42+(z+1)*.29);
            card.classList.toggle('is-chosen',i===selectedIndex);
            card.querySelector('.tools-gallery-launch')?.setAttribute('aria-pressed',String(i===selectedIndex));
        });
    }
    function choose(index){
        selectedIndex=((index%data.length)+data.length)%data.length;
        const base=-selectedIndex*72;
        rotation=base+360*Math.round((rotation-base)/360);
        positionCards();
        picks.querySelectorAll('[data-pick]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===selectedIndex)));
        document.getElementById('atelierDescription').textContent=data[selectedIndex][pl()?5:6];
        const open=document.getElementById('atelierOpen');
        open.querySelector('span').textContent=data[selectedIndex][0]==='compression'?text('Wybierz format','Choose format'):text('Otwórz narzędzie','Open tool');
    }
    function settleCard(){}
    gallery.addEventListener('pointerdown',event=>{
        if(event.button!==0||event.target.closest('.tools-orbit-nav,.tools-compression-choices'))return;
        drag={x:event.clientX,y:event.clientY,rotation};dragged=false;
    });
    gallery.addEventListener('pointermove',event=>{
        if(!drag)return;
        const dx=event.clientX-drag.x;
        if(!dragged&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(event.clientY-drag.y)){
            dragged=true;gallery.setPointerCapture(event.pointerId);gallery.classList.add('is-dragging');
        }
        if(dragged){rotation=drag.rotation+dx*.45;positionCards();}
    });
    function release(){if(!drag)return;drag=null;gallery.classList.remove('is-dragging');if(dragged)choose(Math.round(-rotation/72));}
    gallery.addEventListener('pointerup',release);gallery.addEventListener('pointercancel',release);
    gallery.addEventListener('click',event=>{if(dragged){event.preventDefault();event.stopImmediatePropagation();dragged=false;}},true);
    gallery.addEventListener('keydown',event=>{if(event.target.closest('.tools-compression-choices'))return;if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();choose(selectedIndex+(event.key==='ArrowRight'?1:-1));gallery.querySelectorAll('.tools-gallery-launch')[selectedIndex]?.focus({preventScroll:true});}});
    let layoutFrame=0;
    function scheduleLayout(){
        cancelAnimationFrame(layoutFrame);
        layoutFrame=requestAnimationFrame(()=>{layoutFrame=0;positionCards();});
    }
    window.addEventListener('resize',scheduleLayout);
    if('ResizeObserver' in window)new ResizeObserver(scheduleLayout).observe(stage);
    // Opening the view or returning from a tool can reveal an unchanged-size stage.
    const visibilityObserver=new MutationObserver(scheduleLayout);
    visibilityObserver.observe(view,{attributes:true,attributeFilter:['hidden','class','style']});
    const lobby=stage.closest('.atelier-lobby');
    if(lobby)visibilityObserver.observe(lobby,{attributes:true,attributeFilter:['hidden','class','style']});
    function showWorkspace(tool){
        if (typeof window._atelierShowWorkspace === 'function') {
            window._atelierShowWorkspace(tool);
        } else {
            view.classList.add('atelier-in-workspace');
            const lobbyEl = view.querySelector('.atelier-lobby');
            if (lobbyEl) {
                lobbyEl.hidden = true;
                lobbyEl.classList.remove('is-exiting');
            }
            const workbarEl = view.querySelector('.atelier-workbar');
            if (workbarEl) workbarEl.hidden = false;
        }
    }
    function render(){
        settleCard();
        back.textContent=text('← Wszystkie narzędzia','← All tools');
        back.onclick = () => {
            if (typeof window._atelierShowLobby === 'function') {
                window._atelierShowLobby();
            }
        };
        gallery.innerHTML=`<header class="tools-gallery-heading"><span>DROPSITE / TOOLS</span><h1 id="toolsGalleryTitle">${text('Co dziś stworzymy?','What will you create today?')}</h1><p>${text('Wybierz narzędzie. Dodaj plik. Zrób z nim coś więcej.','Choose a tool. Add a file. Take it a little further.')}</p></header><div class="tools-gallery-grid">${data.map(([id,tone,badge,title,titleEn,desc,descEn],i)=>`<article class="tools-gallery-card tone-${tone}"><button type="button" class="tools-gallery-launch" data-launch="${id}" ${id==='compression'?'aria-expanded="false" aria-controls="toolsCompressionChoices"':''}><div class="tools-gallery-art art-${id}" aria-hidden="true"><span class="tools-gallery-orbit"></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${icons[['edit','qr','compress','xray','video'][i]]}</svg><span class="tools-gallery-art-label">${badge}</span></div><div class="tools-gallery-copy"><span class="tools-gallery-index">0${i+1}</span><h2>${pl()?title:titleEn}</h2><p>${pl()?desc:descEn}</p><span class="tools-gallery-cta">${id==='compression'?text('Wybierz format','Choose format'):text('Otwórz narzędzie','Open tool')} <span aria-hidden="true">↗</span></span></div></button>${id==='compression'?`<div id="toolsCompressionChoices" class="tools-compression-choices" hidden><button type="button" data-launch="convert">${text('Zdjęcia i konwersja','Images & conversion')} <span aria-hidden="true">↗</span></button><button type="button" data-launch="video-compress">${text('Kompresja wideo','Video compression')} <span aria-hidden="true">↗</span></button><button type="button" data-launch="compress">${text('Kompresja PDF','PDF compression')} <span aria-hidden="true">↗</span></button></div>`:''}</article>`).join('')}</div><p class="tools-gallery-status" role="status" aria-live="polite"></p>`;
        const nav=document.createElement('div');nav.className='tools-orbit-nav';
        nav.innerHTML=`<button type="button" aria-label="${text('Poprzednia karta','Previous card')}"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M14 6l-6 6 6 6"/></svg></button><span>${text('Przeci\u0105gnij, aby obr\u00f3ci\u0107','Drag to rotate')}</span><button type="button" aria-label="${text('Nast\u0119pna karta','Next card')}"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M10 6l6 6-6 6"/></svg></button>`;
        nav.querySelectorAll('button').forEach((b,i)=>b.onclick=()=>choose(selectedIndex+(i?1:-1)));gallery.append(nav);
        const choices=picks.querySelectorAll('[data-atelier-select],[data-pick]');choices.forEach(b=>b.remove());
        data.forEach((row,i)=>{const b=document.createElement('button');b.type='button';b.className='atelier-choice';b.dataset.pick=String(i);b.innerHTML=`<span class="atelier-choice-num">0${i+1}</span><span class="atelier-choice-copy"><strong>${row[pl()?3:4]}</strong><small>${row[2]}</small></span><span class="atelier-choice-arrow" aria-hidden="true">&#8599;</span>`;b.onclick=()=>choose(i);picks.insertBefore(b,picks.querySelector('.atelier-selection'));});
        choose(selectedIndex);
    }
    async function launch(tool,button){

        if(busy)return;
        if(tool==='compression'){const choices=gallery.querySelector('#toolsCompressionChoices');choices.hidden=!choices.hidden;button.setAttribute('aria-expanded',String(!choices.hidden));return;}
        if(tool==='grabber'){const nav=document.querySelector('.nav-btn[data-target="view-pobieracz"], [data-target="view-pobieracz"]');if(nav)nav.click();else window.switchView?.('view-pobieracz');return;}
        busy=true;button.disabled=true;button.setAttribute('aria-busy','true');
        const status=gallery.querySelector('[role="status"]');status.textContent=text('Otwieranie narzędzia…','Opening tool…');
        try {await window.loadToolboxScripts();if(view.hidden)return;window.switchToolTab(tool,false);showWorkspace(tool);back?.focus({preventScroll:true});}
        catch {status.textContent=text('Nie udało się otworzyć narzędzia. Spróbuj ponownie.','Could not open the tool. Please try again.');}
        finally {busy=false;button.disabled=false;button.removeAttribute('aria-busy');if(gallery.hidden)status.textContent='';}
    }
    gallery.addEventListener('click',event=>{
        const button=event.target.closest('[data-launch]');
        if(!button)return;
        const isCta = !!event.target.closest('.tools-gallery-cta');
        const index=data.findIndex(row=>row[0]===button.dataset.launch);
        if(index>=0){
            if (button.dataset.launch === 'compression') {
                const choices = gallery.querySelector('#toolsCompressionChoices');
                if (choices) {
                    choices.hidden = !choices.hidden;
                    button.setAttribute('aria-expanded', String(!choices.hidden));
                }
                choose(index);
                return;
            }
            if (selectedIndex === index || isCta) {
                launch(button.dataset.launch, button);
            } else {
                choose(index);
            }
            return;
        }
        launch(button.dataset.launch,button);
    });
    document.getElementById('atelierOpen').addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();const id=data[selectedIndex][0];launch(id,gallery.querySelector(`[data-launch="${id}"]`));},true);
    document.addEventListener('dropsite_language_changed',render);
    new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    render();
    const params=new URLSearchParams(location.search),path=location.pathname.replace(/\/$/,'');
    if(params.has('tool') || (path && !['/narzedzia','/tools','/index.html'].includes(path) && !view.hidden))showWorkspace();
})();
