import * as THREE from 'three';

export function createGroundTraffic({ material }) {
  const group = new THREE.Group(); group.name = 'ground-streets';
  const asphalt = material('#263540', { roughness: 0.26, metalness: 0.3 });
  const concrete = material('#43515c', { roughness: 0.85 });
  const paint = new THREE.MeshBasicMaterial({ color: '#a9aba1' });
  const warm = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff0c4').multiplyScalar(1.8), toneMapped: false });
  const metal = material('#425563', { metalness: 0.6 });
  const lightPool = new THREE.MeshBasicMaterial({ color: '#c8b485', transparent: true, opacity: 0.08, depthWrite: false });
  const groundY = -1.2;
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const pose = new THREE.Object3D();
  const staticParts = new Map();
  function fixed(size, position, mat) {
    if (!staticParts.has(mat)) staticParts.set(mat, []);
    staticParts.get(mat).push({ size, position });
  }
  fixed([70, 0.06, 44], [0, groundY - 0.06, -25], material('#172632', { roughness: 0.65 }));
  // Cross streets occupy the existing gaps; the side avenues clear all towers.
  const streets = [
    ...[-6.1, -14, -21, -28, -35].map((z, index) => ({ axis: 'x', z, width: index === 0 ? 1.65 : 0.65, length: 53 })),
    ...[-25.5, 25.5].map(x => ({ axis: 'z', x, width: 1.65, length: 36 })),
    { axis: 'z', x: -8.65, z: -17.05, width: 0.85, length: 21.9 },
    { axis: 'z', x: 2, z: -20.55, width: 0.9, length: 28.9 },
  ];
  streets.forEach(({ axis, x = 0, z = -23.5, width, length }) => {
    const alongX = axis === 'x';
    fixed(alongX ? [length, 0.025, width] : [width, 0.025, length], [x, groundY, z], asphalt);
    for (const side of [-1, 1]) {
      fixed(alongX ? [length, 0.05, 0.045] : [0.045, 0.05, length],
        [x + (alongX ? 0 : side * (width / 2 + 0.025)), groundY + 0.025, z + (alongX ? side * (width / 2 + 0.025) : 0)], concrete);
    }
    for (let d = -length / 2 + 0.7; d < length / 2; d += 1.1) {
      fixed(alongX ? [0.42, 0.005, 0.014] : [0.014, 0.005, 0.42], [x + (alongX ? d : 0), groundY + 0.017, z + (alongX ? 0 : d)], paint);
    }
    for (let d = -length / 2 + 2; d < length / 2; d += 5.4) {
      const lx = x + (alongX ? d : width / 2 + 0.035);
      const lz = z + (alongX ? width / 2 + 0.035 : d);
      fixed([0.025, 0.72, 0.025], [lx, groundY + 0.36, lz], metal);
      fixed(alongX ? [0.025, 0.025, 0.2] : [0.2, 0.025, 0.025], [lx - (alongX ? 0 : 0.08), groundY + 0.72, lz - (alongX ? 0.08 : 0)], metal);
      fixed([0.08, 0.014, 0.07], [lx, groundY + 0.705, lz], warm);
      // A restrained pool of warm reflected light on the wet road.
      fixed(alongX ? [0.38, 0.003, width * 0.7] : [width * 0.7, 0.003, 0.38],
        [lx - (alongX ? 0 : width * 0.45), groundY + 0.018, lz - (alongX ? width * 0.45 : 0)],
        lightPool);
    }
  });
  for (const [mat, entries] of staticParts) {
    const mesh = new THREE.InstancedMesh(cube, mat, entries.length);
    entries.forEach(({ size, position }, index) => {
      pose.position.set(...position); pose.scale.set(...size); pose.updateMatrix(); mesh.setMatrixAt(index, pose.matrix);
    });
    mesh.computeBoundingSphere(); group.add(mesh);
  }
  const body = material('#79919b', { metalness: 0.65, roughness: 0.32 });
  const cabin = material('#182d3b', { metalness: 0.6, roughness: 0.2 });
  const tail = new THREE.MeshBasicMaterial({ color: '#ff526e', toneMapped: false });
  const maxCount = streets.length * 12;
  const parts = [
    { size: [0.37, 0.1, 0.17], offset: [0, 0.09, 0], mat: body },
    { size: [0.18, 0.08, 0.15], offset: [-0.025, 0.17, 0], mat: cabin },
    { size: [0.016, 0.022, 0.13], offset: [0.19, 0.1, 0], mat: warm },
    { size: [0.012, 0.022, 0.13], offset: [-0.19, 0.1, 0], mat: tail },
    { size: [0.08, 0.055, 0.19], offset: [0.11, 0.035, 0], mat: cabin },
    { size: [0.08, 0.055, 0.19], offset: [-0.11, 0.035, 0], mat: cabin },
  ].map(part => {
    const mesh = new THREE.InstancedMesh(cube, part.mat, maxCount);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false;
    group.add(mesh); return { ...part, mesh };
  });
  let carsPerStreet = 12;
  const rotation = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const offset = new THREE.Vector3();
  function setQuality(mobile) {
    carsPerStreet = mobile ? 6 : 12;
    parts.forEach(({ mesh }) => { mesh.count = streets.length * carsPerStreet; });
  }
  function update(time) {
    streets.forEach((street, routeIndex) => {
      for (let i = 0; i < carsPerStreet; i++) {
        const direction = i % 2 ? -1 : 1;
        const length = street.length - 0.8;
        const travel = ((Math.floor(i / 2) / (carsPerStreet / 2) * length + time * direction * (0.9 + routeIndex * 0.07) + routeIndex * 2.3) % length + length) % length - length / 2;
        const alongX = street.axis === 'x';
        const lane = direction * street.width * 0.24;
        const x = alongX ? travel : street.x + lane;
        const z = alongX ? street.z + lane : (street.z ?? -23.5) + travel;
        rotation.setFromAxisAngle(up, alongX ? (direction === 1 ? 0 : Math.PI) : (direction === 1 ? -Math.PI / 2 : Math.PI / 2));
        const van = i % 5 === 0;
        parts.forEach(part => {
          offset.set(...part.offset); offset.x *= van ? 1.25 : 1; offset.applyQuaternion(rotation);
          pose.position.set(x + offset.x, groundY + offset.y, z + offset.z);
          pose.quaternion.copy(rotation); pose.scale.set(...part.size);
          if (van) { pose.scale.x *= 1.25; if (part.mat === cabin && part.offset[1] > 0.1) pose.scale.y *= 1.65; }
          pose.updateMatrix(); part.mesh.setMatrixAt(routeIndex * carsPerStreet + i, pose.matrix);
        });
      }
    });
    parts.forEach(({ mesh }) => { mesh.instanceMatrix.needsUpdate = true; });
  }
  setQuality(false); update(0);
  return { group, setQuality, update };
}
