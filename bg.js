// Background — a line drawing of a small factory: a hall with a see-through sawtooth roof over three robot arms and a
// work cell (a fenced conveyor).
// It stands between the title and the buttons. Clicking its floor grid lifts its parts off one another with a name label on each,
// and clicking again puts them back together. The view angle never changes.
// three.js draws the model, anime.js times the opening. Both load from a CDN; no build step.
import * as THREE from 'three';
import { animate } from 'https://cdn.jsdelivr.net/npm/animejs@4.0.2/lib/anime.esm.js';

const canvas = document.getElementById('bg');
const room = document.querySelector('.room');
const still = matchMedia('(prefers-reduced-motion: reduce)');

// 1. Drawing kit — every part is outlines over solid faces, so lines behind a part stay hidden
const ink = new THREE.LineBasicMaterial({ transparent: true });
const fineInk = new THREE.LineBasicMaterial({ transparent: true });
const meshInk = new THREE.LineBasicMaterial({ transparent: true });
const paper = new THREE.MeshBasicMaterial({ transparent: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
function outline(geometry, x = 0, y = 0, z = 0, parent) {
  const lines = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 20), ink);
  lines.add(new THREE.Mesh(geometry, paper));
  lines.position.set(x, y, z);
  parent?.add(lines);
  return lines;
}
const box = (w, h, d, x, y, z, parent) => outline(new THREE.BoxGeometry(w, h, d), x, y + h / 2, z, parent);
const drum = (r, h, x, y, z, parent, segments = 16) => outline(new THREE.CylinderGeometry(r, r, h, segments), x, y + h / 2, z, parent);

const model = new THREE.Group();

// Helper for parts that are only lines, with no faces to hide anything
const wires = (points, parent) => {
  const lines = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(points, 3)), ink);
  parent.add(lines);
  return lines;
};

// Floor slab with an even layout grid: a fine line every 2 units, a heavier one every 10. Both sizes are multiples of 10,
// so every cell is whole right up to the edge, and the floor runs well past the hall on all sides.
const FLOOR_W = 90;
const FLOOR_D = 80;
const HALL_W = 72;
const HALL_D = 64; // leaves clear space between the roof line and the fences
const floor = new THREE.Group();
box(FLOOR_W, 1, FLOOR_D, 0, -1, 0, floor);
const marks = (step, material) => {
  const points = [];
  for (let x = -FLOOR_W / 2; x <= FLOOR_W / 2; x += step) points.push(x, 0.02, -FLOOR_D / 2, x, 0.02, FLOOR_D / 2);
  for (let z = -FLOOR_D / 2; z <= FLOOR_D / 2; z += step) points.push(-FLOOR_W / 2, 0.02, z, FLOOR_W / 2, 0.02, z);
  wires(points, floor).material = material;
};
marks(2, fineInk);
marks(10, ink);

// The hall on the floor: columns, eaves beams and a four-bay sawtooth roof drawn in lines only, so it hides nothing
const hall = new THREE.Group();
for (let x = -35; x <= 35; x += 10) for (const z of [-HALL_D / 2 + 0.5, HALL_D / 2 - 0.5]) box(0.8, 16, 0.8, x, 0, z, hall);
for (const z of [-HALL_D / 2 + 0.5, HALL_D / 2 - 0.5]) box(HALL_W, 0.6, 0.6, 0, 15.4, z, hall);
for (const x of [-HALL_W / 2 + 0.3, HALL_W / 2 - 0.3]) box(0.6, 0.6, HALL_D, x, 15.4, 0, hall);
const tooth = new THREE.Shape();
tooth.moveTo(-HALL_W / 2, 0);
for (let i = 0; i < 4; i++) {
  tooth.lineTo(-HALL_W / 2 + i * (HALL_W / 4) + HALL_W / 4 - 3, 6);
  tooth.lineTo(-HALL_W / 2 + (i + 1) * (HALL_W / 4), 0);
}
tooth.lineTo(-HALL_W / 2, 0);
const roof = outline(new THREE.ExtrudeGeometry(tooth, { depth: HALL_D, bevelEnabled: false }), 0, 16, -HALL_D / 2, hall);
roof.clear();

