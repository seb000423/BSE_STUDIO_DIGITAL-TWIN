// Background — modules spread over a blueprint floor assemble, like a crane would place them, into a factory site:
// a sawtooth-roof hall with dock doors, an office annex, silos and stacks. A halftone field of floor tiles grows out
// from the centre with it; once built, the site beats twice, a ripple running out from the centre through the hall and
// the tiles. Then the tiles fade from the edges in and the cubes spread out again. One colour, fixed camera. three.js draws the scene, anime.js times it. Both load from a CDN (import map in index.html).
import * as THREE from 'three';
import { createTimeline } from 'https://cdn.jsdelivr.net/npm/animejs@4.0.2/lib/anime.esm.js';

const canvas = document.getElementById('bg');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const dark = matchMedia('(prefers-color-scheme: dark)');
const small = Math.min(innerWidth, innerHeight) < 640;
const rand = (a, b) => a + Math.random() * (b - a);
const FLOOR = -22;
const SPAN_X = 68;

// 1. The finished site. Each target is one cube: where it ends up and its size
const targets = [];
const add = (x, y, z, cell) => targets.push({ pos: new THREE.Vector3(x, y, z), cell });

// Hollow shell of a box of cells; `keep(i, j, k)` can leave a hole (a door)
function shell(cols, depth, height, cell, origin, keep = () => true) {
  const inside = (i, j, k) => i >= 0 && i < cols && k >= 0 && k < depth && j >= 0 && j < height(i);
  for (let i = 0; i < cols; i++) {
    for (let k = 0; k < depth; k++) {
      for (let j = 0; j < height(i); j++) {
        const outer = !inside(i, j + 1, k) || !inside(i - 1, j, k) || !inside(i + 1, j, k) || !inside(i, j, k - 1) || !inside(i, j, k + 1);
        if (outer && keep(i, j, k)) add(origin.x + (i + 0.5) * cell, FLOOR + (j + 0.5) * cell, origin.z + (k + 0.5) * cell, cell);
      }
    }
  }
}

// Main hall — sawtooth roof, two dock doors at the front
const C = 3;
const COLS = 24;
const DEPTH = 10;
const bay = (i) => 7 + Math.floor((i % 6) / 2);
shell(COLS, DEPTH, bay, C, { x: -COLS * C / 2, z: -DEPTH * C - 4.5 }, (i, j, k) =>
  !(k === DEPTH - 1 && j < 3 && ((i >= 2 && i <= 4) || (i >= 19 && i <= 21))),
);

// Office annex on the left
shell(6, 6, () => 4, C, { x: -COLS * C / 2 - 6 * C - 1, z: -6 * C - 4.5 });

// Two silos on the right, with cone tops
const S = 1.5;
for (const [cx, cz] of [[44, -26], [52, -16]]) {
  for (let j = 0; j < 20; j++) {
    const r = j < 17 ? 3.4 : 3.4 - (j - 16) * 0.9;
    for (let x = -4; x <= 4; x++) {
      for (let z = -4; z <= 4; z++) {
        const d = Math.hypot(x * S, z * S);
        if (Math.abs(d - r) < S * 0.55 || (j === 19 && d < r)) add(cx + x * S, FLOOR + (j + 0.5) * S, cz + z * S, S);
      }
    }
  }
}

// Two stacks behind the hall, and a pipe run from the silos into the hall
for (const [cx, cz, h] of [[-18, -40, 30], [-8, -40, 26]]) {
  for (let j = 0; j < h; j++) {
    for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) add(cx + dx * S, FLOOR + (j + 0.5) * S, cz + dz * S, S);
  }
}
for (let x = 36.5; x <= 46; x += 1) add(x, FLOOR + 20, -22, 1);

// 2. Where each cube waits when spread out: a free slot on a 4-unit grid in a low band hugging the site
const slots = [];
for (let x = -60; x <= 60; x += 4) {
  for (let y = FLOOR + 4; y <= FLOOR + 36; y += 4) for (let z = -48; z <= 8; z += 4) slots.push([x, y, z]);
}
for (let i = slots.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [slots[i], slots[j]] = [slots[j], slots[i]];
}
const highest = Math.max(...targets.map((t) => t.pos.y));
const cubes = targets.map((target, i) => ({
  ...target,
  away: new THREE.Vector3(...slots[i % slots.length]),
  size: 0.5 + 1.6 * Math.random() ** 3,
  turn: new THREE.Euler(rand(-0.6, 0.6), rand(-1.5, 1.5), rand(-0.6, 0.6)),
  bob: rand(0, Math.PI * 2),
  rise: (target.pos.y - FLOOR) / (highest - FLOOR), // 0 at the floor, 1 at the top
  t: 0, // 0 = spread out, 1 = in place
  pulse: 0, // the beat: 0 at rest, 1 at the peak
}));

