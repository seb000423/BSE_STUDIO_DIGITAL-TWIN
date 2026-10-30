// Background — modules spread over a blueprint floor assemble, like a crane would place them, into a factory site:
// a sawtooth-roof hall with glazing and dock doors, an office annex, silos and stacks.
// The cubes above the hall's front settle into the BSE logo, a rooftop sign that then turns into a solid metal emblem.
// A scan sweeps the finished twin, then everything spreads out again.
// three.js draws the scene, anime.js times it. Both load from a CDN (import map in index.html); no build step.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { createTimeline } from 'https://cdn.jsdelivr.net/npm/animejs@4.0.2/lib/anime.esm.js';

const canvas = document.getElementById('bg');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const dark = matchMedia('(prefers-color-scheme: dark)');
const small = Math.min(innerWidth, innerHeight) < 640;
const rand = (a, b) => a + Math.random() * (b - a);
const FLOOR = -22;
const SPAN_X = 68;

// 1. The finished site. Each target is one cube: where it ends up, its size, and what it is (wall, roof, glass, steel, logo)
const targets = [];
const add = (x, y, z, cell, kind) => targets.push({ pos: new THREE.Vector3(x, y, z), cell, kind });

// Hollow shell of a box of cells; `look(i, j, k, top)` names each shell cell, or returns null to leave a hole
function shell(cols, depth, height, cell, origin, look) {
  const inside = (i, j, k) => i >= 0 && i < cols && k >= 0 && k < depth && j >= 0 && j < height(i);
  for (let i = 0; i < cols; i++) {
    for (let k = 0; k < depth; k++) {
      for (let j = 0; j < height(i); j++) {
        const top = !inside(i, j + 1, k);
        const outer = top || !inside(i - 1, j, k) || !inside(i + 1, j, k) || !inside(i, j, k - 1) || !inside(i, j, k + 1);
        if (!outer) continue;
        const kind = look(i, j, k, top, inside);
        if (kind) add(origin.x + (i + 0.5) * cell, FLOOR + (j + 0.5) * cell, origin.z + (k + 0.5) * cell, cell, kind);
      }
    }
  }
}

// Main hall — sawtooth roof whose steep faces are glazed, a window band, two dock doors at the front
const C = 3;
const COLS = 24;
const DEPTH = 10;
const bay = (i) => 7 + Math.floor((i % 6) / 2);
shell(COLS, DEPTH, bay, C, { x: -COLS * C / 2, z: -DEPTH * C - 4.5 }, (i, j, k, top, inside) => {
  const front = k === DEPTH - 1;
  if (front && j < 3 && ((i >= 2 && i <= 4) || (i >= 19 && i <= 21))) return null;
  if (top) return 'roof';
  if (!inside(i + 1, j, k) && i < COLS - 1) return 'glass';
  if (j === 4 && (front || k === 0 || i === 0 || i === COLS - 1)) return 'glass';
  return 'wall';
});

// Office annex on the left — flat roof, a grid of windows
shell(6, 6, () => 4, C, { x: -COLS * C / 2 - 6 * C - 1, z: -6 * C - 4.5 }, (i, j, k, top) =>
  top ? 'roof' : j > 0 && i % 2 === 0 ? 'glass' : 'wall',
);

// Two silos on the right, with cone tops
const S = 1.5;
for (const [cx, cz] of [[44, -26], [52, -16]]) {
  for (let j = 0; j < 20; j++) {
    const r = j < 17 ? 3.4 : 3.4 - (j - 16) * 0.9;
    for (let x = -4; x <= 4; x++) {
      for (let z = -4; z <= 4; z++) {
        const d = Math.hypot(x * S, z * S);
        if (Math.abs(d - r) < S * 0.55 || (j === 19 && d < r)) add(cx + x * S, FLOOR + (j + 0.5) * S, cz + z * S, S, j % 6 === 5 ? 'steel' : 'wall');
      }
    }
  }
}