// Work cell: a conveyor (frame, legs, rollers, a few parcels) running between two fences
const cell = new THREE.Group();
cell.position.x = -4; // centres the fences under the roof
box(46, 0.8, 4, 4, 4, 12, cell);
for (let x = -16; x <= 24; x += 8) for (const z of [10.4, 13.6]) box(0.5, 4, 0.5, x, 0, z, cell);
for (let x = -18; x <= 26; x += 2.2) {
  const roller = drum(0.35, 3.6, x, 0, 0, cell, 8);
  roller.rotation.x = Math.PI / 2;
  roller.position.set(x, 5.1, 12);
}
for (const x of [-12, 0, 13]) box(3, 2.2, 2.6, x, 5.5, 12, cell);

// Grid-mesh safety fences along both sides of the belt, well clear of it: posts, top and bottom rails, and a fine mesh
// drawn lighter so the belt still reads through it. Both ends stay open for the conveyor.
const FENCE_H = 12;
const MESH = 1.5;
const mesh = [];
for (const z of [2, 22]) {
  for (let x = -22; x <= 30; x += 8) box(0.45, FENCE_H, 0.45, x, 0, z, cell);
  for (const y of [0.3, FENCE_H]) box(52, 0.2, 0.2, 4, y, z, cell);
  for (let x = -22; x <= 30; x += MESH) mesh.push(x, 0.3, z, x, FENCE_H, z);
  for (let y = MESH; y < FENCE_H; y += MESH) mesh.push(-22, y, z, 30, y, z);
}
wires(mesh, cell).material = meshInk;

// Robot arms well behind the back fence, facing the conveyor, so they stand clear of it. Same build, three sizes, each with a tool for its job;
// joints are pivots so they can move.
function arm({ x, z, size, stand, tool }) {
  const base = new THREE.Group();
  base.position.set(x, stand, z);
  base.scale.setScalar(size);
  if (stand) box(4, stand / size, 4, 0, -stand / size, 0, base);
  drum(2.6, 1.2, 0, 0, 0, base, 20);
  const turret = new THREE.Group();
  turret.position.y = 1.2;
  base.add(turret);
  drum(1.7, 2.4, 0, 0, 0, turret, 16);
  const shoulder = new THREE.Group();
  shoulder.position.y = 3;
  turret.add(shoulder);
  // A joint pin lying across the arm
  const pin = (r, parent) => {
    const axle = new THREE.Group();
    axle.rotation.x = Math.PI / 2;
    drum(r, 2.4, 0, -1.2, 0, axle, 12);
    parent.add(axle);
  };
  pin(1.1, shoulder);
  box(1.4, 9, 1.4, 0, 0, 0, shoulder);
  const elbow = new THREE.Group();
  elbow.position.y = 9;
  shoulder.add(elbow);
  pin(0.9, elbow);
  box(1.1, 7.5, 1.1, 0, 0, 0, elbow);
  const wrist = new THREE.Group();
  wrist.position.y = 7.5;
  elbow.add(wrist);
  drum(0.6, 1.4, 0, 0, 0, wrist, 12);
  tool(wrist);
  robots.add(base);
  return { turret, shoulder, elbow, wrist };
}
// Palletising: a wide suction plate. Assembly: a two-finger gripper. Welding: a long, thin torch.
const suction = (w) => {
  box(1, 1, 1, 0, 1.4, 0, w);
  box(4.4, 0.5, 3, 0, 2.4, 0, w);
};
const gripper = (w) => {
  box(2.4, 0.5, 0.8, 0, 1.4, 0, w);
  box(0.4, 1.6, 0.8, -1, 1.9, 0, w);
  box(0.4, 1.6, 0.8, 1, 1.9, 0, w);
};
const torch = (w) => {
  drum(0.35, 2.8, 0, 1.4, 0, w, 8);
  drum(0.14, 1.4, 0, 4.2, 0, w, 6);
};
const robots = new THREE.Group();
const arms = [
  arm({ x: -16, z: -20, size: 1.25, stand: 0, tool: suction }),
  arm({ x: 0, z: -20, size: 0.9, stand: 3, tool: torch }),
  arm({ x: 14, z: -20, size: 0.6, stand: 2.5, tool: gripper }),
];

