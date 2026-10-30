// Background — the BSE triangle logo built from small cubes that burst apart and snap back together.
// three.js draws the cubes (one instanced mesh), anime.js times the burst. Both load from a CDN; no build step.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { createTimeline } from 'https://cdn.jsdelivr.net/npm/animejs@4.0.2/lib/anime.esm.js';

const canvas = document.getElementById('bg');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const dark = matchMedia('(prefers-color-scheme: dark)');
const small = Math.min(innerWidth, innerHeight) < 640;

// 1. Trace the logo (same geometry as the header SVG, 42×38) onto a small grid; every filled cell becomes a cube
const SCALE = 1.6;
const W = Math.round(42 * SCALE);
const H = Math.round(38 * SCALE);
const trace = document.createElement('canvas');
trace.width = W;
trace.height = H;
const g = trace.getContext('2d', { willReadFrequently: true });
g.scale(SCALE, SCALE);
g.lineWidth = 1.8;
g.lineJoin = 'round';
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
const pixels = g.getImageData(0, 0, W, H).data;

const cubes = [];
const layers = small ? 2 : 3;
const rand = (a, b) => a + Math.random() * (b - a);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (pixels[(y * W + x) * 4 + 3] < 128) continue;
    for (let l = 0; l < layers; l++) {
      const hx = x - W / 2 + 0.5;
      const hy = H / 2 - y - 0.5 + 1.2;
      const hz = l - (layers - 1) / 2;
      // Where this cube flies to: outward from the centre, some towards the camera, bigger the further it goes
      const dir = new THREE.Vector3(hx, hy, hz * 4).normalize();
      const reach = rand(12, 55);
      cubes.push({
        t: 0,
        home: new THREE.Vector3(hx, hy, hz),
        away: new THREE.Vector3(hx + dir.x * reach + rand(-8, 8), hy + dir.y * reach + rand(-8, 8), rand(-40, 30)),
        size: rand(0.6, 2.6),
        spin: new THREE.Euler(rand(-3, 3), rand(-3, 3), rand(-3, 3)),
        shade: Math.random(),
        dist: Math.hypot(hx, hy),
      });
    }
  }
}

// 2. Scene
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
const camera = new THREE.PerspectiveCamera(35, 1, 1, 400);
scene.add(new THREE.AmbientLight(0xffffff, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.8);
sun.position.set(30, 50, 80);
scene.add(sun);

const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.82, 0.82, 0.82), new THREE.MeshLambertMaterial(), cubes.length);
const group = new THREE.Group();
group.add(mesh);
scene.add(group);

// Greys only, kept close to the page colour so the text in front always wins
function paint() {
  const [lo, hi] = dark.matches ? [0.17, 0.3] : [0.78, 0.9];
  const c = new THREE.Color();
  cubes.forEach((cube, i) => {
    const v = lo + cube.shade * (hi - lo);
    mesh.setColorAt(i, c.setRGB(v, v, v, THREE.SRGBColorSpace));
  });
  mesh.instanceColor.needsUpdate = true;
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
function place() {
  cubes.forEach((cube, i) => {
    const t = cube.t;
    p.lerpVectors(cube.home, cube.away, t);
    e.set(cube.spin.x * t, cube.spin.y * t, cube.spin.z * t);
    s.setScalar(1 + (cube.size - 1) * t);
    mesh.setMatrixAt(i, m.compose(p, q.setFromEuler(e), s));
  });
  mesh.instanceMatrix.needsUpdate = true;
}

function fit() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Logo fills about 70% of the height, or 90% of the width on narrow (phone) screens
  const span = Math.max(H / 0.7, W / 0.9 / camera.aspect);
  camera.position.set(0, 0, span / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  camera.updateProjectionMatrix();
}

function draw(time = 0) {
  const sec = time / 1000;
  group.rotation.y = still.matches ? -0.35 : Math.sin(sec * 0.25) * 0.45;
  group.rotation.x = still.matches ? 0.12 : Math.sin(sec * 0.17) * 0.15;
  place();
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

// 3. Motion — hold the logo, burst from the centre out, then fall back in from the edges
const maxDist = Math.max(...cubes.map((c) => c.dist));
let timeline = null;
function start() {
  timeline?.pause();
  if (still.matches) {
    cubes.forEach((c) => (c.t = 0));
    draw();
    return;
  }
  timeline = createTimeline({ loop: true })
    .add(cubes, { t: 1, duration: 1800, ease: 'outExpo', delay: (c) => (c.dist / maxDist) * 700 }, 2600)
    .add(cubes, { t: 0, duration: 2200, ease: 'inOutCubic', delay: (c) => (1 - c.dist / maxDist) * 700 }, '+=500');
  renderer.setAnimationLoop(draw);
}
still.addEventListener('change', () => {
  renderer.setAnimationLoop(null);
  start();
});
start();