// Halftone floor: one flat tile per grid cell, biggest at the centre of the site and fading out towards the edges
const CENTRE = new THREE.Vector3(0, FLOOR, -18);
const tiles = [];
for (let x = -86; x <= 86; x += 4) {
  for (let z = -78; z <= 30; z += 4) {
    const d = Math.hypot(x - CENTRE.x, (z - CENTRE.z) * 1.3) / 95;
    if (d < 1) tiles.push({ pos: new THREE.Vector3(x, FLOOR, z), size: 3.5 * (1 - d) ** 1.2, s: 0, pulse: 0 });
  }
}
// Distance from the centre, 0…1, sets when the ripple reaches each cube or tile
const reach = (item) => Math.min(1, item.pos.distanceTo(CENTRE) / 95);

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
const camera = new THREE.PerspectiveCamera(40, 1, 1, 600);
scene.add(new THREE.AmbientLight(0xffffff, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.8);
sun.position.set(30, 60, 80);
scene.add(sun);

// Turned a little so the hall shows its side; this view never moves
const group = new THREE.Group();
group.rotation.y = -0.2;
scene.add(group);
const material = new THREE.MeshLambertMaterial();
const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, cubes.length);
const tileMaterial = new THREE.MeshLambertMaterial();
const floor = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.35, 1).translate(0, 0.175, 0), tileMaterial, tiles.length);
group.add(mesh, floor);

// Blueprint floor grid
const grid = new THREE.GridHelper(SPAN_X * 2 + 40, (SPAN_X * 2 + 40) / 4);
grid.position.y = FLOOR - 0.01;
grid.material.transparent = true;
grid.material.opacity = 0.7;
group.add(grid);

// One grey for every cube, close to the page colour so the text in front always wins; the light gives the faces depth.
// Floor tiles a step darker so the halftone reads on the floor.
function paint() {
  const [cube, tile, line] = dark.matches ? [0.26, 0.34, 0.24] : [0.86, 0.72, 0.86];
  material.color.setRGB(cube, cube, cube, THREE.SRGBColorSpace);
  tileMaterial.color.setRGB(tile, tile, tile, THREE.SRGBColorSpace);
  grid.material.color.setRGB(line, line, line, THREE.SRGBColorSpace);
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const qa = new THREE.Quaternion();
const upright = new THREE.Quaternion();
const p = new THREE.Vector3();
const s = new THREE.Vector3();

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
    s.setScalar((cube.size + (cube.cell * 0.92 - cube.size) * t) * (1 + cube.pulse * 0.16));
    mesh.setMatrixAt(i, m.compose(p, q, s));
  });
  mesh.instanceMatrix.needsUpdate = true;
  tiles.forEach((tile, i) => {
    const k = Math.max(tile.size * tile.s * (1 + tile.pulse * 0.9), 0.0001);
    s.set(k, 1 + tile.pulse * 2, k);
    floor.setMatrixAt(i, m.compose(tile.pos, upright, s));
  });
  floor.instanceMatrix.needsUpdate = true;
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
  place(still.matches ? 0 : time / 1000);
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

// 4. Motion — spread out, assemble from the floor up while the tiles grow from the centre, two beats, then the tiles
// fade from the edges in and the cubes spread out again
let timeline = null;
function start() {
  timeline?.pause();
  if (still.matches) {
    cubes.forEach((cube) => (cube.t = 1));
    tiles.forEach((tile) => (tile.s = 1));
    draw();
    return;
  }
  timeline = createTimeline({ loop: true })
    .add(cubes, {
      t: 1,
      duration: 1500,
      ease: 'inOutCubic',
      delay: (cube) => cube.rise * 1800 + ((cube.pos.x + SPAN_X) / (SPAN_X * 2)) * 500,
    }, 3200)
    .add(tiles, { s: 1, duration: 900, ease: 'outQuad', delay: (tile) => reach(tile) * 2200 }, 3400);
  const both = [...cubes, ...tiles];
  const ripple = (item) => reach(item) * 700;
  for (const [peak, gap] of [[1, 300], [0.75, 120]]) {
    timeline
      .add(both, { pulse: peak, duration: 240, ease: 'outQuad', delay: ripple }, `+=${gap}`)
      .add(both, { pulse: 0, duration: 420, ease: 'inOutQuad', delay: ripple });
  }
  timeline
    .add(tiles, { s: 0, duration: 700, ease: 'inQuad', delay: (tile) => (1 - reach(tile)) * 1200 }, '+=1800')
    .add(cubes, { t: 0, duration: 1500, ease: 'inOutCubic', delay: (cube) => (1 - cube.rise) * 900 }, '<<+=300');
  renderer.setAnimationLoop(draw);
}
still.addEventListener('change', () => {
  renderer.setAnimationLoop(null);
  start();
});
start();
