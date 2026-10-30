// Background — modules spread over a blueprint floor assemble, like a crane would place them, into a factory hall
// with the BSE logo standing at its front; a scan sweeps the finished twin, then the modules spread out again.
// three.js draws the cubes (one instanced mesh), anime.js times the assembly and the scan. Both load from a CDN; no build step.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { createTimeline } from 'https://cdn.jsdelivr.net/npm/animejs@4.0.2/lib/anime.esm.js';

const canvas = document.getElementById('bg');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const dark = matchMedia('(prefers-color-scheme: dark)');
const small = Math.min(innerWidth, innerHeight) < 640;
const rand = (a, b) => a + Math.random() * (b - a);
const FLOOR = -22;
const SPAN_X = 68;

// 1. The finished shape: a hollow sawtooth-roof hall, a chimney, and the logo in front of the hall
const targets = []; // { pos, cell, logo }
const C = 3; // hall module size
const COLS = 28;
const DEPTH = 10;
const roof = (i) => 7 + Math.floor((i % 7) / 2); // sawtooth: rises across each bay, then drops
const hall = (i, j, k) => i >= 0 && i < COLS && k >= 0 && k < DEPTH && j >= 0 && j < roof(i);
for (let i = 0; i < COLS; i++) {
  for (let k = 0; k < DEPTH; k++) {
    for (let j = 0; j < roof(i); j++) {
      // Keep only the outer shell
      const shell = !hall(i - 1, j, k) || !hall(i + 1, j, k) || !hall(i, j + 1, k) || !hall(i, j, k - 1) || !hall(i, j, k + 1);
      if (!shell) continue;
      targets.push({ pos: new THREE.Vector3((i - COLS / 2 + 0.5) * C, FLOOR + (j + 0.5) * C, (k - DEPTH + 0.5) * C - 6), cell: C });
    }
  }
}
for (let j = 0; j < 15; j++) {
  for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    targets.push({ pos: new THREE.Vector3(30 + dx * C, FLOOR + (j + 0.5) * C, -30 - dz * C), cell: C });
  }
}

// Trace the logo (same geometry as the header SVG, 42×38) onto a grid; every filled cell becomes a small cube,
// sized so the logo fits the hall's front wall
const L = 0.65;
const LW = 42;
const LH = 38;
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
const VERTS = [['B', 21, 8], ['S', 8, 30], ['E', 34, 30]];
for (const [, x, y] of VERTS) {
  g.beginPath();
  g.arc(x, y, 7, 0, Math.PI * 2);
  g.fill();
}
// Letters are punched out of the circles, just like the logo
g.globalCompositeOperation = 'destination-out';
g.font = '800 9px Arial, Helvetica, sans-serif';
g.textAlign = 'center';
g.textBaseline = 'middle';
for (const [letter, x, y] of VERTS) g.fillText(letter, x, y + 0.4);
const pixels = g.getImageData(0, 0, LW, LH).data;
for (let y = 0; y < LH; y++) {
  for (let x = 0; x < LW; x++) {
    if (pixels[(y * LW + x) * 4 + 3] < 128) continue;
    for (const z of [-1.6, -0.95]) {
      targets.push({ pos: new THREE.Vector3((x - LW / 2 + 0.5) * L, FLOOR + (LH - y) * L + 1, z), cell: L, logo: true });
    }
  }
}

// 2. Where each module waits when spread out: a free slot on a 4-unit grid through the space
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
const camera = new THREE.PerspectiveCamera(40, 1, 1, 500);
scene.add(new THREE.AmbientLight(0xffffff, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.8);
sun.position.set(30, 60, 80);
scene.add(sun);

const group = new THREE.Group();
scene.add(group);
const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), cubes.length);
group.add(mesh);

// Blueprint floor grid
const grid = new THREE.GridHelper(SPAN_X * 2 + 16, (SPAN_X * 2 + 16) / 4);
grid.position.y = FLOOR - 0.01;
grid.material.transparent = true;
grid.material.opacity = 0.7;
group.add(grid);

// The scan plane — a thin vertical sheet sweeping along x over the finished hall
const scan = { x: -SPAN_X - 20 };
const sheet = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false }),
);
sheet.rotation.y = Math.PI / 2;
sheet.scale.set(60, 50, 1);
sheet.position.set(0, FLOOR + 25, -18);
group.add(sheet);

// Greys only, kept close to the page colour so the text in front always wins.
// The logo settles a step darker (lighter in dark mode) so it reads once assembled; the scan does the same to what it touches.
let tone;
function paint() {
  tone = dark.matches
    ? { lo: 0.17, hi: 0.3, logo: 0.42, lit: 0.55, line: 0.24, sheet: 0.06 }
    : { lo: 0.8, hi: 0.91, logo: 0.66, lit: 0.58, line: 0.86, sheet: 0.05 };
  grid.material.color.setRGB(tone.line, tone.line, tone.line, THREE.SRGBColorSpace);
  sheet.material.color.setRGB(tone.lit, tone.lit, tone.lit, THREE.SRGBColorSpace);
  sheet.material.opacity = tone.sheet;
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
    s.setScalar((cube.size + (cube.cell * 0.9 - cube.size) * t) * (1 + hit * 0.25));
    mesh.setMatrixAt(i, m.compose(p, q, s));
    const base = tone.lo + cube.shade * (tone.hi - tone.lo);
    const settled = cube.logo ? base + (tone.logo - base) * down : base;
    mesh.setColorAt(i, grey(settled + (tone.lit - settled) * hit));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  sheet.position.x = scan.x;
  sheet.visible = Math.abs(scan.x) < SPAN_X + 10;
}

function fit() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Looking down at the floor a little, aimed above the hall so it lands under the title and buttons;
  // pull back on narrow screens so the hall still fits across
  const back = camera.aspect < 1 ? 200 : 135;
  camera.position.set(0, 34, back);
  camera.lookAt(0, camera.aspect < 1 ? 24 : 16, -10);
  camera.updateProjectionMatrix();
}

function draw(time = 0) {
  const sec = still.matches ? 0 : time / 1000;
  group.rotation.y = still.matches ? -0.3 : -0.25 + Math.sin(sec * 0.07) * 0.25;
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

// 4. Motion — spread out, assemble from the floor up (logo last), scan the finished twin, spread out again
let timeline = null;
function start() {
  timeline?.pause();
  if (still.matches) {
    cubes.forEach((cube) => (cube.t = 1));
    draw();
    return;
  }
  timeline = createTimeline({ loop: true })
    .add(cubes, {
      t: 1,
      duration: 1500,
      ease: 'inOutCubic',
      delay: (cube) => cube.rise * 1800 + ((cube.pos.x + SPAN_X) / (SPAN_X * 2)) * 500 + (cube.logo ? 700 : 0),
    }, 3200)
    .add(scan, { x: [-SPAN_X - 20, SPAN_X + 20], duration: 4200, ease: 'inOutSine' }, '+=300')
    .add(cubes, { t: 0, duration: 1500, ease: 'inOutCubic', delay: (cube) => (1 - cube.rise) * 900 }, '+=1200');
  renderer.setAnimationLoop(draw);
}
still.addEventListener('change', () => {
  renderer.setAnimationLoop(null);
  start();
});
start();
