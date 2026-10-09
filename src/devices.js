import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function createDeskDevices({ material, screenTexture, makeTexture, textures, green }) {
  const group = new THREE.Group(); group.name = 'desk-devices';
  const scanMeshes = [];
  const aluminum = material('#b0bac1', { metalness: 0.8, roughness: 0.27 });
  const spaceGray = material('#76838d', { metalness: 0.75, roughness: 0.3 });
  const black = material('#0b1117', { roughness: 0.65 });
  function rounded(w, h, d, radius, mat, x, y, z, parent = group, scan = false) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, radius), mat);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
    if (scan) scanMeshes.push(mesh);
    return mesh;
  }
  function appleMark(size, parent, y) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.36);
    shape.bezierCurveTo(-0.21, 0.53, -0.56, 0.41, -0.56, 0.07);
    shape.bezierCurveTo(-0.56, -0.23, -0.31, -0.58, -0.14, -0.55);
    shape.bezierCurveTo(-0.02, -0.49, 0.06, -0.5, 0.18, -0.55);
    shape.bezierCurveTo(0.33, -0.59, 0.49, -0.3, 0.53, -0.18);
    shape.bezierCurveTo(0.27, -0.08, 0.25, 0.2, 0.5, 0.3);
    shape.bezierCurveTo(0.33, 0.55, 0.14, 0.43, 0, 0.36);
    const mark = new THREE.Mesh(new THREE.ShapeGeometry(shape, 16), material('#29343c', { metalness: 0.65 }));
    mark.scale.setScalar(size); mark.rotation.x = -Math.PI / 2; mark.position.y = y; parent.add(mark);
    const leaf = new THREE.Mesh(new THREE.CircleGeometry(size * 0.14, 16), mark.material);
    leaf.scale.set(0.65, 1.6, 1); leaf.rotation.set(-Math.PI / 2, 0, -0.6); leaf.position.set(size * 0.14, y + 0.0002, -size * 0.62); parent.add(leaf);
  }

  const mini = new THREE.Group(); mini.name = 'mac-mini'; mini.position.set(2.3, 1.21, -1.02); group.add(mini);
  rounded(0.44, 0.14, 0.44, 0.045, aluminum, 0, 0, 0, mini, true);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.025, 40), black);
  foot.position.y = -0.078; mini.add(foot);
  appleMark(0.075, mini, 0.071);
  for (const x of [-0.065, 0.015]) rounded(0.043, 0.018, 0.008, 0.006, black, x, -0.012, 0.218, mini);
  const jack = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 24), black);
  jack.rotation.x = Math.PI / 2; jack.position.set(-0.15, -0.012, 0.218); mini.add(jack);
  const secretNode = rounded(0.028, 0.014, 0.01, 0.004, black, 0.166, -0.012, 0.223, mini);
  const secretPosition = new THREE.Vector3(2.466, 1.198, -0.787);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.005, 8, 40), green);
  ring.position.copy(secretPosition); ring.position.z += 0.015; ring.visible = false; group.add(ring);

  const laptop = new THREE.Group(); laptop.name = 'macbook-pro'; laptop.position.set(-1.2, 1.16, -0.65); laptop.rotation.y = 0.2; group.add(laptop);
  rounded(1.12, 0.045, 0.72, 0.022, spaceGray, 0, 0, 0, laptop, true);
  rounded(0.87, 0.008, 0.3, 0.004, black, 0, 0.025, -0.13, laptop);
  const keys = new THREE.InstancedMesh(new THREE.BoxGeometry(0.054, 0.008, 0.04), material('#39444c'), 60);
  const keyPose = new THREE.Object3D(); let key = 0;
  for (let row = 0; row < 5; row++) for (let col = 0; col < 12; col++) {
    keyPose.position.set(-0.37 + col * 0.067, 0.033, -0.25 + row * 0.052); keyPose.updateMatrix(); keys.setMatrixAt(key++, keyPose.matrix);
  }
  laptop.add(keys);
  rounded(0.34, 0.004, 0.2, 0.002, material('#8e9aa3', { metalness: 0.8, roughness: 0.35 }), 0, 0.025, 0.18, laptop);
  rounded(0.055, 0.009, 0.04, 0.003, material('#d8f36a', { emissive: '#d8f36a', emissiveIntensity: 0.1 }), -0.37, 0.034, -0.25, laptop);
  const speakerMap = makeTexture(64, 256, (ctx, w, h) => {
    ctx.fillStyle = '#78858e'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#202b32';
    for (let y = 5; y < h; y += 8) for (let x = 5; x < w; x += 8) ctx.fillRect(x, y, 2, 2);
  });
  textures.add(speakerMap);
  for (const x of [-0.493, 0.493]) {
    const speaker = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.31), new THREE.MeshBasicMaterial({ map: speakerMap }));
    speaker.rotation.x = -Math.PI / 2; speaker.position.set(x, 0.026, -0.13); laptop.add(speaker);
  }
  const lid = new THREE.Group(); lid.position.set(0, 0.028, -0.33); lid.rotation.x = -0.2; laptop.add(lid);
  rounded(1.1, 0.68, 0.026, 0.013, spaceGray, 0, 0.34, 0, lid, true);
  rounded(1.055, 0.638, 0.008, 0.004, black, 0, 0.342, 0.015, lid);
  const laptopMap = screenTexture(true); textures.add(laptopMap);
  const laptopScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.01, 0.585), new THREE.MeshBasicMaterial({ map: laptopMap }));
  laptopScreen.position.set(0, 0.347, 0.021); lid.add(laptopScreen);
  rounded(0.11, 0.026, 0.006, 0.003, black, 0, 0.631, 0.025, lid);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.005, 16), material('#14262c', { metalness: 0.8, roughness: 0.2 }));
  lens.position.set(0, 0.631, 0.029); lid.add(lens);
  for (const x of [-0.2, 0.2]) rounded(0.12, 0.035, 0.045, 0.016, black, x, 0.015, -0.32, laptop);

  const mouse = new THREE.Group(); mouse.name = 'wireless-mouse'; mouse.position.set(1.7, 1.15, -0.25); mouse.rotation.y = -0.12; group.add(mouse);
  rounded(0.235, 0.025, 0.37, 0.012, black, 0, 0, 0, mouse);
  const shellGeometry = new THREE.SphereGeometry(1, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2);
  const positions = shellGeometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    positions.setXYZ(i, x * 0.13 * (z < 0 ? 0.9 : 1), y * 0.07 * (1 + z * 0.12), z * 0.21);
  }
  shellGeometry.computeVertexNormals();
  const shell = new THREE.Mesh(shellGeometry, material('#bac3c9', { metalness: 0.35, roughness: 0.28 }));
  shell.position.y = 0.012; shell.castShadow = true; shell.receiveShadow = true; mouse.add(shell); scanMeshes.push(shell);
  function seam(points) {
    const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    mouse.add(new THREE.Mesh(new THREE.TubeGeometry(path, 24, 0.0017, 6, false), black));
  }
  seam([[0, 0.041, -0.185], [0, 0.065, -0.12], [0, 0.08, -0.025]]);
  seam([[-0.12, 0.036, 0.02], [-0.075, 0.07, 0.02], [0, 0.084, 0.02], [0.075, 0.07, 0.02], [0.12, 0.036, 0.02]]);
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.023, 0.023, 0.025, 32), material('#2b343b', { roughness: 0.9 }));
  wheel.rotation.z = Math.PI / 2; wheel.position.set(0, 0.072, -0.08); mouse.add(wheel);
  const wheelAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.03, 16), spaceGray);
  wheelAxle.rotation.z = Math.PI / 2; wheelAxle.position.copy(wheel.position); mouse.add(wheelAxle);

  const scanTargets = [];
  for (const [device, action] of [[laptop, 'inspect-laptop'], [mini, 'inspect-mini']]) {
    device.traverse(object => {
      if (!object.isMesh) return;
      object.userData.scanAction = action;
      if (device === laptop) object.userData.action = 'blog';
      scanTargets.push(object);
    });
  }

  return { group, scanMeshes, scanTargets, secretNode, ring, secretPosition, laptopScreen, laptopLightPosition: new THREE.Vector3(-1.2, 1.56, -0.97) };
}
