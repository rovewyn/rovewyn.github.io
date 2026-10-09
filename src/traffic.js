import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createGroundTraffic } from './ground-traffic.js';
import { createAirTraffic } from './air-traffic.js';

export function createTraffic({ box, material, label, cyan, pink }) {
  const group = new THREE.Group(); group.name = 'multi-level-traffic';
  const structure = material('#354451', { metalness: 0.5 });
  const body = material('#7b949d', { metalness: 0.65 });
  const white = new THREE.MeshBasicMaterial({ color: '#eee6ce' });
  const tail = new THREE.MeshBasicMaterial({ color: '#ff526e' });
  // Building rows leave continuous traffic corridors at these Zs.
  const roadZ = -14, roadY = 2.6, railZ = -21, railY = 4.2;
  box(52, 0.1, 0.65, structure, 0, roadY, roadZ, group);
  for (const z of [-0.31, 0.31]) box(52, 0.012, 0.02, pink, 0, roadY + 0.07, roadZ + z, group);
  for (let x = -24; x <= 24; x += 8) box(0.12, roadY + 1.2, 0.18, structure, x, (roadY - 1.2) / 2, roadZ, group);
  box(55, 0.1, 0.45, structure, 0, railY, railZ, group);
  box(55, 0.012, 0.02, cyan, 0, railY + 0.07, railZ + 0.23, group);
  for (let x = -24; x <= 24; x += 8) box(0.13, railY + 1.2, 0.2, structure, x, (railY - 1.2) / 2, railZ, group);
  const train = new THREE.Group(); group.add(train);
  for (let i = 0; i < 4; i++) {
    box(1.7, 0.42, 0.4, body, i * 1.8, 0, 0, train);
    box(1.48, 0.15, 0.01, label('▰ ▰ ▰ ▰', '#eee6ce', '#283b46'), i * 1.8, 0.04, 0.21, train);
    box(1.7, 0.015, 0.02, cyan, i * 1.8, -0.13, 0.22, train);
  }
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const parts = [
    { size: [0.38, 0.1, 0.18], offset: [0, 0.12, 0], material: body },
    { size: [0.17, 0.07, 0.16], offset: [-0.02, 0.2, 0], material: structure },
    { size: [0.015, 0.025, 0.14], offset: [0.2, 0.14, 0], material: white },
    { size: [0.015, 0.025, 0.14], offset: [-0.2, 0.14, 0], material: tail },
  ];
  const lanes = [1, -1].map(direction => ({ direction, parts: parts.map(part => {
    const mesh = new THREE.InstancedMesh(cube, part.material, 18);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; group.add(mesh);
    return { ...part, mesh };
  }) }));
  // Submit static viaduct parts in material batches rather than individual draws.
  for (const mat of [structure, pink, cyan]) {
    const meshes = group.children.filter(mesh => mesh.isMesh && !mesh.isInstancedMesh && mesh.material === mat);
    if (!meshes.length) continue;
    const transformed = meshes.map(mesh => { mesh.updateMatrix(); return mesh.geometry.clone().applyMatrix4(mesh.matrix); });
    const merged = new THREE.Mesh(mergeGeometries(transformed, false), mat);
    transformed.forEach(geometry => geometry.dispose());
    meshes.forEach(mesh => { group.remove(mesh); mesh.geometry.dispose(); }); group.add(merged);
  }
  const ground = createGroundTraffic({ material });
  const air = createAirTraffic({ material, cyan, pink });
  group.add(ground.group, air.group);
  const pose = new THREE.Object3D();
  function setQuality(mobile) {
    lanes.forEach(lane => lane.parts.forEach(({ mesh }) => { mesh.count = mobile ? 9 : 18; }));
    ground.setQuality(mobile); air.setQuality(mobile);
  }
  function update(time) {
    train.position.set(27 - ((time * 1.1 + 15) % 60), railY + 0.3, railZ);
    lanes.forEach(({ parts: laneParts, direction }) => {
      const count = laneParts[0].mesh.count;
      for (let i = 0; i < count; i++) {
        const x = ((i / count * 56 + direction * time * 1.8) % 56 + 56) % 56 - 28;
        laneParts.forEach(part => {
          pose.position.set(x + direction * part.offset[0], roadY + part.offset[1], roadZ + direction * 0.17 + part.offset[2]);
          pose.scale.set(...part.size); pose.updateMatrix(); part.mesh.setMatrixAt(i, pose.matrix);
        });
      }
      laneParts.forEach(({ mesh }) => { mesh.instanceMatrix.needsUpdate = true; });
    });
    ground.update(time); air.update(time);
  }
  setQuality(false); update(0);
  return { group, setQuality, update };
}
