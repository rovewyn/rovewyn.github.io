import * as THREE from 'three';
import { createNeonSigns } from './neon-signs.js';
import { createTraffic } from './traffic.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function batchBuildings(group) {
  const batches = new Map();
  for (const mesh of group.children) {
    if (!mesh.isMesh || mesh.isInstancedMesh) continue;
    const m = mesh.material;
    const key = [m.type, m.color.getHex(), m.roughness, m.metalness, m.envMap?.uuid, m.envMapIntensity, m.toneMapped].join('/');
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(mesh);
  }
  for (const meshes of batches.values()) {
    const material = meshes[0].material;
    const transformed = meshes.map(mesh => { mesh.updateMatrix(); return mesh.geometry.clone().applyMatrix4(mesh.matrix); });
    const geometry = mergeGeometries(transformed, false);
    transformed.forEach(g => g.dispose());
    if (!geometry) continue;
    const merged = new THREE.Mesh(geometry, material); merged.name = 'building-batch';
    meshes.forEach(mesh => {
      group.remove(mesh); mesh.geometry.dispose();
      if (mesh.material !== material) mesh.material.dispose();
    });
    group.add(merged);
  }
}

export function createCity({ makeTexture, textures }) {
  let seed = 419;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  // A fixed stream offset keeps the seeded building layout repeatable.
  for (let i = 0; i < 6000; i++) random();
  // Exterior sky reflections light city materials without adding a room light.
  const environmentFaces = Array.from({ length: 6 }, (_, index) => {
    const face = makeTexture(64, 64, (ctx, w, h) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, index === 2 ? '#617b90' : '#49677f');
      gradient.addColorStop(1, index === 3 ? '#253341' : '#304757');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
    });
    textures.add(face); return face.image;
  });
  const environment = new THREE.CubeTexture(environmentFaces);
  environment.colorSpace = THREE.SRGBColorSpace; environment.needsUpdate = true; textures.add(environment);
  const material = (color, options = {}) => new THREE.MeshStandardMaterial({
    color, roughness: 0.75, envMap: environment, envMapIntensity: 2.8, ...options,
  });
  const metal = material('#435563', { metalness: 0.7, roughness: 0.4 });
  const charcoal = material('#26323f', { metalness: 0.35 });
  const cyan = new THREE.MeshBasicMaterial({ color: '#73e5e2' });
  const pink = new THREE.MeshBasicMaterial({ color: '#ff398b' });
  function box(w, h, d, mat, x, y, z, parent) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  }
  function cylinder(r1, r2, h, mat, x, y, z, parent) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 20), mat);
    mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  }
  function label(text, color, background, width = 512, height = 160) {
    const map = makeTexture(width, height, (ctx, w, h) => {
      ctx.fillStyle = background; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = color;
      const fontSize = Math.floor(Math.min(h * 0.39, w * 0.86 / (text.length * 0.62)));
      ctx.font = `500 ${fontSize}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, w / 2, h / 2);
    });
    textures.add(map); return new THREE.MeshBasicMaterial({ map });
  }

  // A seeded skyline makes both the composition and screenshots repeatable.
  const city = new THREE.Group(); city.name = 'procedural-city';
  const windowGeometry = new THREE.PlaneGeometry(0.09, 0.15);
  const cityWindows = new THREE.InstancedMesh(windowGeometry, new THREE.MeshBasicMaterial({ color: '#ffffff' }), 6000);
  const matrix = new THREE.Object3D();
  const windowColor = new THREE.Color();
  let windowCount = 0;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 13; col++) {
      const w = 1 + random() * 2.2;
      const h = 2.4 + random() * (row === 0 ? 5 : 13);
      const d = 1.2 + random() * 2;
      const x = (col - 6) * 3.4 + (random() - 0.5) * 1.5;
      const z = -9 - row * 7 - random() * 3;
      box(w, h, d, material(row < 2 ? '#273747' : '#2b3d4e', { roughness: 0.9 }), x, h / 2 - 1.2, z, city);
      box(w + 0.08, 0.08, d + 0.08, material('#435568'), x, h - 1.16, z, city);
      if (row < 3) {
        for (let y = 0.4; y < h - 0.3; y += 0.37) {
          for (let wx = -w / 2 + 0.18; wx < w / 2 - 0.1; wx += 0.28) {
            if (random() < 0.43 || windowCount >= 6000) continue;
            matrix.position.set(x + wx, y - 1.2, z + d / 2 + 0.01);
            matrix.updateMatrix(); cityWindows.setMatrixAt(windowCount, matrix.matrix);
            windowColor.set(random() > 0.72 ? '#e7d8b0' : '#d9dfdd').multiplyScalar(0.4 + random() * 0.7);
            cityWindows.setColorAt(windowCount++, windowColor);
          }
        }
      }
      if (row === 1 && col % 3 === 0) {
        box(0.035, h * 0.65, 0.01, col % 2 ? cyan : pink, x + w / 2 - 0.05, h * 0.6 - 1.2, z + d / 2 + 0.03, city);
      }
      if (row < 2 && col % 4 === 0) {
        cylinder(0.018, 0.025, 0.7, metal, x + 0.1, h - 0.85, z, city);
        box(0.05, 0.05, 0.05, pink, x + 0.1, h - 0.48, z, city);
      }
    }
  }
  cityWindows.count = windowCount;
  city.add(cityWindows);
  // Bake identical static geometry into fewer draw calls; positions stay intact.
  batchBuildings(city);
  const signs = createNeonSigns({ box, material, makeTexture, textures });
  city.add(signs.group);
  box(45, 0.13, 0.55, material('#354451'), 0, 1.05, -7.5, city);
  box(45, 0.025, 0.04, pink, 0, 1.17, -7.19, city);
  [-8, -2, 4, 10].forEach(x => box(0.25, 2.5, 0.35, charcoal, x, -0.2, -7.5, city));
  const train = new THREE.Group(); train.position.set(-16, 1.45, -7.5); city.add(train);
  for (let i = 0; i < 4; i++) {
    box(1.7, 0.48, 0.48, material('#7b949d', { metalness: 0.65 }), i * 1.8, 0, 0, train);
    box(1.48, 0.17, 0.01, label('▰ ▰ ▰ ▰', '#eee6ce', '#283b46'), i * 1.8, 0.04, 0.25, train);
    box(1.7, 0.018, 0.02, pink, i * 1.8, -0.14, 0.26, train);
  }

  const traffic = createTraffic({ box, material, label, cyan, pink });
  city.add(traffic.group);
  function update(time) {
    train.position.x = ((time * 1.4 + 7) % 50) - 25;
    traffic.update(time);
  }
  update(0);
  return { group: city, setQuality: traffic.setQuality, update };
}
