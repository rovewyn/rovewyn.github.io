import * as THREE from 'three';

// A fictional glyph inventory. IDs select shapes, not letters or meanings.
const glyphSpines = [
  [[0.15, 0.12], [0.62, 0.12], [0.8, 0.3], [0.53, 0.52], [0.53, 0.9]],
  [[0.14, 0.3], [0.35, 0.1], [0.7, 0.1], [0.7, 0.73], [0.48, 0.9], [0.23, 0.9]],
  [[0.2, 0.1], [0.2, 0.66], [0.41, 0.84], [0.78, 0.84], [0.78, 0.58], [0.55, 0.42]],
  [[0.14, 0.76], [0.44, 0.76], [0.44, 0.14], [0.78, 0.14], [0.78, 0.36], [0.61, 0.52]],
  [[0.15, 0.17], [0.4, 0.4], [0.76, 0.4], [0.76, 0.65], [0.5, 0.89], [0.22, 0.89]],
  [[0.16, 0.12], [0.16, 0.42], [0.56, 0.42], [0.76, 0.62], [0.76, 0.87], [0.47, 0.87]],
  [[0.16, 0.34], [0.39, 0.12], [0.74, 0.12], [0.74, 0.45], [0.4, 0.72], [0.4, 0.9]],
  [[0.2, 0.13], [0.57, 0.13], [0.57, 0.7], [0.78, 0.7], [0.78, 0.89], [0.16, 0.89]],
];

function drawGlyph(ctx, id, x, y, width, height) {
  ctx.save(); ctx.translate(x, y); ctx.scale(width, height);
  ctx.lineWidth = 0.045; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const spine = glyphSpines[id % glyphSpines.length];
  ctx.beginPath(); spine.forEach(([px, py], i) => { if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }); ctx.stroke();
  const branchY = 0.24 + (id % 3) * 0.17;
  ctx.beginPath(); ctx.moveTo(0.1, branchY); ctx.lineTo(0.37, branchY); ctx.lineTo(0.48, branchY + 0.11); ctx.stroke();
  if (id % 2) {
    ctx.beginPath(); ctx.arc(0.7, 0.65, 0.105, -1.3, 2.3); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(0.87, 0.64); ctx.lineTo(0.87, 0.87); ctx.lineTo(0.69, 0.94); ctx.stroke();
  }
  ctx.fillRect(0.35 + (id % 2) * 0.12, 0.02, 0.055, 0.055);
  ctx.restore();
}

function drawGlyphRow(ctx, ids, width, y, glyphHeight, span = 0.84) {
  const step = width * span / ids.length;
  ids.forEach((id, index) => drawGlyph(ctx, id, width * (1 - span) / 2 + index * step, y, step * 0.8, glyphHeight));
}

export function createNeonSigns({ box, material, makeTexture, textures }) {
  const group = new THREE.Group();
  group.name = 'neon-signs';
  const housing = material('#182632', { metalness: 0.65, roughness: 0.3 });
  const bracket = material('#52616c', { metalness: 0.7 });
  const pink = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff398b').multiplyScalar(3.2), toneMapped: false });
  const cyan = new THREE.MeshBasicMaterial({ color: new THREE.Color('#73e5e2').multiplyScalar(2), toneMapped: false });
  const signs = [
    { position: [-5.2, 4.4, -8.1], size: [2.5, 1.05], glyphs: [2, 7, 4, 11, 0, 5, 14], detail: [8, 1, 13, 6], support: 1.1 },
    { position: [6.5, 5.8, -11], size: [1.2, 2.9], glyphs: [9, 4, 15], vertical: true, support: 0.7 },
    { position: [1.7, 7.7, -17.5], size: [2.2, 0.6], glyphs: [12, 3, 8, 5, 10, 1], support: 0.7 },
  ];
  for (const { position, size: [w, h], glyphs, detail, vertical, support } of signs) {
    const sign = new THREE.Group(); sign.position.set(...position); group.add(sign);
    box(w, h, 0.1, housing, 0, 0, 0, sign);
    for (const x of [-w * 0.36, w * 0.36]) {
      box(0.045, 0.045, support, bracket, x, -h * 0.25, -support / 2, sign);
      box(0.04, h * 0.65, 0.045, bracket, x, 0, -support, sign);
    }
    const rim = vertical ? cyan : pink;
    for (const x of [-w / 2 + 0.04, w / 2 - 0.04]) box(0.014, h - 0.08, 0.025, rim, x, 0, 0.075, sign);
    for (const y of [-h / 2 + 0.04, h / 2 - 0.04]) box(w - 0.08, 0.014, 0.025, rim, 0, y, 0.075, sign);
    const map = makeTexture(vertical ? 512 : 1536, vertical ? 1024 : 512, (ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#ffffff';
      if (vertical) glyphs.forEach((id, i) => drawGlyph(ctx, id, width * 0.24, height * (0.1 + i * 0.28), width * 0.55, height * 0.21));
      else drawGlyphRow(ctx, glyphs, width, height * (detail ? 0.15 : 0.2), height * (detail ? 0.44 : 0.6));
      if (detail) drawGlyphRow(ctx, detail, width, height * 0.73, height * 0.12, 0.28);
    });
    textures.add(map);
    const lettering = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, h * 0.9),
      new THREE.MeshBasicMaterial({ map, color: new THREE.Color('#ff72ad').multiplyScalar(3), transparent: true, depthWrite: false, toneMapped: false }));
    lettering.position.z = 0.065; sign.add(lettering);
    if (!vertical) box(w * 0.18, 0.02, 0.02, cyan, -w * 0.33, -h * 0.36, 0.075, sign);
  }
  return { group };
}