// Layers, bottom to top, with how far each lifts when the drawing is fully apart. Label dots: Factory just outside the
// middle of the roof's right edge, Robot cell beside the right arm, Work cell between the fences past the belt's end.
const layers = [
  { group: floor, lift: 0 },
  { group: cell, lift: 0, part: 'cell', anchor: new THREE.Vector3(29, 5, 6) },
  { group: robots, lift: 4, part: 'robot', anchor: new THREE.Vector3(22, 7, -20) },
  { group: hall, lift: 44, back: 16, part: 'factory', anchor: new THREE.Vector3(44, 16, 0) },
];
for (const layer of layers) {
  layer.base = layer.group.position.y;
  model.add(layer.group);
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
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.add(model);
const FOV = 18;
const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 2000);

function paint() {
  const css = getComputedStyle(document.documentElement);
  ink.color.set(css.getPropertyValue('--line').trim());
  fineInk.color.copy(ink.color);
  meshInk.color.copy(ink.color);
  paper.color.set(css.getPropertyValue('--paper').trim());
}

// 3. Labels — one per part, in English only: a dot on the part, a leader line, the name
const labels = [...document.querySelectorAll('.labels .label')].map((el) => {
  const text = document.createElement('b');
  const lead = document.createElement('i');
  el.append(lead, text);
  text.textContent = el.dataset.name;
  return { el, text, lead, layer: layers.find((l) => l.part === el.dataset.part) };
});
// 4. One state, moved by the animations at the end of this file
const clamp = (v) => Math.min(1, Math.max(0, v));
const smooth = (v) => v * v * (3 - 2 * v);
const span = (v, a, b) => smooth(clamp((v - a) / (b - a)));
const state = { apart: 0, named: 0, drawing: still.matches ? 1 : 0 };

