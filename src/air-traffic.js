import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function createAirTraffic({ material, cyan, pink }) {
  const group = new THREE.Group(); group.name = 'diverse-air-traffic';
  const shell = material('#849ba5', { metalness: 0.65, roughness: 0.32 });
  const dark = material('#263c4a', { metalness: 0.65, roughness: 0.4 });
  const glass = material('#1f5668', { metalness: 0.75, roughness: 0.14, emissive: '#1e4e61', emissiveIntensity: 0.35 });
  const white = new THREE.MeshBasicMaterial({ color: new THREE.Color('#e5f7ed').multiplyScalar(2), toneMapped: false });
  const red = new THREE.MeshBasicMaterial({ color: '#ff526e', toneMapped: false });
  const amber = new THREE.MeshBasicMaterial({ color: '#f3ca85', toneMapped: false });
  // Six unobstructed routes use existing row gaps and one route above the roofs.
  const routes = [
    [-6.25, [3.6, 4.1, 3.7, 4.3]],
    [-6.25, [6.2, 6.7, 6.1, 6.6]],
    [-14, [5.3, 5.8, 5.4, 6.1]],
    [-14, [7.8, 8.4, 7.9, 8.6]],
    [-21, [9.2, 9.8, 9.3, 10.1]],
    [-28, [16.6, 17.2, 16.8, 17.4]],
  ].map(([z, heights], index) => {
    const xs = index % 2 ? [30, 10, -10, -30] : [-30, -10, 10, 30];
    const path = new THREE.CatmullRomCurve3(xs.map((x, i) => new THREE.Vector3(x, heights[i], z)));
    return { path, length: path.getLength() };
  });
  const matrix = new THREE.Object3D();
  const fleets = [];
  function fleet(name, speed, build) {
    const geometryByMaterial = new Map();
    function part(geometry, mat, position = [0, 0, 0], rotation = [0, 0, 0]) {
      matrix.position.set(...position); matrix.rotation.set(...rotation); matrix.scale.set(1, 1, 1); matrix.updateMatrix();
      geometry.applyMatrix4(matrix.matrix);
      if (!geometryByMaterial.has(mat)) geometryByMaterial.set(mat, []);
      geometryByMaterial.get(mat).push(geometry);
    }
    const box = (size, mat, position, radius = 0.025) => part(new RoundedBoxGeometry(...size, 2, radius), mat, position);
    const duct = (radius, mat, position, horizontal = false) => part(new THREE.TorusGeometry(radius, 0.018, 5, 16), mat, position, horizontal ? [Math.PI / 2, 0, 0] : [0, Math.PI / 2, 0]);
    build({ part, box, duct });
    const parts = [...geometryByMaterial].map(([mat, geometries]) => {
      // RoundedBoxGeometry is non-indexed; normalize all parts before merging.
      const normalized = geometries.map(g => g.index ? g.toNonIndexed() : g);
      const merged = mergeGeometries(normalized, false);
      geometries.forEach(g => g.dispose());
      normalized.forEach((g, i) => { if (g !== geometries[i]) g.dispose(); });
      const mesh = new THREE.InstancedMesh(merged, mat, 5);
      mesh.name = `${name}-parts`; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false; group.add(mesh); return mesh;
    });
    fleets.push({ name, speed, parts, index: fleets.length });
  }
  fleet('air-taxi', 1.8, ({ box, duct }) => {
    box([0.8, 0.15, 0.3], shell, [0, 0, 0], 0.06);
    box([0.38, 0.13, 0.27], glass, [0.09, 0.115, 0], 0.055);
    box([0.42, 0.035, 0.75], dark, [-0.1, 0, 0]);
    for (const z of [-0.34, 0.34]) {
      duct(0.095, shell, [-0.1, 0.01, z], true);
      box([0.08, 0.015, 0.08], cyan, [-0.1, -0.025, z]);
    }
    box([0.025, 0.035, 0.22], white, [0.4, 0.01, 0]);
    box([0.025, 0.022, 0.22], red, [-0.4, 0, 0]);
  });
  fleet('passenger-shuttle', 1.05, ({ box, duct }) => {
    box([1.35, 0.29, 0.43], shell, [0, 0, 0], 0.12);
    for (const z of [-0.217, 0.217]) {
      box([1.04, 0.11, 0.012], glass, [0.03, 0.035, z], 0.005);
      for (let x = -0.4; x < 0.55; x += 0.2) box([0.015, 0.12, 0.015], shell, [x, 0.035, z]);
      box([0.92, 0.018, 0.014], pink, [0, -0.09, z]);
    }
    box([0.28, 0.13, 0.3], glass, [0.49, 0.08, 0], 0.055);
    for (const z of [-0.31, 0.31]) { duct(0.09, dark, [-0.44, 0, z]); box([0.016, 0.08, 0.08], cyan, [-0.46, 0, z]); }
    box([0.025, 0.035, 0.29], white, [0.67, -0.04, 0]);
    box([0.018, 0.025, 0.26], red, [-0.67, 0, 0]);
  });
  fleet('cargo-lifter', 0.72, ({ box, duct }) => {
    box([0.85, 0.26, 0.46], dark, [0, -0.08, 0], 0.035);
    box([0.98, 0.07, 0.65], shell, [0, 0.1, 0]);
    for (const x of [-0.31, 0.31]) {
      box([0.025, 0.28, 0.48], shell, [x, -0.08, 0]);
      for (const z of [-0.37, 0.37]) { duct(0.11, shell, [x, 0.11, z], true); box([0.09, 0.018, 0.09], cyan, [x, 0.065, z]); }
    }
    box([0.25, 0.15, 0.25], glass, [0.37, 0.17, 0]);
    box([0.025, 0.03, 0.26], white, [0.5, 0.1, 0]);
    box([0.02, 0.035, 0.32], amber, [-0.44, -0.08, 0]);
  });
  fleet('courier-drone', 1.4, ({ part, box, duct }) => {
    box([0.28, 0.09, 0.2], shell, [0, 0, 0], 0.04);
    box([0.49, 0.025, 0.025], dark, [0, 0, 0]);
    box([0.025, 0.025, 0.49], dark, [0, 0, 0]);
    for (const [x, z] of [[0.24, 0], [-0.24, 0], [0, 0.24], [0, -0.24]]) duct(0.085, dark, [x, 0.015, z], true);
    part(new THREE.SphereGeometry(0.055, 10, 6), glass, [0.07, -0.075, 0]);
    box([0.018, 0.025, 0.12], white, [0.14, 0, 0]);
    box([0.018, 0.025, 0.1], red, [-0.14, 0, 0]);
    box([0.1, 0.013, 0.06], cyan, [0, -0.053, 0]);
  });
  const pose = new THREE.Object3D(), tangent = new THREE.Vector3(), forward = new THREE.Vector3(1, 0, 0);
  let count = 5;
  function setQuality(mobile) {
    count = mobile ? 3 : 5;
    fleets.forEach(({ parts }) => parts.forEach(mesh => { mesh.count = count; }));
  }
  function update(time) {
    fleets.forEach(({ speed, parts, index }) => {
      for (let i = 0; i < count; i++) {
        const { path, length } = routes[(index + i * 2) % routes.length];
        // Fixed five-slot phases preserve the composition when mobile lowers density.
        const t = (0.17 + i / 5 + index * 0.137 + time * speed / length) % 1;
        path.getPointAt(t, pose.position); path.getTangentAt(t, tangent);
        pose.quaternion.setFromUnitVectors(forward, tangent);
        pose.scale.setScalar(1); pose.updateMatrix();
        parts.forEach(mesh => mesh.setMatrixAt(i, pose.matrix));
      }
      parts.forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; });
    });
  }
  setQuality(false); update(0);
  return { group, setQuality, update };
}
