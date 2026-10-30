// Background — a digital-twin view of a factory: modules spread over a grid, parts riding conveyor lines on the
// floor, and a scan plane that sweeps across and lights up every module it passes (a "sync" of the twin).
// three.js draws the cubes (instanced meshes), anime.js times the placement and the scan. Both load from a CDN; no build step.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { animate } from 'https://cdn.jsdelivr.net/npm/animejs@4.0.2/lib/anime.esm.js';

const canvas = document.getElementById('bg');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const dark = matchMedia('(prefers-color-scheme: dark)');
const small = Math.min(innerWidth, innerHeight) < 640;
const rand = (a, b) => a + Math.random() * (b - a);

// 1. Modules — spread through the space but snapped to a 4-unit grid, mostly small with a few big ones
const STEP = 4;
const SPAN_X = 68;
const keep = small ? 0.08 : 0.13;
const modules = [];
for (let x = -SPAN_X; x <= SPAN_X; x += STEP) {
  for (let y = -16; y <= 32; y += STEP) {
    for (let z = -52; z <= 16; z += STEP) {
      if (Math.random() > keep) continue;
      modules.push({
        pos: new THREE.Vector3(x, y, z),
        size: 0.5 + 2.2 * Math.random() ** 3,
        turn: new THREE.Euler(rand(-0.6, 0.6), rand(-1.5, 1.5), rand(-0.6, 0.6)),
        shade: Math.random(),
        bob: rand(0, Math.PI * 2),
        k: 0, // placement progress (0 = not placed yet)
      });
    }
  }
}

// 2. Conveyor lines on the factory floor, parts moving along them
const FLOOR = -22;
const LANES = small ? [-30, -14, 2] : [-38, -26, -14, -2, 10];
const GAP = 6;
const parts = [];
LANES.forEach((z, lane) => {
  for (let x = -SPAN_X; x < SPAN_X; x += GAP) parts.push({ x, z, dir: lane % 2 ? -1 : 1 });
});

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
const box = new THREE.BoxGeometry(1, 1, 1);
const field = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial(), modules.length);
const belt = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial(), parts.length);
group.add(field, belt);

// Floor blueprint grid and the belt rails
const grid = new THREE.GridHelper(SPAN_X * 2 + 16, (SPAN_X * 2 + 16) / STEP);
grid.position.y = FLOOR - 1;
grid.material.transparent = true;
group.add(grid);
const railPoints = LANES.flatMap((z) => [-SPAN_X - 4, FLOOR - 0.6, z, SPAN_X + 4, FLOOR - 0.6, z]);
const rails = new THREE.LineSegments(
  new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(railPoints, 3)),
  new THREE.LineBasicMaterial({ transparent: true }),
);
group.add(rails);

// The scan plane — a thin vertical sheet sweeping along x
const scan = { x: -SPAN_X - 20 };
const sheet = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false }),
);
sheet.rotation.y = Math.PI / 2;
sheet.scale.set(80, 58, 1);
sheet.position.set(0, 7, -18);
group.add(sheet);

// Greys only, kept close to the page colour so the text in front always wins; the scan darkens (or lightens) what it touches
let tone;
function paint() {
  tone = dark.matches
    ? { lo: 0.17, hi: 0.3, lit: 0.55, line: 0.24, sheet: 0.06 }
    : { lo: 0.8, hi: 0.91, lit: 0.58, line: 0.86, sheet: 0.05 };
  const line = new THREE.Color().setRGB(tone.line, tone.line, tone.line, THREE.SRGBColorSpace);
  grid.material.color = line;
  grid.material.opacity = 0.7;
  rails.material.color = line;
  sheet.material.color.setRGB(tone.lit, tone.lit, tone.lit, THREE.SRGBColorSpace);
  sheet.material.opacity = tone.sheet;
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
const c = new THREE.Color();
const grey = (v) => c.setRGB(v, v, v, THREE.SRGBColorSpace);

function place(sec) {
  modules.forEach((mod, i) => {
    // How close the scan is: 1 right on it, fading out over ~8 units
    const hit = Math.exp(-(((mod.pos.x - scan.x) / 6) ** 2));
    p.copy(mod.pos);
    p.y += Math.sin(sec * 0.6 + mod.bob) * 0.4;
    s.setScalar(mod.size * mod.k * (1 + hit * 0.5));
    field.setMatrixAt(i, m.compose(p, q.setFromEuler(mod.turn), s));
    const base = tone.lo + mod.shade * (tone.hi - tone.lo);
    field.setColorAt(i, grey(base + (tone.lit - base) * hit));
  });
  parts.forEach((part, i) => {
    const length = SPAN_X * 2;
    const x = ((((part.x + part.dir * sec * 5 + SPAN_X) % length) + length) % length) - SPAN_X;
    const hit = Math.exp(-(((x - scan.x) / 6) ** 2));
    p.set(x, FLOOR, part.z);
    s.set(1.6, 1, 1.6);
    belt.setMatrixAt(i, m.compose(p, q.identity(), s));
    belt.setColorAt(i, grey(tone.hi + (tone.lit - tone.hi) * hit));
  });
  field.instanceMatrix.needsUpdate = true;
  field.instanceColor.needsUpdate = true;
  belt.instanceMatrix.needsUpdate = true;
  belt.instanceColor.needsUpdate = true;
  sheet.position.x = scan.x;
}

function fit() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Looking down at the floor a little; pull back on narrow screens so the lines still cross the screen
  const back = camera.aspect < 1 ? 150 : 105;
  camera.position.set(0, 30, back);
  camera.lookAt(0, 0, -10);
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

// 4. Motion — modules are placed left to right like a layout being built, then the scan sweeps across on a loop
let running = [];
function start() {
  running.forEach((a) => a.pause());
  if (still.matches) {
    modules.forEach((mod) => (mod.k = 1));
    scan.x = -SPAN_X - 20;
    draw();
    return;
  }
  running = [
    animate(modules, {
      k: [0, 1],
      duration: 700,
      ease: 'outBack',
      delay: (mod) => ((mod.pos.x + SPAN_X) / (SPAN_X * 2)) * 1400 + Math.random() * 300,
    }),
    animate(scan, {
      x: [-SPAN_X - 20, SPAN_X + 20],
      duration: 4200,
      delay: 1800,
      loopDelay: 2600,
      loop: true,
      ease: 'inOutSine',
    }),
  ];
  renderer.setAnimationLoop(draw);
}
still.addEventListener('change', () => {
  renderer.setAnimationLoop(null);
  start();
});
start();
