import * as THREE from './vendor/three.module.min.js';

/* Finite, pixel-aligned ribbon-to-frame morph; no render loop lives in this module. */
export function createProRibbon({ canvas, onContextLost }) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.2 : 1.5));
    renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-innerWidth / 2, innerWidth / 2, innerHeight / 2, -innerHeight / 2, .1, 4000);
    camera.position.set(0, 0, 1400);
    scene.add(new THREE.HemisphereLight(0xfffae6, 0x1f180a, 2.5));
    const key = new THREE.DirectionalLight(0xfff5d0, 5.0); key.position.set(-400, 550, 800); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffd700, 2.8); rim.position.set(550, -200, 400); scene.add(rim);
    const envCanvas = document.createElement('canvas'); envCanvas.width = 512; envCanvas.height = 256;
    const env = envCanvas.getContext('2d');
    const gradient = env.createLinearGradient(0, 0, 0, 256); gradient.addColorStop(0, '#fffbf0'); gradient.addColorStop(.35, '#d4af37'); gradient.addColorStop(.6, '#5a4515'); gradient.addColorStop(1, '#0c0a05'); env.fillStyle = gradient; env.fillRect(0, 0, 512, 256);
    env.fillStyle = '#ffffff'; env.fillRect(38, 15, 35, 180); env.fillRect(270, 24, 12, 130); env.fillStyle = '#ffd700'; env.fillRect(410, 60, 45, 95);
    const texture = new THREE.CanvasTexture(envCanvas); texture.mapping = THREE.EquirectangularReflectionMapping; texture.colorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(renderer), environment = pmrem.fromEquirectangular(texture); scene.environment = environment.texture; texture.dispose(); pmrem.dispose();
    const group = new THREE.Group(); scene.add(group);
    const mobile = innerWidth < 700, segments = mobile ? 128 : 224, cross = 8;
    const positions = new Float32Array((segments + 1) * cross * 3), indices = [];
    for (let i = 0; i < segments; i++) for (let j = 0; j < cross; j++) { const a = i * cross + j, b = i * cross + (j + 1) % cross, c = a + cross, d = b + cross; indices.push(a, c, b, b, c, d); }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage)); geometry.setIndex(indices);
    const gold = new THREE.MeshPhysicalMaterial({ color: 0xffd700, metalness: .92, roughness: .14, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 2.1, transparent: true, side: THREE.DoubleSide });
    const ribbon = new THREE.Mesh(geometry, gold); ribbon.frustumCulled = false; group.add(ribbon);
    const glassMaterial = new THREE.MeshPhysicalMaterial({ color: 0xffe680, metalness: .15, roughness: .12, clearcoat: 1, transparent: true, opacity: .35, transmission: mobile ? 0 : .2, thickness: 6, ior: 1.35, depthWrite: false });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glassMaterial); glass.position.z = -5; group.add(glass);
    const labelCanvas = document.createElement('canvas'); labelCanvas.width = 768; labelCanvas.height = 512;
    const ctx = labelCanvas.getContext('2d'); ctx.textAlign = 'center'; ctx.fillStyle = '#ffdf73';
    ctx.font = "700 22px 'Plus Jakarta Sans', sans-serif"; ctx.fillText('D R O P S I T E', 384, 105);
    ctx.font = "800 160px 'Plus Jakarta Sans', sans-serif"; ctx.fillText('PRO', 384, 300);
    ctx.font = "600 18px 'Plus Jakarta Sans', sans-serif"; ctx.fillText('M E M B E R S H I P', 384, 360);
    const labelTexture = new THREE.CanvasTexture(labelCanvas); labelTexture.colorSpace = THREE.SRGBColorSpace;
    const labelMaterial = new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true, depthWrite: false });
    const label = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), labelMaterial); label.position.z = 5; group.add(label);
    const glowCanvas = document.createElement('canvas'); glowCanvas.width = 128; glowCanvas.height = 128;
    const glowCtx = glowCanvas.getContext('2d'), halo = glowCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    halo.addColorStop(0, '#ffd70044'); halo.addColorStop(.5, '#d4af371a'); halo.addColorStop(1, '#d4af3700'); glowCtx.fillStyle = halo; glowCtx.fillRect(0, 0, 128, 128);
    const glowTexture = new THREE.CanvasTexture(glowCanvas); glowTexture.colorSpace = THREE.SRGBColorSpace;
    const glowMaterial = new THREE.MeshBasicMaterial({ map: glowTexture, transparent: true, depthWrite: false });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMaterial); glow.position.z = -30; group.add(glow);
    const centerline = Array.from({ length: segments + 1 }, () => new THREE.Vector3());
    const tangent = new THREE.Vector3(), normal = new THREE.Vector3(), binormal = new THREE.Vector3();
    let outline = [], dimensions = '', viewport = '', lost = false;
    const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    function shape(w, h) {
        const path = new THREE.Shape(), r = Math.min(36, w / 8, h / 8), x = -w / 2, y = -h / 2;
        path.moveTo(x + r, y); path.lineTo(x + w - r, y); path.quadraticCurveTo(x + w, y, x + w, y + r);
        path.lineTo(x + w, y + h - r); path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        path.lineTo(x + r, y + h); path.quadraticCurveTo(x, y + h, x, y + h - r);
        path.lineTo(x, y + r); path.quadraticCurveTo(x, y, x + r, y); return path;
    }
    function configure(target) {
        if (viewport !== `${innerWidth}/${innerHeight}`) {
            viewport = `${innerWidth}/${innerHeight}`; renderer.setSize(innerWidth, innerHeight, false);
            camera.left = -innerWidth / 2; camera.right = innerWidth / 2; camera.top = innerHeight / 2; camera.bottom = -innerHeight / 2; camera.updateProjectionMatrix();
        }
        const key = `${target.width}/${target.height}`;
        if (dimensions === key) return;
        dimensions = key;
        const path = shape(target.width, target.height); outline = path.getSpacedPoints(segments);
        glass.geometry.dispose(); glass.geometry = new THREE.ShapeGeometry(path, 16);
        label.scale.set(Math.min(450, target.width * .72), Math.min(300, target.width * .48), 1);
        glow.scale.set(target.width * 1.5, target.height * 1.4, 1);
    }
    function render(progress, source, target) {
        if (lost) throw Error('WebGL context unavailable');
        configure(target);
        const p = Math.min(1, Math.max(0, progress));
        const morph = smooth(.28, .88, p), flight = smooth(0, .72, p), phase = (1 - morph) * p * 3.2;
        const width = 26 * (1 - morph) + 2.2 * morph, thickness = 3 * (1 - morph) + .8 * morph;
        for (let i = 0; i <= segments; i++) {
            const u = i / segments, end = outline[i];
            const x = (u - .5) * Math.min(620, target.width * .86);
            const y = Math.sin(u * Math.PI * 2.3 + phase) * Math.min(155, target.height * .26);
            const z = Math.cos(u * Math.PI * 2 + phase) * 115;
            centerline[i].set(THREE.MathUtils.lerp(x, end.x, morph), THREE.MathUtils.lerp(y, end.y, morph), z * (1 - morph));
        }
        const corners = [[-1,-.55],[-.9,-1],[.9,-1],[1,-.55],[1,.55],[.9,1],[-.9,1],[-1,.55]];
        for (let i = 0; i <= segments; i++) {
            tangent.subVectors(centerline[Math.min(segments, i + 1)], centerline[Math.max(0, i - 1)]).normalize();
            normal.set(-tangent.y, tangent.x, 0); if (normal.lengthSq() < .001) normal.set(1, 0, 0); normal.normalize(); binormal.crossVectors(tangent, normal).normalize();
            const twist = ((i / segments) * Math.PI * 2.5 - phase) * (1 - morph), c = Math.cos(twist), s = Math.sin(twist);
            corners.forEach(([across, depth], j) => {
                const a = across * width / 2, b = depth * thickness / 2;
                const n = a * c - b * s, k = a * s + b * c, offset = (i * cross + j) * 3;
                positions[offset] = centerline[i].x + normal.x * n + binormal.x * k;
                positions[offset + 1] = centerline[i].y + normal.y * n + binormal.y * k;
                positions[offset + 2] = centerline[i].z + normal.z * n + binormal.z * k;
            });
        }
        geometry.attributes.position.needsUpdate = true; geometry.computeVertexNormals();
        const sx = source.x + source.width / 2 - innerWidth / 2, sy = innerHeight / 2 - source.y - source.height / 2;
        const tx = target.x + target.width / 2 - innerWidth / 2, ty = innerHeight / 2 - target.y - target.height / 2;
        group.position.set(THREE.MathUtils.lerp(sx, tx, flight), THREE.MathUtils.lerp(sy, ty, flight) - Math.sin(flight * Math.PI) * 65, Math.sin(flight * Math.PI) * 160);
        group.scale.setScalar(.075 + .925 * smooth(0, .82, p));
        group.rotation.set(Math.sin(p * Math.PI) * -.18, (1 - morph) * Math.sin(p * Math.PI) * 1.8, (1 - flight) * -.35);
        gold.opacity = 1 - smooth(.88, 1, p);
        glassMaterial.opacity = smooth(.28, .56, p) * (1 - smooth(.78, 1, p)) * .42;
        labelMaterial.opacity = smooth(.3, .55, p) * (1 - smooth(.72, .94, p));
        glowMaterial.opacity = Math.sin(p * Math.PI) * .6;
        renderer.render(scene, camera);
    }
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lost = true; onContextLost(); });
    // Compile while the launcher is hovered/focused, so the first visible frame is ready.
    render(.45, { x: innerWidth - 100, y: 20, width: 88, height: 42 }, { x: innerWidth / 2 - 350, y: innerHeight / 2 - 250, width: 700, height: 500 });
    return {
        render,
        dispose() { scene.traverse(object => { object.geometry?.dispose(); if (object.material) object.material.dispose(); }); labelTexture.dispose(); glowTexture.dispose(); environment.dispose(); renderer.dispose(); }
    };
}
