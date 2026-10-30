// Background — a line drawing of a small factory: the hall, a work cell, a robot arm and a conveyor on one floor.
// It stands large between the title and the buttons. Pointing at it (or, on touch screens, a loop) lifts its parts off
// one another with a name label on each, and they come back together. The view angle never changes.
// three.js draws the model, anime.js times the opening. Both load from a CDN; no build step.
import * as THREE from 'three';
import { animate, createTimeline } from 'https://cdn.jsdelivr.net/npm/animejs@4.0.2/lib/anime.esm.js';

const canvas = document.getElementById('bg');
const room = document.querySelector('.room');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const dark = matchMedia('(prefers-color-scheme: dark)');

// 1. Drawing kit — every part is outlines only
const ink = new THREE.LineBasicMaterial({ transparent: true });
function outline(geometry, x = 0, y = 0, z = 0, parent) {
  const lines = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 20), ink);
  lines.position.set(x, y, z);
  parent?.add(lines);
  return lines;
}
const box = (w, h, d, x, y, z, parent) => outline(new THREE.BoxGeometry(w, h, d), x, y + h / 2, z, parent);
const drum = (r, h, x, y, z, parent, segments = 16) => outline(new THREE.CylinderGeometry(r, r, h, segments), x, y + h / 2, z, parent);

const model = new THREE.Group();

// Floor slab with the hall's column grid marked on it
const floor = new THREE.Group();
box(64, 1, 40, 0, -1, 0, floor);
const marks = [];
for (let x = -30; x <= 30; x += 10) marks.push(x, 0.02, -20, x, 0.02, 20);
for (let z = -20; z <= 20; z += 10) marks.push(-32, 0.02, z, 32, 0.02, z);
floor.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(marks, 3)), ink));

// The hall: columns and a sawtooth roof over the whole floor
const hall = new THREE.Group();
for (let x = -30; x <= 30; x += 10) for (const z of [-19.5, 19.5]) box(0.8, 16, 0.8, x, 0, z, hall);
const tooth = new THREE.Shape();
tooth.moveTo(-32, 0);
for (let i = 0; i < 4; i++) {
  tooth.lineTo(-32 + i * 16 + 13, 6);
  tooth.lineTo(-32 + i * 16 + 16, 0);
}
tooth.lineTo(-32, 0);
outline(new THREE.ExtrudeGeometry(tooth, { depth: 40, bevelEnabled: false }), 0, 16, -20, hall);
box(64, 0.6, 40, 0, 15.4, 0, hall);

// Conveyor along the front: frame, legs, rollers and a few parcels
const conveyor = new THREE.Group();
box(46, 0.8, 4, 4, 4, 12, conveyor);
for (let x = -16; x <= 24; x += 8) for (const z of [10.4, 13.6]) box(0.5, 4, 0.5, x, 0, z, conveyor);
for (let x = -18; x <= 26; x += 2.2) {
  const roller = drum(0.35, 3.6, x, 0, 0, conveyor, 8);
  roller.rotation.x = Math.PI / 2;
  roller.position.set(x, 5.1, 12);
}
for (const x of [-12, 0, 13]) box(3, 2.2, 2.6, x, 5.5, 12, conveyor);

// Work cell: a fenced square with corner posts, mesh rails and a gate
const cell = new THREE.Group();
const CX = -12;
const CZ = -5;
for (const [dx, dz] of [[-9, -8], [9, -8], [-9, 8], [9, 8]]) box(0.5, 9, 0.5, CX + dx, 0, CZ + dz, cell);
for (const y of [0.5, 4.5, 9]) {
  box(18, 0.2, 0.2, CX, y, CZ - 8, cell);
  box(0.2, 0.2, 16, CX - 9, y, CZ, cell);
  box(0.2, 0.2, 16, CX + 9, y, CZ, cell);
  box(10, 0.2, 0.2, CX - 4, y, CZ + 8, cell);
}
for (let x = -8; x <= 8; x += 2) box(0.05, 9, 0.05, CX + x, 0, CZ - 8, cell);

// Robot arm in the cell — base, turret, upper arm, forearm, wrist, gripper; joints are pivots so it can move
const robot = new THREE.Group();
robot.position.set(CX + 1, 0, CZ);
drum(2.6, 1.2, 0, 0, 0, robot, 20);
const turret = new THREE.Group();
turret.position.y = 1.2;
robot.add(turret);
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
box(2.4, 0.5, 0.8, 0, 1.4, 0, wrist);
box(0.4, 1.6, 0.8, -1, 1.9, 0, wrist);
box(0.4, 1.6, 0.8, 1, 1.9, 0, wrist);

