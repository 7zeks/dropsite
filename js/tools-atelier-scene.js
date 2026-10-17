import * as THREE from './vendor/three.module.min.js';

// No uploaded files enter this scene. All 3D geometric tool icons are rendered procedurally.
export function createAtelierScene({ canvas, onSelect, gentle }) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
    renderer.setClearColor(0x000000, 0);
    if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, .1, 50);
    camera.position.set(0, 1.3, 11);

    const world = new THREE.Group();
    scene.add(world);

    // ==============================================================
    // OŚWIETLENIE CYBER-LUXURY (Studio wielopunktowe Apple Pro)
    // ==============================================================
    // 1. Zrównoważone miękkie światło otoczenia
    scene.add(new THREE.HemisphereLight(0xe4f7ec, 0x060f18, 2.2));

    // 2. Główne światło kluczowe (Key Light) - miękki, elegancki kąt z góry
    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(-3, 7, 6);
    scene.add(key);

    // 3. Podwójne subtelne światła konturowe (Dual Rim Lights)
    const rimMint = new THREE.DirectionalLight(0xa7f3d0, 1.8);
    rimMint.position.set(5, 4, -3);
    scene.add(rimMint);

    const rimCyan = new THREE.DirectionalLight(0x7dd3fc, 1.4);
    rimCyan.position.set(-5, 3, -3);
    scene.add(rimCyan);

    // 4. Przednie wypełnienie (Front Fill) - delikatne rozjaśnienie powierzchni kart
    const frontFill = new THREE.DirectionalLight(0xdcfce7, 1.4);
    frontFill.position.set(0, 3, 8);
    scene.add(frontFill);

    // 5. Rozproszona, szeroka poświata platformy (miękkie, niepunktowe światło)
    const stageGlow = new THREE.PointLight(0x34d399, 1.0, 14, 2.0);
    stageGlow.position.set(0, 1.5, 1.0);
    scene.add(stageGlow);

    // Mapa odbić otoczenia (dark obsidian + mint reflections)
    const environment = document.createElement('canvas');
    environment.width = 512;
    environment.height = 256;
    const env = environment.getContext('2d');
    const eg = env.createLinearGradient(0, 0, 0, 256);
    eg.addColorStop(0, '#c4e7d4');
    eg.addColorStop(0.35, '#203932');
    eg.addColorStop(0.65, '#0b161c');
    eg.addColorStop(1, '#06090d');
    env.fillStyle = eg;
    env.fillRect(0, 0, 512, 256);
    env.fillStyle = '#fafff8';
    env.fillRect(40, 15, 50, 140);
    env.fillRect(290, 30, 20, 100);

    let envTarget = null;
    try {
        const environmentTexture = new THREE.CanvasTexture(environment);
        environmentTexture.mapping = THREE.EquirectangularReflectionMapping;
        if ('colorSpace' in environmentTexture && THREE.SRGBColorSpace) {
            environmentTexture.colorSpace = THREE.SRGBColorSpace;
        }
        const pmrem = new THREE.PMREMGenerator(renderer);
        envTarget = pmrem.fromEquirectangular(environmentTexture);
        scene.environment = envTarget.texture;
        environmentTexture.dispose();
        pmrem.dispose();
    } catch (e) {
        console.warn('Atelier environment map fallback:', e);
    }

    // ==============================================================
    // PALETA MATERIAŁÓW (Masywne, wyraziste fasetowane materiały Cyber-Luxury)
    // ==============================================================
    const materials = {
        glass: new THREE.MeshPhysicalMaterial({ color: 0xc4e7d4, metalness: .18, roughness: .08, transmission: .68, thickness: .32, transparent: true, opacity: .88, clearcoat: 1, ior: 1.48, envMapIntensity: 2.0 }),
        obsidian: new THREE.MeshPhysicalMaterial({ color: 0x080f18, metalness: .92, roughness: .14, clearcoat: 1.0, clearcoatRoughness: .05, envMapIntensity: 2.2 }),
        chassis: new THREE.MeshPhysicalMaterial({ color: 0x0e1724, metalness: .88, roughness: .20, clearcoat: .95, clearcoatRoughness: .08, envMapIntensity: 1.8 }),
        titanium: new THREE.MeshStandardMaterial({ color: 0x22354c, metalness: .92, roughness: .18 }),
        goldSeal: new THREE.MeshStandardMaterial({ color: 0xf5d372, metalness: .94, roughness: .22, emissive: 0x784f08, emissiveIntensity: 0.18 }),
        goldDetail: new THREE.MeshStandardMaterial({ color: 0xfde047, metalness: .96, roughness: .14 }),
        sapphireGlass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: .06, roughness: .03, transmission: .86, transparent: true, opacity: .72, clearcoat: 1.0, clearcoatRoughness: .04, ior: 1.52, envMapIntensity: 2.4 }),
        lensGlass: new THREE.MeshPhysicalMaterial({ color: 0x67e8f9, metalness: .10, roughness: .02, transmission: .92, transparent: true, opacity: .86, clearcoat: 1.0, ior: 1.62, envMapIntensity: 2.6 }),
        pearl: new THREE.MeshPhysicalMaterial({ color: 0xd9ede2, metalness: .2, roughness: .20, clearcoat: .9 }),
        mint: new THREE.MeshStandardMaterial({ color: 0xc4e7d4, metalness: .5, roughness: .18, emissive: 0x34d399, emissiveIntensity: 0.28 }),
        emeraldGlow: new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x10b981, emissiveIntensity: 0.95, roughness: .16, metalness: .32 }),
        rubyGlow: new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.95, roughness: .2, metalness: .1 }),
        dark: new THREE.MeshPhysicalMaterial({ color: 0x0c131d, metalness: .8, roughness: .22, clearcoat: .8 }),
        ink: new THREE.MeshStandardMaterial({ color: 0x05090f, metalness: .4, roughness: .3 }),
    };

    const objects = [], layers = [], stegoCrystals = [];
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let mouseHover = { x: 0, y: 0 };
    let selected = 'stego', expanded = false, opening = 0, openingTarget = 0, active = false, raf = 0, drag = 0, dragTarget = 0, lost = false;
    let started = performance.now(), last = 0, lastInteraction = started;

    function roundedShape(w, h, radius) {
        const s = new THREE.Shape(), x = -w / 2, y = -h / 2, r = radius;
        s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
        s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
        s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
        return s;
    }

    // Czysta, precyzyjnie frezowana obudowa (chassis) z luksusowym mikrofazowaniem krawędzi
    function slab(w, h, material = materials.chassis, radius = .18) {
        const geometry = new THREE.ExtrudeGeometry(roundedShape(w, h, radius), { 
            depth: .036, 
            bevelEnabled: true, 
            bevelThickness: .012, 
            bevelSize: .012, 
            bevelSegments: 4, 
            steps: 1, 
            curveSegments: 20 
        });
        geometry.center();
        return new THREE.Mesh(geometry, material);
    }

    function texture(w, h, paint) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const context = c.getContext('2d');
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        paint(context, w, h);
        const tex = new THREE.CanvasTexture(c);
        if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        try {
            tex.anisotropy = (renderer.capabilities && typeof renderer.capabilities.getMaxAnisotropy === 'function')
                ? renderer.capabilities.getMaxAnisotropy()
                : 16;
        } catch {
            tex.anisotropy = 8;
        }
        return tex;
    }

    // Płaska tafla graficzna osadzona idealnie w fazowanej ramce
    function face(group, tex, w, h, z = .034) {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: true, side: THREE.DoubleSide }));
        mesh.position.z = z;
        group.add(mesh);
        return mesh;
    }

    function item(tool) {
        const g = new THREE.Group();
        g.userData.tool = tool;
        g.userData.destination = new THREE.Vector3();
        g.userData.baseRotation = new THREE.Euler(-.13, -.24, -.12);
        world.add(g);
        objects.push(g);
        return g;
    }

    // ==============================================================
    // 1. CYBER SKANER & MATRYCA KAMUFLAŻU LSB ('stego')
    // ==============================================================
    const stego = item('stego');

    // Warstwa 2 (Front): Wyrazisty skaner HUD z czytelnymi napisami i mocnymi ramkami (1024x1280)
    const scannerHudTex = texture(1024, 1280, (ctx, w, h) => {
        ctx.beginPath(); ctx.roundRect(0, 0, w, h, 48); ctx.clip();
        
        // Bogate tło cyber-studio
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#101d2e');
        bg.addColorStop(0.5, '#0a1320');
        bg.addColorStop(1, '#050a12');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // Wyraziste podwójne obramowanie
        ctx.strokeStyle = 'rgba(196, 231, 212, 0.45)';
        ctx.lineWidth = 4;
        ctx.strokeRect(3, 3, w - 6, h - 6);

        ctx.strokeStyle = 'rgba(52, 211, 153, 0.25)';
        ctx.lineWidth = 2;
        ctx.strokeRect(16, 16, w - 32, h - 32);

        // 4 narożne znaczniki kadru HUD
        ctx.strokeStyle = '#c4e7d4';
        ctx.lineWidth = 6;
        const cLen = 44, cPad = 28;
        ctx.beginPath(); ctx.moveTo(cPad, cPad + cLen); ctx.lineTo(cPad, cPad); ctx.lineTo(cPad + cLen, cPad); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w - cPad - cLen, cPad); ctx.lineTo(w - cPad, cPad); ctx.lineTo(w - cPad, cPad + cLen); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cPad, h - cPad - cLen); ctx.lineTo(cPad, h - cPad); ctx.lineTo(cPad + cLen, h - cPad); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w - cPad - cLen, h - cPad); ctx.lineTo(w - cPad, h - cPad); ctx.lineTo(w - cPad, h - cPad - cLen); ctx.stroke();

        // Siatka techniczna
        ctx.strokeStyle = 'rgba(196, 231, 212, 0.05)';
        ctx.lineWidth = 1.5;
        for (let x = 64; x < w; x += 64) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 64; y < h; y += 64) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // --- NAGŁÓWEK KARTY ---
        ctx.fillStyle = '#c4e7d4';
        ctx.font = "800 24px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText('● DROPSITE // CYFROWY KAMUFLAŻ', 72, 96);

        // Badge prawy
        ctx.fillStyle = 'rgba(52, 211, 153, 0.22)';
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(w - 360, 60, 288, 52, 26); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#34d399';
        ctx.font = "800 21px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText('STEGANOGRAFIA LSB', w - 330, 94);

        // Tytuł główny
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#ffffff';
        ctx.font = "800 56px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText('Cyfrowy Kamuflaż', 72, 204);
        ctx.shadowBlur = 0;

        ctx.font = "600 26px 'Plus Jakarta Sans', sans-serif";
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('Ukrywanie tajnych plików w obrazach • 100% RAM', 72, 252);

        // Linia podziału
        ctx.strokeStyle = 'rgba(196, 231, 212, 0.35)';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(72, 292); ctx.lineTo(w - 72, 292); ctx.stroke();

        // --- CELOWNIK / RADAR HUD W CENTRUM ---
        const cx = w * 0.5, cy = 690;
        const radGlow = ctx.createRadialGradient(cx, cy, 20, cx, cy, 320);
        radGlow.addColorStop(0, 'rgba(52, 211, 153, 0.22)');
        radGlow.addColorStop(0.7, 'rgba(196, 231, 212, 0.05)');
        radGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = radGlow;
        ctx.beginPath(); ctx.arc(cx, cy, 320, 0, Math.PI * 2); ctx.fill();

        [88, 180, 260, 320].forEach((r, idx) => {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = idx === 2 ? 'rgba(52, 211, 153, 0.75)' : 'rgba(196, 231, 212, 0.35)';
            ctx.lineWidth = idx === 2 ? 3.5 : 2;
            if (idx === 1) ctx.setLineDash([10, 14]);
            else ctx.setLineDash([]);
            ctx.stroke();
        });
        ctx.setLineDash([]);

        // Znaczniki kątowe na zewnętrznym pierścieniu
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * 308, cy + Math.sin(a) * 308);
            ctx.lineTo(cx + Math.cos(a) * 332, cy + Math.sin(a) * 332);
            ctx.strokeStyle = '#c4e7d4';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Oś celownika
        ctx.strokeStyle = 'rgba(196, 231, 212, 0.45)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx - 340, cy); ctx.lineTo(cx + 340, cy);
        ctx.moveTo(cx, cy - 340); ctx.lineTo(cx + 340, cy);
        ctx.stroke();

        // Centralna ikona kłódki / tarczy w celowniku
        ctx.fillStyle = 'rgba(12, 22, 34, 0.95)';
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.roundRect(cx - 72, cy - 72, 144, 144, 28);
        ctx.fill(); ctx.stroke();

        ctx.strokeStyle = '#c4e7d4';
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(cx, cy - 12, 18, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = '#c4e7d4';
        ctx.fillRect(cx - 24, cy - 12, 48, 36);
        ctx.fillStyle = '#0b1622';
        ctx.beginPath(); ctx.arc(cx, cy + 6, 6, 0, Math.PI * 2); ctx.fill();

        // --- DOLNA KARTA STATUSOWA ---
        ctx.fillStyle = 'rgba(12, 22, 34, 0.96)';
        ctx.strokeStyle = 'rgba(196, 231, 212, 0.4)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(64, h - 196, w - 128, 144, 32);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = "800 29px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText('STATUS: ŁADUNEK ZASZYFROWANY', 104, h - 136);

        ctx.fillStyle = '#94a3b8';
        ctx.font = "600 23px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText('Niewidoczne dla postronnych • LSB Matrix • AES-256', 104, h - 92);

        ctx.fillStyle = '#34d399';
        ctx.beginPath(); ctx.arc(w - 112, h - 124, 12, 0, Math.PI * 2); ctx.fill();
    });

    // Warstwa 1 (Środek): Ukryty ładunek kryptograficzny (odsłaniany przy rozsunięciu) (1024x1280)
    const secretPayloadTex = texture(1024, 1280, (ctx, w, h) => {
        ctx.beginPath(); ctx.roundRect(0, 0, w, h, 48); ctx.clip();
        ctx.fillStyle = '#060c14';
        ctx.fillRect(0, 0, w, h);

        // Strumień binarny
        ctx.fillStyle = 'rgba(52, 211, 153, 0.4)';
        ctx.font = "24px monospace";
        for (let y = 80; y < h - 40; y += 48) {
            let row = '';
            for (let i = 0; i < 28; i++) {
                row += ((i * 7 + y) % 5 === 0) ? '1 ' : '0 ';
            }
            ctx.fillText(row, 56, y);
        }

        // Skrytka kryptograficzna
        const bx = 64, by = h * 0.38, bw = w - 128, bh = 300;
        ctx.fillStyle = 'rgba(12, 22, 34, 0.96)';
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 36); ctx.fill(); ctx.stroke();

        ctx.fillStyle = '#34d399';
        ctx.font = "800 22px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText('SECRET PAYLOAD // TOP CLASSIFIED', bx + 44, by + 68);

        ctx.fillStyle = '#ffffff';
        ctx.font = "800 44px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText('Ukryty plik w pikselach', bx + 44, by + 136);

        ctx.fillStyle = '#94a3b8';
        ctx.font = "500 23px monospace";
        ctx.fillText('HASH: 9f86d081884c7d659a2feaa0c55ad015', bx + 44, by + 200);
        ctx.fillText('AES-256-GCM • ZERO TRACES IN RAM', bx + 44, by + 244);
    });

    // Warstwa 0 (Baza): Wygrawerowany układ scalony / krzemowy procesor
    const etchedSiliconTex = texture(512, 640, (ctx, w, h) => {
        ctx.fillStyle = '#060c14';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(196, 231, 212, 0.3)';
        ctx.lineWidth = 1.5;
        for (let k = 32; k < w; k += 40) {
            ctx.beginPath(); ctx.moveTo(k, 32); ctx.lineTo(k, h - 32); ctx.stroke();
        }
        for (let y = 40; y < h; y += 40) {
            ctx.beginPath(); ctx.moveTo(32, y); ctx.lineTo(w - 32, y); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(52, 211, 153, 0.25)';
        ctx.fillRect(w / 2 - 60, h / 2 - 60, 120, 120);
    });

    for (let i = 0; i < 3; i++) {
        const g = new THREE.Group();
        g.userData.layer = i;
        g.add(slab(2.06, 2.58, i === 2 ? materials.chassis : (i === 1 ? materials.titanium : materials.obsidian)));
        if (i === 2) {
            face(g, scannerHudTex, 1.95, 2.44, .034);
        }
        if (i === 1) {
            face(g, secretPayloadTex, 1.93, 2.4, .034);
            // 3D Obrotowy kryształ danych LSB
            const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), materials.emeraldGlow);
            crystal.position.set(0, -0.04, 0.054);
            g.add(crystal);
            stegoCrystals.push(crystal);
        }
        if (i === 0) {
            face(g, etchedSiliconTex, 1.95, 2.44, .034);
            // 3D Krzemowa płytka procesora
            const chipDie = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.66, 0.024), materials.titanium);
            chipDie.position.set(0, 0, 0.044);
            g.add(chipDie);
            const chipCore = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.028), materials.emeraldGlow);
            chipCore.position.set(0, 0, 0.048);
            g.add(chipCore);
        }
        stego.add(g);
        layers.push(g);
    }

    // Subtelna aureola podświetlenia umieszczona BEZPIECZNIE Z TYŁU za kartą (nie przecina lica!)
    const haloMat = new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.28 });
    const scannerAura = new THREE.Mesh(new THREE.TorusGeometry(1.72, .012, 16, 96), haloMat);
    scannerAura.position.z = -.14;
    stego.add(scannerAura);

    // ==============================================================
    // 2. WEKTOROWA PIECZĘĆ CYFROWA & CERTYFIKAT eIDAS ('edit')
    // ==============================================================
    const pdf = item('edit');

    const certificateTex = texture(1024, 1280, (ctx, w, h) => {
        ctx.beginPath(); ctx.roundRect(0, 0, w, h, 48); ctx.clip();
        
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#101d2e');
        bg.addColorStop(0.5, '#0a1320');
        bg.addColorStop(1, '#050a12');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // Wyraziste podwójne obramowanie
        ctx.strokeStyle = 'rgba(196, 231, 212, 0.45)';
        ctx.lineWidth = 4;
        ctx.strokeRect(3, 3, w - 6, h - 6);

        ctx.strokeStyle = 'rgba(52, 211, 153, 0.25)';
        ctx.lineWidth = 2;
        ctx.strokeRect(16, 16, w - 32, h - 32);

        // 4 narożne znaczniki
        ctx.strokeStyle = '#c4e7d4';
        ctx.lineWidth = 6;
        const cLen = 44, cPad = 28;
        ctx.beginPath(); ctx.moveTo(cPad, cPad + cLen); ctx.lineTo(cPad, cPad); ctx.lineTo(cPad + cLen, cPad); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w - cPad - cLen, cPad); ctx.lineTo(w - cPad, cPad); ctx.lineTo(w - cPad, cPad + cLen); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cPad, h - cPad - cLen); ctx.lineTo(cPad, h - cPad); ctx.lineTo(cPad + cLen, h - cPad); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w - cPad - cLen, h - cPad); ctx.lineTo(w - cPad, h - cPad); ctx.lineTo(w - cPad, h - cPad - cLen); ctx.stroke();

        // Tło dokumentowe
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1.5;
        for (let y = 40; y < h; y += 36) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // --- NAGŁÓWEK KARTY ---
        ctx.fillStyle = '#c4e7d4';
        ctx.font = "800 24px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText('● DROPSITE // PDF STUDIO LUXURY', 72, 96);

        // Badge prawy
        ctx.fillStyle = 'rgba(52, 211, 153, 0.22)';
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(w - 320, 60, 248, 52, 26); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#34d399';
        ctx.font = "800 21px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText('ZGODNE Z eIDAS', w - 290, 94);

        // Tytuł dokumentu
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#ffffff';
        ctx.font = "800 56px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText('Certyfikat & Podpis', 72, 204);
        ctx.shadowBlur = 0;

        ctx.font = "600 26px 'Plus Jakarta Sans', sans-serif";
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('Oficjalny podpis elektroniczny w bezpiecznym RAM', 72, 252);

        // Linia podziału
        ctx.strokeStyle = 'rgba(196, 231, 212, 0.35)';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(72, 292); ctx.lineTo(w - 72, 292); ctx.stroke();

        // Paragrafy tekstu z maskowaniem RODO
        const lines = [
            { w1: 380, w2: 190, redact: true },
            { w1: 620, w2: 0, redact: false },
            { w1: 300, w2: 260, redact: true },
            { w1: 540, w2: 0, redact: false },
            { w1: 200, w2: 340, redact: true }
        ];
        lines.forEach((l, idx) => {
            const y = 360 + idx * 56;
            ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
            ctx.fillRect(72, y, l.w1, 16);
            if (l.redact) {
                ctx.fillStyle = 'rgba(52, 211, 153, 0.5)';
                ctx.strokeStyle = '#34d399';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(72 + l.w1 + 24, y - 6, l.w2, 28, 8);
                ctx.fill(); ctx.stroke();
            }
        });

        // Wektorowa Notarialna Pieczęć eIDAS (Certified Seal)
        const sealX = w - 180, sealY = h - 200, sealR = 100;
        ctx.save();
        ctx.translate(sealX, sealY);
        ctx.strokeStyle = '#c4e7d4';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 16) {
            const r1 = sealR - 6, r2 = sealR + 10;
            ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
            ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
        }
        ctx.stroke();

        ctx.beginPath(); ctx.arc(0, 0, sealR, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, sealR - 16, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(52, 211, 153, 0.22)';
        ctx.fill();

        ctx.fillStyle = '#c4e7d4';
        ctx.font = "800 17px 'Plus Jakarta Sans', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText('KWALIFIKOWANY', 0, -32);
        ctx.fillStyle = '#ffffff';
        ctx.font = "800 19px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText('PODPIS eIDAS', 0, -8);
        ctx.fillStyle = '#34d399';
        ctx.font = "800 17px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText('★ 100% RAM ★', 0, 26);
        ctx.fillStyle = '#c4e7d4';
        ctx.fillText('ZWERYFIKOWANY', 0, 48);
        ctx.restore();

        // Kaligraficzny podpis cyfrowy
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 6;
        ctx.shadowColor = 'rgba(52, 211, 153, 0.7)';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(84, h - 160);
        ctx.bezierCurveTo(150, h - 240, 190, h - 120, 280, h - 190);
        ctx.bezierCurveTo(360, h - 260, 390, h - 140, 480, h - 170);
        ctx.bezierCurveTo(340, h - 150, 240, h - 140, 520, h - 150);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#94a3b8';
        ctx.font = "600 23px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText('Certyfikat podpisany cyfrowo • ID: QES-2026 • SHA-256', 84, h - 85);
    });

    pdf.add(slab(1.95, 2.52, materials.chassis));
    face(pdf, certificateTex, 1.86, 2.42, .034);

    // ==============================================================
    // 3. KASETA WIDEO & KOMPRESOR WIDEO ('video-compress')
    // ==============================================================
    const video = item('video-compress');

    const videoPlayerTex = texture(1024, 760, (ctx, w, h) => {
        ctx.beginPath(); ctx.roundRect(0, 0, w, h, 48); ctx.clip();
        
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#101d2e');
        bg.addColorStop(0.5, '#0a1320');
        bg.addColorStop(1, '#050a12');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // Podwójne obramowanie
        ctx.strokeStyle = 'rgba(196, 231, 212, 0.45)';
        ctx.lineWidth = 4;
        ctx.strokeRect(3, 3, w - 6, h - 6);

        ctx.strokeStyle = 'rgba(52, 211, 153, 0.25)';
        ctx.lineWidth = 2;
        ctx.strokeRect(16, 16, w - 32, h - 32);

        // 4 narożne znaczniki
        ctx.strokeStyle = '#c4e7d4';
        ctx.lineWidth = 6;
        const cLen = 44, cPad = 28;
        ctx.beginPath(); ctx.moveTo(cPad, cPad + cLen); ctx.lineTo(cPad, cPad); ctx.lineTo(cPad + cLen, cPad); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w - cPad - cLen, cPad); ctx.lineTo(w - cPad, cPad); ctx.lineTo(w - cPad, cPad + cLen); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cPad, h - cPad - cLen); ctx.lineTo(cPad, h - cPad); ctx.lineTo(cPad + cLen, h - cPad); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w - cPad - cLen, h - cPad); ctx.lineTo(w - cPad, h - cPad); ctx.lineTo(w - cPad, h - cPad - cLen); ctx.stroke();

        // --- NAGŁÓWEK KARTY ---
        ctx.fillStyle = '#c4e7d4';
        ctx.font = "800 24px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText('● DROPSITE // STUDIO WIDEO', 64, 88);

        // Badge prawy z czerwoną kropką REC
        ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(w - 320, 56, 256, 52, 26); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(w - 290, 82, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = "800 21px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText('LIMIT 25 MB • RAM', w - 264, 90);

        // Tytuł główny
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#ffffff';
        ctx.font = "800 56px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText('Kompresor Wideo', 64, 184);
        ctx.shadowBlur = 0;

        ctx.font = "600 26px 'Plus Jakarta Sans', sans-serif";
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('Lokalne zmniejszanie wagi filmu bez utraty jakości', 64, 230);

        // Linia podziału
        ctx.strokeStyle = 'rgba(196, 231, 212, 0.35)';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(64, 264); ctx.lineTo(w - 64, 264); ctx.stroke();

        // Szpule taśmy filmowej
        const rY = 450;
        [w * 0.22, w * 0.78].forEach(rX => {
            const reelR = 96;
            ctx.strokeStyle = 'rgba(196, 231, 212, 0.4)';
            ctx.lineWidth = 3.5;
            ctx.beginPath(); ctx.arc(rX, rY, reelR, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(rX, rY, 36, 0, Math.PI * 2); ctx.stroke();
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
                ctx.beginPath();
                ctx.moveTo(rX + Math.cos(a) * 36, rY + Math.sin(a) * 36);
                ctx.lineTo(rX + Math.cos(a) * reelR, rY + Math.sin(a) * reelR);
                ctx.stroke();
            }
        });

        // Środkowy wykres fali dźwiękowej (audio spectrum)
        const bars = [18, 36, 54, 76, 110, 85, 135, 150, 115, 80, 102, 65, 35, 18];
        const barW = 10, barGap = 10;
        const totalW = bars.length * (barW + barGap);
        const startX = (w - totalW) / 2;
        bars.forEach((bh, i) => {
            const bx = startX + i * (barW + barGap);
            const grad = ctx.createLinearGradient(0, rY - bh / 2, 0, rY + bh / 2);
            grad.addColorStop(0, '#38bdf8');
            grad.addColorStop(0.5, '#c4e7d4');
            grad.addColorStop(1, '#34d399');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(bx, rY - bh / 2, barW, bh, 5);
            ctx.fill();
        });

        // Wskaźnik kompresji na dole
        ctx.fillStyle = 'rgba(12, 22, 34, 0.96)';
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(48, h - 110, w - 96, 74, 22);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = "800 24px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText('142 MB ➔ 18 MB (-87%)', 80, h - 64);

        ctx.fillStyle = '#34d399';
        ctx.font = "800 20px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText('WebCodecs GPU • 100% RAM', w - 340, h - 64);
    });

    video.add(slab(2.55, 1.88, materials.chassis, .16));
    face(video, videoPlayerTex, 2.44, 1.78, .034);

    // ==============================================================
    // 4. MONOLIT KODÓW QR 4K & WEKTOR SVG ('qr-studio')
    // ==============================================================
    const qr = item('qr-studio');
    qr.add(slab(2.06, 2.58, materials.chassis, .16));

    // Frontowa tafla z nagłówkiem i wektorowym kodem QR (1024x1280)
    const qrCardTex = texture(1024, 1280, (ctx, w, h) => {
        ctx.beginPath(); ctx.roundRect(0, 0, w, h, 48); ctx.clip();
        
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#101d2e');
        bg.addColorStop(0.5, '#0a1320');
        bg.addColorStop(1, '#050a12');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // Podwójne obramowanie
        ctx.strokeStyle = 'rgba(196, 231, 212, 0.45)';
        ctx.lineWidth = 4;
        ctx.strokeRect(3, 3, w - 6, h - 6);

        ctx.strokeStyle = 'rgba(52, 211, 153, 0.25)';
        ctx.lineWidth = 2;
        ctx.strokeRect(16, 16, w - 32, h - 32);

        // 4 narożne znaczniki
        ctx.strokeStyle = '#c4e7d4';
        ctx.lineWidth = 6;
        const cLen = 44, cPad = 28;
        ctx.beginPath(); ctx.moveTo(cPad, cPad + cLen); ctx.lineTo(cPad, cPad); ctx.lineTo(cPad + cLen, cPad); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w - cPad - cLen, cPad); ctx.lineTo(w - cPad, cPad); ctx.lineTo(w - cPad, cPad + cLen); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cPad, h - cPad - cLen); ctx.lineTo(cPad, h - cPad); ctx.lineTo(cPad + cLen, h - cPad); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w - cPad - cLen, h - cPad); ctx.lineTo(w - cPad, h - cPad); ctx.lineTo(w - cPad, h - cPad - cLen); ctx.stroke();

        // Tło techniczne
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1.5;
        for (let y = 40; y < h; y += 36) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // --- NAGŁÓWEK KARTY ---
        ctx.fillStyle = '#c4e7d4';
        ctx.font = "800 24px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText('● DROPSITE // STUDIO KODÓW QR', 72, 96);

        // Badge prawy
        ctx.fillStyle = 'rgba(52, 211, 153, 0.22)';
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(w - 320, 60, 248, 52, 26); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#34d399';
        ctx.font = "800 21px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText('WEKTOR SVG • 4K', w - 290, 94);

        // Tytuł główny
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#ffffff';
        ctx.font = "800 56px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText('Generator Kodów QR', 72, 204);
        ctx.shadowBlur = 0;

        ctx.font = "600 26px 'Plus Jakarta Sans', sans-serif";
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('Generowanie kodów QR Ultra HD • Własny styl & RAM', 72, 252);

        // Linia podziału
        ctx.strokeStyle = 'rgba(196, 231, 212, 0.35)';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(72, 292); ctx.lineTo(w - 72, 292); ctx.stroke();

        // Ciemne tło ramki matrycy QR
        ctx.fillStyle = 'rgba(8, 16, 26, 0.95)';
        ctx.strokeStyle = 'rgba(196, 231, 212, 0.35)';
        ctx.lineWidth = 3.5;
        const qrBoxSize = 640;
        const qrX = (w - qrBoxSize) / 2, qrY = 340;
        ctx.beginPath();
        ctx.roundRect(qrX, qrY, qrBoxSize, qrBoxSize, 36);
        ctx.fill(); ctx.stroke();

        // Rysujemy matrycę QR wewnątrz ramki (21x21 siatka modułów)
        const pad = 48;
        const modSize = (qrBoxSize - pad * 2) / 21;
        
        // 3 duże narożne wzorce pozycjonujące (Finders)
        const drawFinder = (fx, fy) => {
            const rx = qrX + pad + fx * modSize, ry = qrY + pad + fy * modSize;
            // Zewnętrzny obrys (7x7)
            ctx.fillStyle = '#34d399';
            ctx.beginPath(); ctx.roundRect(rx, ry, 7 * modSize, 7 * modSize, 16); ctx.fill();
            // Wewnętrzne wycięcie (5x5)
            ctx.fillStyle = '#08101a';
            ctx.beginPath(); ctx.roundRect(rx + modSize, ry + modSize, 5 * modSize, 5 * modSize, 10); ctx.fill();
            // Środek (3x3)
            ctx.fillStyle = '#c4e7d4';
            ctx.beginPath(); ctx.roundRect(rx + 2 * modSize, ry + 2 * modSize, 3 * modSize, 3 * modSize, 6); ctx.fill();
        };
        drawFinder(0, 0);
        drawFinder(14, 0);
        drawFinder(0, 14);

        // Moduły danych
        ctx.fillStyle = 'rgba(196, 231, 212, 0.85)';
        for (let r = 0; r < 21; r++) {
            for (let c = 0; c < 21; c++) {
                if ((r < 8 && c < 8) || (r < 8 && c > 12) || (r > 12 && c < 8)) continue;
                if (r >= 8 && r <= 12 && c >= 8 && c <= 12) continue;
                if (((r * 13 + c * 17 + r * c * 3) % 11) < 5) {
                    const mx = qrX + pad + c * modSize + 2, my = qrY + pad + r * modSize + 2;
                    ctx.beginPath();
                    ctx.roundRect(mx, my, modSize - 4, modSize - 4, 4);
                    ctx.fill();
                }
            }
        }

        // Centralna tarcza Dropsite w kodzie QR
        const logoSize = 5 * modSize;
        const lx = qrX + (qrBoxSize - logoSize) / 2, ly = qrY + (qrBoxSize - logoSize) / 2;
        ctx.fillStyle = '#08121e';
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.roundRect(lx, ly, logoSize, logoSize, 16); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        const scx = lx + logoSize / 2, scy = ly + logoSize / 2;
        ctx.arc(scx, scy, 16, 0, Math.PI * 2);
        ctx.fill();

        // Pasek statusowy na dole
        ctx.fillStyle = '#94a3b8';
        ctx.font = "600 23px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText('Eksport: SVG 4K / Wektor • Zero śledzenia • 100% RAM', 84, h - 90);
    });
    face(qr, qrCardTex, 1.95, 2.44, .034);

    // Unoszące się w przestrzeni mikro-cząsteczki światła (Ambient Cyber-Dust)
    const dustCount = 80;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
        dustPositions[i] = (Math.random() - 0.5) * 12;
        dustPositions[i + 1] = (Math.random() - 0.5) * 6 + 0.3;
        dustPositions[i + 2] = (Math.random() - 0.5) * 8 - 0.5;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
        color: 0xc4e7d4,
        size: 0.032,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending
    });
    const dustParticles = new THREE.Points(dustGeo, dustMat);
    world.add(dustParticles);

    // ==============================================================
    // PODEST I AURA (CYBER LUXURY DISPLAY STAGE)
    // ==============================================================
    const stageGroup = new THREE.Group();
    stageGroup.position.set(0, -1.95, -0.6);
    world.add(stageGroup);

    // 1. Dolna, szeroka baza podestu z frezowanego tytanu
    const basePlinth = new THREE.Mesh(
        new THREE.CylinderGeometry(4.35, 4.45, 0.08, 96),
        new THREE.MeshStandardMaterial({
            color: 0x070e17,
            metalness: 0.85,
            roughness: 0.35
        })
    );
    basePlinth.position.y = -0.04;
    stageGroup.add(basePlinth);

    // 2. Główna platforma podestu (Dark Obsidian Glass z subtelnym fazowaniem krawędzi)
    const topPlinth = new THREE.Mesh(
        new THREE.CylinderGeometry(4.0, 4.15, 0.06, 96),
        new THREE.MeshPhysicalMaterial({ 
            color: 0x09121d, 
            metalness: 0.75, 
            roughness: 0.28, 
            clearcoat: 0.85, 
            clearcoatRoughness: 0.15, 
            envMapIntensity: 1.2 
        })
    );
    topPlinth.position.y = 0.03;
    stageGroup.add(topPlinth);

    // 3. Subtelny, nieszorstki pierścień szczelinowy z miękkim mikropodświetleniem (bez ostrego świecenia w kamerę)
    const neonRing = new THREE.Mesh(
        new THREE.TorusGeometry(4.01, 0.008, 16, 128),
        new THREE.MeshBasicMaterial({ 
            color: 0x34d399, 
            transparent: true, 
            opacity: 0.25 
        })
    );
    neonRing.rotation.x = Math.PI / 2;
    neonRing.position.y = 0.061;
    stageGroup.add(neonRing);

    // 4. Dyskretna, elegancka siatka techniczna na powierzchni podestu (delikatne linie, bez wielkiej zielonej plamy)
    const floorRadarTex = texture(1024, 1024, (ctx, w, h) => {
        const cx = w / 2, cy = h / 2;
        // Miękkie, cienkie okręgi koncentryczne
        [180, 320, 440].forEach((r, idx) => {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = idx === 1 ? 'rgba(52, 211, 153, 0.16)' : 'rgba(196, 231, 212, 0.08)';
            ctx.lineWidth = 1.2;
            if (idx === 1) ctx.setLineDash([6, 10]);
            else ctx.setLineDash([]);
            ctx.stroke();
        });
        ctx.setLineDash([]);

        // Subtelne znaczniki osi
        ctx.strokeStyle = 'rgba(196, 231, 212, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 440, cy); ctx.lineTo(cx + 440, cy);
        ctx.moveTo(cx, cy - 440); ctx.lineTo(cx + 440, cy);
        ctx.stroke();

        // Dyskretne małe nacięcia na zewnętrznym pierścieniu
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * 432, cy + Math.sin(a) * 432);
            ctx.lineTo(cx + Math.cos(a) * 448, cy + Math.sin(a) * 448);
            ctx.strokeStyle = 'rgba(52, 211, 153, 0.2)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    });

    const floorHolo = new THREE.Mesh(
        new THREE.PlaneGeometry(6.6, 6.6),
        new THREE.MeshBasicMaterial({ map: floorRadarTex, transparent: true, opacity: 0.75, depthWrite: false })
    );
    floorHolo.rotation.x = -Math.PI / 2;
    floorHolo.position.y = 0.063;
    stageGroup.add(floorHolo);

    // 4. Miękki, głęboki cień kontaktowy pod podestem
    const stageShadowTex = texture(512, 512, ctx => {
        const g = ctx.createRadialGradient(256, 256, 30, 256, 256, 250);
        g.addColorStop(0, 'rgba(0, 0, 0, 0.88)');
        g.addColorStop(0.5, 'rgba(0, 0, 0, 0.45)');
        g.addColorStop(0.85, 'rgba(0, 0, 0, 0.12)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 512, 512);
    });
    const stageShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(12, 8.5),
        new THREE.MeshBasicMaterial({ map: stageShadowTex, transparent: true, depthWrite: false })
    );
    stageShadow.rotation.x = -Math.PI / 2;
    stageShadow.position.set(0, -1.74, -0.6);
    world.add(stageShadow);

    // Cienie kontaktowe na samej powierzchni podestu (pod kartami)
    const cardShadowTex = texture(256, 256, ctx => {
        const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
        g.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
        g.addColorStop(0.5, 'rgba(0, 0, 0, 0.22)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 256);
    });
    const heroContactShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(3.6, 2.2),
        new THREE.MeshBasicMaterial({ map: cardShadowTex, transparent: true, depthWrite: false })
    );
    heroContactShadow.rotation.x = -Math.PI / 2;
    heroContactShadow.position.set(0, 0.045, 0.4);
    stageGroup.add(heroContactShadow);

    // Zrównoważony, przejrzysty układ galerii 3D (karta aktywna z przodu, pozostałe czytelnie rozłożone)
    function destinations(immediate = false) {
        let rest = 0;
        // 3 karty w tle: lewa, prawa, środkowa wyższa
        const places = [
            [-3.4, 0.45, -1.6],
            [3.4, 0.45, -1.6],
            [0, 0.95, -2.8]
        ];
        objects.forEach(object => {
            const isSelected = object.userData.tool === selected;
            const dest = isSelected ? [0, 0.52, 0.35] : places[rest++];
            object.userData.destination.set(...dest);
            object.userData.targetScale = isSelected ? 1.05 : 0.76;
            if (immediate) {
                object.position.copy(object.userData.destination);
                object.scale.setScalar(object.userData.targetScale);
            }
        });
    }

    function draw(now) {
        raf = 0;
        if (!active || lost) return;
        const targetFps = matchMedia('(max-width:720px)').matches ? 40 : 60;
        if (now - last < 1000 / targetFps) {
            raf = requestAnimationFrame(draw);
            return;
        }
        last = now;
        const isGentle = gentle(), ease = isGentle ? 1 : .095;
        opening += (openingTarget - opening) * ease;
        drag += (dragTarget - drag) * ease;
        
        // Płynny paralaks w odpowiedzi na kursor myszy (3D tilt)
        const hoverTiltX = isGentle ? 0 : mouseHover.y * 0.04;
        const hoverTiltY = isGentle ? 0 : mouseHover.x * 0.06;
        world.rotation.y = drag + hoverTiltY;
        world.rotation.x = hoverTiltX;

        // Dynamiczne mikro-animacje:
        // 1. Obrotowy kryształ rdzenia LSB w kamuflażu (gdy warstwy są rozsunięte)
        stegoCrystals.forEach(crystal => {
            if (!isGentle) {
                crystal.rotation.y += 0.016;
                crystal.rotation.x += 0.010;
            }
        });
        // 2. Dyskretne powolne unoszenie mikro-cząsteczek w przestrzeni
        if (dustParticles && !isGentle) {
            dustParticles.rotation.y = (now - started) * 0.00008;
        }

        objects.forEach((object, i) => {
            const isSelected = object.userData.tool === selected;
            const dest = object.userData.destination.clone();
            // Lewitacja antygrawitacyjna aktywnej karty
            if (!isGentle) {
                const floatY = isSelected ? Math.sin((now - started) * 0.0018) * 0.04 : 0;
                dest.y += floatY;
            }
            object.position.lerp(dest, ease);

            const scale = object.userData.targetScale + (isSelected ? opening * .12 : -opening * .12);
            object.scale.lerp(new THREE.Vector3(scale, scale, scale), ease);

            // Zrównoważony kinowy obrót ku kamerze i centrum sceny:
            let targetRotY = 0;
            let targetRotX = -0.03;
            let targetRotZ = 0;

            if (isSelected) {
                targetRotY = 0;
                targetRotX = -0.02;
                targetRotZ = 0;
            } else if (object.userData.destination.x < -1) {
                targetRotY = 0.28;
                targetRotX = -0.04;
                targetRotZ = 0.02;
            } else if (object.userData.destination.x > 1) {
                targetRotY = -0.28;
                targetRotX = -0.04;
                targetRotZ = -0.02;
            } else {
                targetRotY = 0;
                targetRotX = -0.05;
                targetRotZ = 0;
            }
            object.rotation.set(targetRotX, targetRotY, targetRotZ);
        });

        layers.forEach((layer, i) => {
            const spread = (expanded ? 1.25 : .15) + (selected === 'stego' ? opening * .8 : 0);
            const index = i - 1;
            layer.position.lerp(new THREE.Vector3(index * spread * .8, index * spread * .7, index * spread * .75), ease);
        });

        camera.position.z = 11 - opening * 2.8;
        camera.position.y = 1.3 - opening * .8;
        camera.lookAt(0, .1, 0);
        renderer.render(scene, camera);

        if (!isGentle && now - lastInteraction < 10000) raf = requestAnimationFrame(draw);
    }

    function wake() {
        lastInteraction = performance.now();
        if (active && !raf && !lost) raf = requestAnimationFrame(draw);
    }

    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        renderer.setSize(rect.width, rect.height, false);
        camera.aspect = rect.width / rect.height;
        camera.fov = rect.width < 480 ? 45 : 36;
        camera.updateProjectionMatrix();
        wake();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas.parentElement);

    let down = null, moved = false;
    canvas.addEventListener('pointerdown', event => {
        down = { x: event.clientX, y: event.clientY, angle: dragTarget };
        moved = false;
    });

    canvas.addEventListener('pointermove', event => {
        const rect = canvas.getBoundingClientRect();
        if (rect.width && rect.height) {
            mouseHover.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouseHover.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
            if (!gentle()) wake();
        }
        if (!down) return;
        const dx = event.clientX - down.x;
        if (Math.abs(dx) > 5) moved = true;
        if (!gentle()) {
            dragTarget = down.angle + Math.max(-.65, Math.min(.65, dx * .004));
            wake();
        }
    });

    canvas.addEventListener('pointerup', event => {
        if (down && !moved) {
            const rect = canvas.getBoundingClientRect();
            pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
            raycaster.setFromCamera(pointer, camera);
            const hits = raycaster.intersectObjects(objects, true);
            if (hits.length) {
                let object = hits[0].object;
                while (object && !object.userData.tool) object = object.parent;
                if (object) onSelect(object.userData.tool);
            }
        }
        down = null;
    });

    canvas.addEventListener('pointercancel', () => { down = null; mouseHover.x = 0; mouseHover.y = 0; });
    canvas.addEventListener('pointerleave', () => { down = null; mouseHover.x = 0; mouseHover.y = 0; wake(); });
    canvas.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        lost = true;
        cancelAnimationFrame(raf);
        raf = 0;
        canvas.parentElement.dataset.renderer = 'fallback';
    });
    canvas.addEventListener('webglcontextrestored', () => {
        lost = false;
        canvas.parentElement.dataset.renderer = 'webgl';
        resize();
    });

    destinations(true);
    resize();

    return {
        select(tool, immediate = false) {
            selected = tool;
            expanded = false;
            dragTarget = 0;
            openingTarget = 0;
            destinations(immediate);
            wake();
        },
        setExpanded(value) { expanded = value; wake(); },
        setOpening(value) { openingTarget = value ? 1 : 0; if (!value) opening = 0; wake(); },
        setActive(value) {
            active = value;
            if (active) { resize(); wake(); } else { cancelAnimationFrame(raf); raf = 0; }
        },
        refresh() { wake(); },
        dispose() {
            active = false;
            cancelAnimationFrame(raf);
            resizeObserver.disconnect();
            scene.traverse(object => {
                object.geometry?.dispose();
                const mats = Array.isArray(object.material) ? object.material : [object.material];
                mats.forEach(material => {
                    material?.map?.dispose();
                    material?.dispose();
                });
            });
            envTarget?.dispose();
            renderer.dispose();
        }
    };
}
