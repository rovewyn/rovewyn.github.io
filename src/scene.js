import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { createCity } from './city.js';
import skyImageUrl from '../assets/night-sky.webp';
import { createDeskDevices } from './devices.js';

function randomGenerator(seed = 419) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function texture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const result = new THREE.CanvasTexture(canvas);
  result.colorSpace = THREE.SRGBColorSpace;
  return result;
}

function screenTexture(side = false, unlocked = false) {
  return texture(1024, 640, (ctx, w, h) => {
    ctx.fillStyle = '#071219';
    ctx.fillRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(750, 180, 5, 750, 180, 680);
    glow.addColorStop(0, side ? '#14454e' : '#17606b');
    glow.addColorStop(1, '#071219');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#a9d9eb18';
    for (let x = 0; x < w; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    ctx.font = '18px monospace';
    ctx.fillStyle = '#a1bfc8';
    ctx.fillText(side ? 'SYSTEM / LOCAL' : 'rovewyn / 001', 54, 56);
    ctx.fillStyle = '#d8f36a';
    ctx.fillRect(54, 90, 38, 2);
    if (side) {
      ctx.font = '25px monospace';
      const rows = unlocked
        ? ['ACCESS GRANTED', '', 'RECOVERED / 001', '', 'LOCAL SESSION', '', '_']
        : ['SESSION LOCKED', '', 'USER    _', 'PASS    _', '', 'LOCAL RECORDS', '_'];
      rows.forEach((row, i) => {
        ctx.fillStyle = i === 0 ? '#c0dbe7' : '#89aebf';
        ctx.fillText(row, 54, 173 + i * 45);
      });
    } else {
      ctx.strokeStyle = '#63e8e870';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(770, 292, 164, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#63e8e828';
      ctx.beginPath(); ctx.arc(770, 292, 180, -1.2, 2.4); ctx.stroke();
      ctx.strokeStyle = '#d8f36a';
      ctx.beginPath(); ctx.arc(770, 292, 164, -1.5, -0.65); ctx.stroke();
      ctx.fillStyle = '#e4f1f6';
      ctx.font = '300 82px sans-serif';
      ctx.fillText('rovewyn', 50, 285);
      ctx.font = '23px sans-serif';
      ctx.fillStyle = '#a1bdc7';
      ctx.fillText('Profile', 56, 345);
      ctx.fillStyle = '#d1e7ef';
      ctx.font = '19px monospace';
      ctx.fillText('OPEN PROFILE  ↗', 56, 523);
      ctx.strokeStyle = '#a6d0dc3a';
      ctx.beginPath(); ctx.moveTo(54, 560); ctx.lineTo(966, 560); ctx.stroke();
    }
    ctx.fillStyle = '#00000014';
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
  });
}

export async function createRoom({ canvas, onProject, onActivate, onFailure }) {
  const skyTexture = await new THREE.TextureLoader().loadAsync(skyImageUrl);
  skyTexture.colorSpace = THREE.SRGBColorSpace;
  const mobileQuery = matchMedia('(max-width: 760px)');
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let mobile = mobileQuery.matches;
  let reduced = motionQuery.matches;
  let disposed = false;
  let scan = false;
  let view = 'room';
  let frameId = 0;
  let elapsed = 0;
  let lastTime = 0;
  let frames = 0;
  let sampleStart = 0;
  let transition = null;
  const random = randomGenerator();
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (error) {
    skyTexture.dispose();
    throw error;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Exterior traffic does not cast room shadows; the interior shadow map is static.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#111b2a');
  scene.fog = new THREE.FogExp2('#111b2a', 0.026);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
  const lookTarget = new THREE.Vector3();
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const clickable = [];
  const scannable = [];
  const textures = new Set([skyTexture]);
  // A sky-only dome shares the camera projection; no city geometry is baked in.
  const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 48, 24),
    new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -100; sky.rotation.y = 0.45; scene.add(sky);
  const room = new THREE.Group();
  scene.add(room);
  const scanGroup = new THREE.Group();
  scanGroup.visible = false;
  scene.add(scanGroup);
  const scanMaterial = new THREE.LineBasicMaterial({ color: '#73e7a3', transparent: true, opacity: 0.4 });
  const resources = new Set();
  const material = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...options });
  const charcoal = material('#171c21', { metalness: 0.25 });
  const metal = material('#3c464d', { metalness: 0.55, roughness: 0.38 });
  const brushedTexture = texture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#353e43'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1200; i++) {
      ctx.strokeStyle = `rgba(${random() > 0.5 ? '133,150,158' : '11,15,18'},${random() * 0.1})`;
      const y = random() * h;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  });
  textures.add(brushedTexture);
  const worktop = material('#6b767d', { map: brushedTexture, metalness: 0.35, roughness: 0.48 });
  const green = new THREE.MeshBasicMaterial({ color: '#a6f1bd' });

  function box(w, h, d, mat, x, y, z, parent = room, outline = false) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    if (outline) scannable.push(mesh);
    return mesh;
  }
  function cylinder(r1, r2, h, mat, x, y, z, parent = room) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 20), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function cable(points, color = '#141e22', radius = 0.018, parent = room) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, radius, 6, false), material(color));
    parent.add(mesh);
    return mesh;
  }
  // A panoramic opening keeps the city dominant. Framing stays at the edges.
  // The room slab ends at the window, leaving the streets below visible.
  box(16, 0.16, 11.8, material('#12191e', { metalness: 0.3, roughness: 0.6 }), 0, -0.1, 2.1);
  box(16, 0.6, 0.28, charcoal, 0, 0.3, -3.8, room, true);
  [-6.5, 6.5].forEach(x => {
    box(0.18, 7, 0.28, metal, x, 3.8, -3.74, room, true);
  });
  box(13, 0.08, 0.45, metal, 0, 0.66, -3.65, room, true);
  for (let x = -5; x < 6; x += 1.5) box(0.006, 0.005, 10, material('#282331'), x, 0.005, 1);

  const city = createCity({ makeTexture: texture, textures });
  scene.add(city.group);
  const matrix = new THREE.Object3D();

  // Metal worktop and supports.
  box(5.2, 0.14, 1.9, worktop, 0.45, 1.05, -0.85, room, true);
  box(5.1, 0.035, 0.035, material('#7e9099', { metalness: 0.6, roughness: 0.3 }), 0.45, 1.09, 0.11);
  [-1.8, 2.7].forEach(x => {
    box(0.11, 1.05, 0.11, metal, x, 0.52, -0.2, room, true);
    box(0.11, 1.05, 0.11, metal, x, 0.52, -1.55);
    box(0.15, 0.08, 1.5, metal, x, 0.1, -0.85);
  });
  box(2.25, 0.012, 0.75, material('#0c1419'), 0.75, 1.128, -0.35);
  function monitor(x, y, z, w, h, angle) {
    const group = new THREE.Group(); group.position.set(x, y, z); group.rotation.y = angle; room.add(group);
    box(w + 0.09, h + 0.09, 0.075, charcoal, 0, 0, 0, group, true);
    const map = screenTexture(); textures.add(map);
    const screen = box(w, h, 0.008, new THREE.MeshBasicMaterial({ map }), 0, 0, 0.045, group);
    screen.userData.action = 'profile'; clickable.push(screen);
    box(w + 0.1, 0.025, 0.09, metal, 0, -h / 2 - 0.035, 0.005, group);
    box(0.025, 0.009, 0.01, metal, w / 2 - 0.08, -h / 2 - 0.035, 0.056, group);
    box(0.085, y - 1.16 - h / 2, 0.085, metal, 0, -(y - 1.16 + h / 2) / 2, -0.02, group);
    box(0.5, 0.025, 0.3, metal, 0, 1.14 - y, 0.05, group);
    group.traverse(object => {
      if (!object.isMesh) return;
      object.userData.scanAction = 'inspect-monitor';
      if (object !== screen) clickable.push(object);
    });
    return screen;
  }
  monitor(1.1, 2.02, -1.52, 1.85, 1.15, -0.07);
  box(1.25, 0.055, 0.43, charcoal, 0.7, 1.165, -0.3, room, true);
  const keyGeometry = new THREE.BoxGeometry(0.065, 0.028, 0.062);
  const keys = new THREE.InstancedMesh(keyGeometry, material('#525e65'), 60);
  let keyIndex = 0;
  for (let row = 0; row < 4; row++) for (let col = 0; col < 15; col++) {
    matrix.position.set(0.16 + col * 0.078, 1.205, -0.44 + row * 0.085); matrix.updateMatrix();
    keys.setMatrixAt(keyIndex++, matrix.matrix);
  }
  room.add(keys);
  box(0.34, 0.025, 0.055, material('#82939c'), 0.7, 1.21, -0.08);
  box(0.065, 0.029, 0.065, material('#d8f36a', { emissive: '#d8f36a', emissiveIntensity: 0.12 }), 0.16, 1.21, -0.44);
  cable([[0.5, 1.14, -0.55], [0.3, 1.14, -0.85], [0.6, 1.14, -1.55], [2.1, 1.14, -1.55], [2.3, 1.18, -1.24]]);
  const devices = createDeskDevices({ material, screenTexture, makeTexture: texture, textures, green });
  room.add(devices.group); scannable.push(...devices.scanMeshes);
  const { secretNode, ring } = devices;
  clickable.push(...devices.scanTargets);
  // The chair frames the foreground without hiding the screens.
  box(0.8, 0.12, 0.75, material('#100f18'), 3.5, 0.68, 1.5);
  const chairBack = box(0.85, 0.9, 0.16, material('#17141f'), 3.5, 1.15, 1.82, room, true);
  chairBack.rotation.x = -0.12;
  cylinder(0.05, 0.05, 0.6, metal, 3.5, 0.32, 1.5);
  box(0.8, 0.06, 0.09, metal, 3.5, 0.05, 1.5);
  box(0.09, 0.06, 0.8, metal, 3.5, 0.05, 1.5);

  // Interior fixtures are off. Every light comes from the window or a screen.
  RectAreaLightUniformsLib.init();
  const windowNeon = new THREE.RectAreaLight('#ff549f', 0.9, 7, 3.8);
  windowNeon.position.set(-1.8, 3, -3.5); windowNeon.lookAt(0.5, 1.1, 0);
  scene.add(windowNeon);
  const windowSky = new THREE.DirectionalLight('#b8d8ea', 0.5);
  windowSky.position.set(2, 6, -8); windowSky.target.position.set(0.5, 1, 0);
  windowSky.castShadow = true; windowSky.shadow.mapSize.set(1024, 1024);
  windowSky.shadow.camera.left = -7; windowSky.shadow.camera.right = 7;
  windowSky.shadow.camera.top = 7; windowSky.shadow.camera.bottom = -7;
  windowSky.shadow.bias = -0.001;
  scene.add(windowSky, windowSky.target);
  const monitorLight = new THREE.RectAreaLight('#65eee7', 7, 1.85, 1.15);
  monitorLight.position.set(1.1, 2.02, -1.46); monitorLight.lookAt(0.9, 1.05, -0.05);
  scene.add(monitorLight);
  const sideScreenLight = new THREE.PointLight('#d8f36a', 1.6, 2.5, 2);
  sideScreenLight.position.copy(devices.laptopLightPosition); scene.add(sideScreenLight);

  scene.updateMatrixWorld(true);
  scannable.forEach(mesh => {
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), scanMaterial);
    edges.applyMatrix4(mesh.matrixWorld); scanGroup.add(edges);
  });
  const network = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(1.1, 2.02, -1.45), new THREE.Vector3(1.1, 2.65, -1.45),
    new THREE.Vector3(1.1, 2.65, -1.45), new THREE.Vector3(2.466, 2.65, -1.45),
    new THREE.Vector3(2.466, 2.65, -1.45), devices.secretPosition.clone(),
    devices.laptopLightPosition.clone(), new THREE.Vector3(-1.2, 2.65, -1.45),
    new THREE.Vector3(-1.2, 2.65, -1.45), new THREE.Vector3(1.1, 2.65, -1.45),
  ]);
  scanGroup.add(new THREE.LineSegments(network, new THREE.LineBasicMaterial({ color: '#a6f1bd', transparent: true, opacity: 0.8 })));

  const rainGeometry = new THREE.BufferGeometry();
  const drops = new Float32Array(900 * 6);
  for (let i = 0; i < 900; i++) {
    const x = (random() - 0.5) * 32, y = random() * 14, z = -4.2 - random() * 23;
    drops.set([x, y, z, x - 0.035, y - 0.25 - random() * 0.2, z], i * 6);
  }
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(drops, 3));
  const rainMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { time: { value: 0 }, tint: { value: new THREE.Color('#b9d5df') } },
    vertexShader: 'uniform float time; varying float fade; void main() { vec3 p = position; p.y = mod(p.y - time * 4.0 + 140.0, 14.0); fade = 1.0 - min(1.0, abs(p.z) / 36.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
    fragmentShader: 'uniform vec3 tint; varying float fade; void main() { gl_FragColor = vec4(tint, fade * 0.15); }',
  });
  scene.add(new THREE.LineSegments(rainGeometry, rainMaterial));

  let composer = null;
  function configureComposer() {
    if (composer) { composer.passes.forEach(pass => pass.dispose?.()); composer.dispose(); composer = null; }
    renderer.shadowMap.enabled = !mobile;
    renderer.shadowMap.needsUpdate = true;
    city.setQuality(mobile); city.update(elapsed);
    rainGeometry.setDrawRange(0, mobile ? 500 : 1800);
    if (!mobile) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.16, 0.45, 0.95));
      composer.addPass(new OutputPass());
    }
  }
  function pose(targetView = view) {
    if (targetView === 'profile' || targetView === 'monitor') return { position: new THREE.Vector3(1.7, 2.15, 1.45), target: new THREE.Vector3(0.7, 1.95, -1.5) };
    if (targetView === 'terminal' || targetView === 'laptop') return { position: new THREE.Vector3(-0.2, 2.08, 1.1), target: devices.laptopLightPosition.clone() };
    if (targetView === 'mini') return { position: new THREE.Vector3(3.1, 1.65, 0.9), target: devices.secretPosition.clone() };
    return mobile
      ? { position: new THREE.Vector3(3.5, 2.35, 6.6), target: new THREE.Vector3(0.7, canvas.clientHeight < 650 ? 1.2 : 1.8, -2) }
      : { position: new THREE.Vector3(3.5, 2.2, 4.5), target: new THREE.Vector3(0.25, 1.85, -2.15) };
  }
  function resize() {
    mobile = mobileQuery.matches;
    const width = canvas.clientWidth, height = canvas.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, mobile ? 1 : 1.5, Math.sqrt(2000000 / (width * height)));
    renderer.setPixelRatio(1);
    renderer.setSize(Math.floor(width * ratio), Math.floor(height * ratio), false);
    composer?.setSize(Math.floor(width * ratio), Math.floor(height * ratio));
    const aspect = width / height;
    camera.aspect = aspect;
    camera.fov = mobile ? 48 : 46;
    camera.updateProjectionMatrix();
    const base = pose(); camera.position.copy(base.position); lookTarget.copy(base.target); transition = null;
    renderOnce();
  }
  const projected = new THREE.Vector3();
  const monitorAnchor = new THREE.Vector3(1.1, 2.75, -1.45);
  const secretAnchor = devices.secretPosition.clone();
  const laptopAnchor = new THREE.Vector3(-1.2, 1.98, -0.97);
  const miniAnchor = devices.secretPosition.clone().add(new THREE.Vector3(0, 0.3, 0));
  function project(point) {
    projected.copy(point).project(camera);
    return { x: (projected.x * 0.5 + 0.5) * canvas.clientWidth, y: (-projected.y * 0.5 + 0.5) * canvas.clientHeight, visible: projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 };
  }
  function renderOnce() {
    if (disposed || renderer.getContext().isContextLost()) return;
    camera.lookAt(lookTarget);
    camera.updateMatrixWorld();
    if (composer) composer.render(); else renderer.render(scene, camera);
    onProject({ monitor: project(monitorAnchor), laptop: project(laptopAnchor), mini: project(miniAnchor), secret: project(secretAnchor) });
    canvas.dataset.rendered = 'true';
  }
  function frame(time) {
    if (disposed || document.hidden) return;
    const delta = Math.min((time - (lastTime || time)) / 1000, 0.05);
    lastTime = time;
    if (!reduced) elapsed += delta;
    if (transition) {
      const progress = reduced ? 1 : Math.min((time - transition.start) / 800, 1);
      const eased = progress * progress * (3 - 2 * progress);
      camera.position.lerpVectors(transition.fromPosition, transition.toPosition, eased);
      lookTarget.lerpVectors(transition.fromTarget, transition.toTarget, eased);
      if (progress === 1) transition = null;
    } else if (!reduced && view === 'room') {
      const base = pose();
      base.position.x += pointer.x * 0.32; base.position.y += pointer.y * 0.12;
      camera.position.lerp(base.position, 1 - Math.exp(-delta * 3));
    }
    if (!reduced) {
      rainMaterial.uniforms.time.value = elapsed;
      city.update(elapsed);
      ring.scale.setScalar(1 + Math.sin(elapsed * 2) * 0.08);
    }
    renderOnce();
    if (!sampleStart) sampleStart = time;
    frames++;
    if (time - sampleStart >= 2000) {
      canvas.dataset.fps = (frames * 1000 / (time - sampleStart)).toFixed(1);
      sampleStart = time; frames = 0;
    }
    if (!reduced || transition) frameId = requestAnimationFrame(frame);
    else frameId = 0;
  }
  function start() {
    cancelAnimationFrame(frameId); lastTime = 0;
    if (!document.hidden && !disposed) frameId = requestAnimationFrame(frame);
  }
  function focus(next) {
    const base = pose(next);
    view = next;
    transition = { fromPosition: camera.position.clone(), fromTarget: lookTarget.clone(), toPosition: base.position, toTarget: base.target, start: performance.now() };
    start();
  }
  function setScan(value) {
    scan = value;
    scanGroup.visible = value;
    ring.visible = value;
    secretNode.material = value ? green : charcoal;
    renderer.toneMappingExposure = value ? 0.9 : 1.1;
    monitorLight.color.set(value ? '#8be9b4' : '#65eee7');
    renderOnce();
  }
  function setTerminalUnlocked(value) {
    const previous = devices.laptopScreen.material.map;
    textures.delete(previous); previous.dispose();
    const next = screenTexture(true, value);
    textures.add(next); devices.laptopScreen.material.map = next;
    renderOnce();
  }
  function pointerMove(event) {
    pointer.set(event.clientX / canvas.clientWidth * 2 - 1, 1 - event.clientY / canvas.clientHeight * 2);
    if (event.pointerType !== 'mouse') pointer.set(0, 0);
  }
  function pointerLeave() { pointer.set(0, 0); }
  function activate(event) {
    if (view !== 'room') return;
    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
    const targets = clickable.filter(object => scan ? object.userData.scanAction : object.userData.action);
    const hit = raycaster.intersectObjects(targets, false)[0];
    if (hit) onActivate(scan ? hit.object.userData.scanAction : hit.object.userData.action);
  }
  function visibility() { if (document.hidden) { cancelAnimationFrame(frameId); frameId = 0; } else start(); }
  function preferences() { reduced = motionQuery.matches; configureComposer(); resize(); start(); }
  function lost(event) { event.preventDefault(); onFailure(); }
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerleave', pointerLeave);
  canvas.addEventListener('click', activate);
  canvas.addEventListener('webglcontextlost', lost);
  document.addEventListener('visibilitychange', visibility);
  motionQuery.addEventListener('change', preferences);
  mobileQuery.addEventListener('change', preferences);
  const observer = new ResizeObserver(resize); observer.observe(canvas);
  configureComposer();
  resize();
  setScan(false);
  start();
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frameId);
    observer.disconnect();
    canvas.removeEventListener('pointermove', pointerMove);
    canvas.removeEventListener('pointerleave', pointerLeave);
    canvas.removeEventListener('click', activate);
    canvas.removeEventListener('webglcontextlost', lost);
    document.removeEventListener('visibilitychange', visibility);
    motionQuery.removeEventListener('change', preferences);
    mobileQuery.removeEventListener('change', preferences);
    scene.traverse(object => {
      if (object.geometry) resources.add(object.geometry);
      if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => resources.add(m));
    });
    textures.forEach(t => t.dispose()); resources.forEach(r => r.dispose());
    composer?.passes.forEach(pass => pass.dispose?.()); composer?.dispose(); renderer.dispose();
  }
  return { focus, setScan, setTerminalUnlocked, dispose };
}