// Layers, bottom to top, with how far each lifts when the drawing is fully apart
const layers = [
  { group: floor, lift: 0 },
  { group: conveyor, lift: 7, part: 'conveyor', anchor: new THREE.Vector3(27, 5, 12) },
  { group: robot, lift: 13, part: 'robot', anchor: new THREE.Vector3(3, 18, -5) },
  { group: cell, lift: 20, part: 'cell', anchor: new THREE.Vector3(-3, 9, -13) },
  { group: hall, lift: 30, part: 'factory', anchor: new THREE.Vector3(32, 22, -20) },
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
  ink.color.set(getComputedStyle(document.documentElement).getPropertyValue('--line').trim() || '#333');
}

// 3. Labels — one per part, a dot on the part and a leader line out to a column on the right
const labels = [...document.querySelectorAll('.labels .label')].map((el) => {
  const text = document.createElement('b');
  const lead = document.createElement('i');
  el.append(lead, text);
  return { el, text, lead, layer: layers.find((l) => l.part === el.dataset.part) };
});
function relabel() {
  const lang = document.documentElement.lang === 'en' ? 'en' : 'ko';
  for (const label of labels) label.text.textContent = label.el.dataset[lang];
}
new MutationObserver(relabel).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
relabel();

// 4. One state, moved by the animations at the end of this file
const clamp = (v) => Math.min(1, Math.max(0, v));
const smooth = (v) => v * v * (3 - 2 * v);
const span = (v, a, b) => smooth(clamp((v - a) / (b - a)));
const state = still.matches ? { apart: 1, named: 1, drawing: 1 } : { apart: 0, named: 0, drawing: 0 };

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
  const closed = Math.min(roomH / 50, W / 84);
  const open = Math.min(roomH / 74, W / 104);
  const scale = closed + (open - closed) * apart;
  const dist = H / (2 * scale * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
  const y = 9 + apart * 15;
  camera.position.set(Math.sin(YAW) * Math.cos(PITCH) * dist, y + Math.sin(PITCH) * dist, Math.cos(YAW) * Math.cos(PITCH) * dist);
  camera.lookAt(0, y, 0);
  // on phones the open drawing sits a little left, leaving room for the labels on the right
  camera.setViewOffset(W, H, camera.aspect < 1 ? W * 0.07 * apart : 0, H / 2 - (roomMid - scrollY), W, H);
  camera.updateMatrixWorld();
}

const p3 = new THREE.Vector3();
function draw() {
  const { apart, named, drawing } = state;
  for (const layer of layers) layer.group.position.y = layer.base + layer.lift * apart;
  turret.rotation.y = -0.6 + apart * 1.4;
  shoulder.rotation.z = 0.35 - apart * 0.7;
  elbow.rotation.z = 1.1 + apart * 0.5;
  wrist.rotation.z = 0.4 - apart * 0.6;
  ink.opacity = (dark.matches ? 0.7 : 0.62) * drawing;
  aim(apart);
  renderer.render(scene, camera);

  // Labels: anchor projected to the screen, text in a column to the right of the drawing
  const column = camera.aspect < 1 ? W - 8 : W / 2 + Math.min(W / 2 - 24, roomH * 1.05);
  for (const label of labels) {
    p3.copy(label.layer.anchor);
    p3.y += label.layer.lift * apart;
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
    const reach = Math.max(12, column - label.text.offsetWidth - 13 - x);
    label.lead.style.width = `${reach}px`;
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
dark.addEventListener('change', () => {
  paint();
  draw();
});

// 5. On load the drawing comes in. With a mouse, pointing at it opens it with its labels, and moving away closes it.
// Touch screens have nothing to point with, so there it opens and closes by itself on a loop.
fit();
draw();
if (!still.matches) {
  animate(state, { drawing: 1, duration: 900, ease: 'outCubic', onUpdate: draw });
  if (matchMedia('(hover: hover)').matches) {
    room.addEventListener('pointerenter', () => {
      animate(state, { apart: 1, duration: 1200, ease: 'inOutCubic', onUpdate: draw });
      animate(state, { named: 1, duration: 500, delay: 800, ease: 'outQuad', onUpdate: draw });
    });
    room.addEventListener('pointerleave', () => {
      animate(state, { named: 0, duration: 200, ease: 'inQuad', onUpdate: draw });
      animate(state, { apart: 0, duration: 1000, ease: 'inOutCubic', onUpdate: draw });
    });
  } else {
    createTimeline({ loop: true, loopDelay: 1400 })
      .add(state, { apart: 1, duration: 2400, ease: 'inOutCubic' }, 1600)
      .add(state, { named: 1, duration: 700, ease: 'outQuad' }, 3400)
      .add(state, { named: 0, duration: 400, ease: 'inQuad' }, 7200)
      .add(state, { apart: 0, duration: 2200, ease: 'inOutCubic' }, 7400);
    renderer.setAnimationLoop(draw);
  }
}