// Two stacks behind the hall, banded
for (const [cx, cz, h] of [[-18, -40, 30], [-8, -40, 26]]) {
  for (let j = 0; j < h; j++) {
    for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) add(cx + dx * S, FLOOR + (j + 0.5) * S, cz + dz * S, S, j % 7 === 6 ? 'glass' : 'steel');
  }
}

// A pipe run from the silos into the hall
for (let x = 36.5; x <= 46; x += 1) add(x, FLOOR + 20, -22, 1, 'steel');

// The logo, traced from the header SVG (42×38) onto a grid — cubes settle here, then hand over to the emblem.
// It stands on two short posts on the hall's roof, over the front wall.
const L = 0.65;
const LW = 42;
const LH = 38;
const VERTS = [['B', 21, 8], ['S', 8, 30], ['E', 34, 30]];
const ROOF_TOP = FLOOR + bay(9) * C;
const LOGO_BASE = ROOF_TOP + 3;
const logoAt = (x, y) => new THREE.Vector2((x - LW / 2) * L, LOGO_BASE + (LH - 1 - y) * L);
const trace = document.createElement('canvas');
trace.width = LW;
trace.height = LH;
const g = trace.getContext('2d', { willReadFrequently: true });
g.lineWidth = 1.8;
g.beginPath();
g.moveTo(21, 8);
g.lineTo(8, 30);
g.lineTo(34, 30);
g.closePath();
g.stroke();
for (const [, x, y] of VERTS) {
  g.beginPath();
  g.arc(x, y, 7, 0, Math.PI * 2);
  g.fill();
}
const pixels = g.getImageData(0, 0, LW, LH).data;
const LOGO_Z = -6;
for (const [, x] of VERTS.slice(1)) {
  for (let y = ROOF_TOP + 0.5; y < LOGO_BASE + 1; y += 1) add((x - LW / 2) * L, y, LOGO_Z, 1, 'steel');
}
for (let y = 0; y < LH; y++) {
  for (let x = 0; x < LW; x++) {
    if (pixels[(y * LW + x) * 4 + 3] < 128) continue;
    const at = logoAt(x + 0.5, y + 0.5);
    add(at.x, at.y, LOGO_Z, L, 'logo');
  }
}

// 2. Where each cube waits when spread out: a free slot on a 4-unit grid through the space
const slots = [];
for (let x = -SPAN_X; x <= SPAN_X; x += 4) {
  for (let y = -16; y <= 64; y += 4) for (let z = -52; z <= 16; z += 4) slots.push([x, y, z]);
}
for (let i = slots.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [slots[i], slots[j]] = [slots[j], slots[i]];
}
const highest = Math.max(...targets.map((t) => t.pos.y));
const cubes = targets.map((target, i) => ({
  ...target,
  away: new THREE.Vector3(...slots[i % slots.length]),
  size: 0.5 + 2.2 * Math.random() ** 3,
  turn: new THREE.Euler(rand(-0.6, 0.6), rand(-1.5, 1.5), rand(-0.6, 0.6)),
  shade: Math.random(),
  bob: rand(0, Math.PI * 2),
  rise: (target.pos.y - FLOOR) / (highest - FLOOR), // 0 at the floor, 1 at the top
  t: 0, // 0 = spread out, 1 = in place
}));