// The view angle is fixed. The camera only moves back as the drawing opens, so the taller stack still fits, and the
// picture is shifted so its middle stays in the middle of the room between the title and the buttons.
const YAW = -0.42;
const PITCH = 0.55;
let W = 1;
let H = 1;
let roomH = 1;
let roomMid = 0;
function fit() {
  W = innerWidth;
  H = innerHeight;
  const box = room.getBoundingClientRect();
  roomH = box.height;
  roomMid = box.top + scrollY + box.height / 2;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
}
function aim(apart) {
  // pixels per model unit: closed fills the room, open fits the whole stack; both limited by the width on phones
  const closed = Math.min(roomH / 84, W / 124);
  const open = Math.min(roomH / 126, W / 142);
  const scale = closed + (open - closed) * apart;
  const dist = H / (2 * scale * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
  const y = 9 + apart * 21;
  camera.position.set(Math.sin(YAW) * Math.cos(PITCH) * dist, y + Math.sin(PITCH) * dist, Math.cos(YAW) * Math.cos(PITCH) * dist);
  camera.lookAt(0, y, 0);
  camera.setViewOffset(W, H, 0, H / 2 - (roomMid - scrollY), W, H);
  camera.updateMatrixWorld();
}

const p3 = new THREE.Vector3();
function draw() {
  const { apart, named, drawing } = state;
  for (const layer of layers) {
    layer.group.position.y = layer.base + layer.lift * apart;
    layer.group.position.z = -(layer.back ?? 0) * apart; // the roof also slides back, clear of the robot arms
  }
  // Closed, each arm bends forward with its tool pointing down; open, it straightens up a little
  for (const { turret, shoulder, elbow, wrist } of arms) {
    turret.rotation.y = 2 - apart * 0.5;
    shoulder.rotation.z = 0.3 - apart * 0.15;
    elbow.rotation.z = 2.1 - apart * 0.8;
    wrist.rotation.z = 0.74 - apart * 0.1;
  }
  ink.opacity = 0.8 * drawing;
  fineInk.opacity = 0.2 * drawing;
  meshInk.opacity = 0.35 * drawing;
  paper.opacity = drawing;
  aim(apart);
  renderer.render(scene, camera);

  // Labels: a leader line from the part out to a column to the right of the drawing
  const column = camera.aspect < 1 ? W - 8 : W / 2 + Math.min(W / 2 - 24, roomH * 1.05);
  for (const label of labels) {
    p3.copy(label.layer.anchor);
    p3.y += label.layer.lift * apart;
    p3.z -= (label.layer.back ?? 0) * apart;
    p3.project(camera);
    label.x = (p3.x * 0.5 + 0.5) * W;
    label.y = (-p3.y * 0.5 + 0.5) * H;
  }
  // Keep the labels at least a line apart, top to bottom
  [...labels].sort((a, b) => a.y - b.y).reduce((above, label) => {
    label.y = Math.max(label.y, above + 22);
    return label.y;
  }, -Infinity);
  labels.forEach((label, i) => {
    const { x, y } = label;
    label.lead.style.width = `${Math.max(12, column - label.text.offsetWidth - 13 - x)}px`;
    label.el.style.transform = `translate(${x - 2.5}px, ${y - 9}px)`;
    label.el.style.opacity = String(span(named, i * 0.12, i * 0.12 + 0.5));
  });
}

paint();
addEventListener('resize', () => {
  fit();
  draw();
});
addEventListener('scroll', draw, { passive: true }); // only very short windows scroll at all

// 5. On load the drawing comes in. Clicking its floor grid opens or closes it.
fit();
draw();
if (!still.matches) {
  animate(state, { drawing: 1, duration: 900, ease: 'outCubic', onUpdate: draw });
}
let opened = false;
function toggle() {
  opened = !opened;
  room.setAttribute('aria-expanded', String(opened));
  if (still.matches) {
    state.apart = state.named = opened ? 1 : 0;
    draw();
    return;
  }
  if (opened) {
    animate(state, { apart: 1, duration: 1300, ease: 'inOutCubic', onUpdate: draw });
    animate(state, { named: 1, duration: 500, delay: 900, ease: 'outQuad', onUpdate: draw });
  } else {
    animate(state, { named: 0, duration: 200, ease: 'inQuad', onUpdate: draw });
    animate(state, { apart: 0, duration: 1100, ease: 'inOutCubic', onUpdate: draw });
  }
}
room.addEventListener('click', toggle); // keyboard only: the button takes no pointer events

// Only the floor grid responds to the pointer: the pointer's ray is tested against the floor's rectangle
const ray = new THREE.Raycaster();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();
function overFloor(e) {
  ray.setFromCamera(new THREE.Vector2((e.clientX / W) * 2 - 1, -(e.clientY / H) * 2 + 1), camera);
  return Boolean(ray.ray.intersectPlane(floorPlane, hit)) && Math.abs(hit.x) <= FLOOR_W / 2 && Math.abs(hit.z) <= FLOOR_D / 2;
}
const onControl = (e) => e.target.closest?.('button, a');
addEventListener('pointermove', (e) => {
  document.documentElement.style.cursor = !onControl(e) && overFloor(e) ? 'pointer' : '';
});
addEventListener('click', (e) => {
  if (!onControl(e) && overFloor(e)) toggle();
});