// 3. Scene
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch {
  // No WebGL (old device, disabled GPU) — the page simply stays plain
  canvas.remove();
  throw new Error('BSE background: WebGL unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
const scene = new THREE.Scene();
// A soft studio environment, only seen as reflections on the metal emblem
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(40, 1, 1, 600);
scene.add(new THREE.AmbientLight(0xffffff, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.8);
sun.position.set(30, 60, 80);
scene.add(sun);

const group = new THREE.Group();
scene.add(group);
const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), cubes.length);
group.add(mesh);

// Blueprint floor grid
const grid = new THREE.GridHelper(SPAN_X * 2 + 40, (SPAN_X * 2 + 40) / 4);
grid.position.y = FLOOR - 0.01;
grid.material.transparent = true;
grid.material.opacity = 0.7;
group.add(grid);

// The emblem — bevelled metal discs joined by round bars, with raised letters
const shellMetal = new THREE.MeshStandardMaterial({ metalness: 0.9, roughness: 0.3, transparent: true });
const letterMetal = new THREE.MeshStandardMaterial({ metalness: 0.5, roughness: 0.22, transparent: true });
const emblem = new THREE.Group();
const DISC_DEPTH = 1.4;
const discShape = new THREE.Shape().absarc(0, 0, 7 * L, 0, Math.PI * 2);
const disc = new THREE.ExtrudeGeometry(discShape, { depth: DISC_DEPTH, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 4, curveSegments: 64 });
const centres = VERTS.map(([, x, y]) => logoAt(x, y));
for (const c of centres) {
  const d = new THREE.Mesh(disc, shellMetal);
  d.position.set(c.x, c.y, -DISC_DEPTH / 2);
  emblem.add(d);
}
for (let i = 0; i < 3; i++) {
  const a = centres[i];
  const b = centres[(i + 1) % 3];
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, a.distanceTo(b), 24), shellMetal);
  bar.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, 0);
  bar.rotation.z = Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2;
  emblem.add(bar);
}
new FontLoader().load('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/fonts/helvetiker_bold.typeface.json', (font) => {
  VERTS.forEach(([letter], i) => {
    const geometry = new TextGeometry(letter, { font, size: 4.4, depth: 0.7, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 3, curveSegments: 8 });
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    geometry.translate(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, 0);
    const text = new THREE.Mesh(geometry, letterMetal);
    text.position.set(centres[i].x, centres[i].y, DISC_DEPTH / 2 + 0.25);
    emblem.add(text);
  });
  if (still.matches) draw();
});
emblem.position.z = LOGO_Z;
group.add(emblem);
const shine = { k: 0 }; // 0 = logo still made of cubes, 1 = solid emblem

// The scan plane — a thin vertical sheet sweeping along x over the finished site
const scan = { x: -SPAN_X - 20 };
const sheet = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false }),
);
sheet.rotation.y = Math.PI / 2;
sheet.scale.set(70, 56, 1);
sheet.position.set(0, FLOOR + 28, -20);
group.add(sheet);

// Greys only for the cubes, kept close to the page colour so the text in front always wins; glass and steel a step
// darker (lighter in dark mode) so the buildings read. The emblem is graphite with silver letters (inverted in dark mode).
let tone;
function paint() {
  tone = dark.matches
    ? { lo: 0.17, hi: 0.28, roof: 0.33, glass: 0.1, steel: 0.4, lit: 0.55, line: 0.24, sheet: 0.06 }
    : { lo: 0.8, hi: 0.9, roof: 0.94, glass: 0.6, steel: 0.68, lit: 0.55, line: 0.86, sheet: 0.05 };
  grid.material.color.setRGB(tone.line, tone.line, tone.line, THREE.SRGBColorSpace);
  sheet.material.color.setRGB(tone.lit, tone.lit, tone.lit, THREE.SRGBColorSpace);
  sheet.material.opacity = tone.sheet;
  shellMetal.color.set(dark.matches ? 0xc9ccd2 : 0x2c2e33);
  letterMetal.color.set(dark.matches ? 0x1a1b1f : 0xf4f2ee);
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const qa = new THREE.Quaternion();
const upright = new THREE.Quaternion();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
const c = new THREE.Color();
const grey = (v) => c.setRGB(v, v, v, THREE.SRGBColorSpace);

function place(sec) {
  cubes.forEach((cube, i) => {
    const t = cube.t;
    // Right-angle path, like a crane: travel across first, then lower straight down into place
    const across = Math.min(t * 2, 1);
    const down = Math.max(t * 2 - 1, 0);
    p.set(
      cube.away.x + (cube.pos.x - cube.away.x) * across,
      cube.away.y + Math.sin(sec * 0.6 + cube.bob) * 0.4 * (1 - t) + (cube.pos.y - cube.away.y) * down,
      cube.away.z + (cube.pos.z - cube.away.z) * across,
    );
    q.slerpQuaternions(qa.setFromEuler(cube.turn), upright, across);
    const hit = Math.exp(-(((cube.pos.x - scan.x) / 6) ** 2)) * down;
    // Logo cubes shrink away as the emblem takes over
    const handover = cube.kind === 'logo' ? 1 - shine.k : 1;
    s.setScalar((cube.size + (cube.cell * 0.92 - cube.size) * t) * (1 + hit * 0.25) * handover);
    mesh.setMatrixAt(i, m.compose(p, q, s));
    const base = tone.lo + cube.shade * (tone.hi - tone.lo);
    const goal = { roof: tone.roof, glass: tone.glass, steel: tone.steel, logo: tone.steel }[cube.kind] ?? base;
    const settled = base + (goal - base) * down * (cube.kind === 'roof' ? 0.6 : 0.85);
    mesh.setColorAt(i, grey(settled + (tone.lit - settled) * hit));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  sheet.position.x = scan.x;
  sheet.visible = Math.abs(scan.x) < SPAN_X + 10;
  // The emblem slides forward out of the cube logo and fades in
  emblem.visible = shine.k > 0.001;
  shellMetal.opacity = letterMetal.opacity = shine.k;
  emblem.position.z = LOGO_Z + shine.k * 1.5;
  emblem.scale.setScalar(0.94 + shine.k * 0.06);
}

function fit() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Looking down at the floor a little, aimed above the site so it fills the lower half, under the title and buttons;
  // far enough back that the whole site fits across wide screens
  const back = camera.aspect < 1 ? 230 : Math.max(140, 72 / (Math.tan(THREE.MathUtils.degToRad(20)) * camera.aspect));
  camera.position.set(0, 40, back);
  camera.lookAt(0, camera.aspect < 1 ? 34 : 26, -10);
  camera.updateProjectionMatrix();
}

function draw(time = 0) {
  const sec = still.matches ? 0 : time / 1000;
  group.rotation.y = still.matches ? -0.22 : -0.2 + Math.sin(sec * 0.07) * 0.22;
  place(sec);
  renderer.render(scene, camera);
}

paint();
fit();
addEventListener('resize', () => {
  fit();
  if (still.matches) draw();
});
dark.addEventListener('change', () => {
  paint();
  if (still.matches) draw();
});

// 4. Motion — spread out, assemble from the floor up (logo last), the logo becomes metal, scan, then spread out again
let timeline = null;
function start() {
  timeline?.pause();
  if (still.matches) {
    cubes.forEach((cube) => (cube.t = 1));
    shine.k = 1;
    draw();
    return;
  }
  timeline = createTimeline({ loop: true })
    .add(cubes, {
      t: 1,
      duration: 1500,
      ease: 'inOutCubic',
      delay: (cube) => cube.rise * 1800 + ((cube.pos.x + SPAN_X) / (SPAN_X * 2)) * 500 + (cube.kind === 'logo' ? 700 : 0),
    }, 3200)
    .add(shine, { k: 1, duration: 900, ease: 'inOutSine' }, '+=100')
    .add(scan, { x: [-SPAN_X - 20, SPAN_X + 20], duration: 4200, ease: 'inOutSine' }, '+=200')
    .add(shine, { k: 0, duration: 600, ease: 'inOutSine' }, '+=1400')
    .add(cubes, { t: 0, duration: 1500, ease: 'inOutCubic', delay: (cube) => (1 - cube.rise) * 900 }, '+=0');
  renderer.setAnimationLoop(draw);
}
still.addEventListener('change', () => {
  renderer.setAnimationLoop(null);
  start();
});
start();
