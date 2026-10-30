// Background — a line drawing of a small factory: the hall, three robot arms and a work cell (a fenced conveyor) on one floor.
// It stands between the title and the buttons. Clicking it lifts its parts off one another with a name label on each,
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

// Floor slab with a layout grid marked on it: a fine line every 2 units, a heavier one on the hall's column grid
const floor = new THREE.Group();
box(64, 1, 40, 0, -1, 0, floor);
const marks = (step, material) => {
  const points = [];
  for (let x = -30; x <= 30; x += step) points.push(x, 0.02, -20, x, 0.02, 20);
  for (let z = -20; z <= 20; z += step) points.push(-32, 0.02, z, 32, 0.02, z);
  floor.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(points, 3)), material));
};
marks(2, fineInk);
marks(10, ink);

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

// Work cell: a conveyor (frame, legs, rollers, a few parcels) running between two fences
const cell = new THREE.Group();
box(46, 0.8, 4, 4, 4, 12, cell);
for (let x = -16; x <= 24; x += 8) for (const z of [10.4, 13.6]) box(0.5, 4, 0.5, x, 0, z, cell);
for (let x = -18; x <= 26; x += 2.2) {
  const roller = drum(0.35, 3.6, x, 0, 0, cell, 8);
  roller.rotation.x = Math.PI / 2;
  roller.position.set(x, 5.1, 12);
}
for (const x of [-12, 0, 13]) box(3, 2.2, 2.6, x, 5.5, 12, cell);

// The fences, either side of the belt; both ends stay open for the conveyor
const FENCE_H = 6;
for (const z of [7.5, 16.5]) {
  for (const x of [-22, 30]) box(0.5, FENCE_H, 0.5, x, 0, z, cell);
  for (const y of [0.5, FENCE_H / 2, FENCE_H]) box(52, 0.2, 0.2, 4, y, z, cell);
  for (let x = -18; x < 30; x += 4) box(0.05, FENCE_H, 0.05, x, 0, z, cell);
}

// Robot arms outside the back fence, reaching over it to the conveyor. Same build, three sizes, each with a tool for its job;
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
  arm({ x: -14, z: 2, size: 1.25, stand: 0, tool: suction }),
  arm({ x: 1, z: 4, size: 0.9, stand: 3, tool: torch }),
  arm({ x: 13, z: 5.5, size: 0.6, stand: 2.5, tool: gripper }),
];

// Layers, bottom to top, with how far each lifts when the drawing is fully apart
const layers = [
  { group: floor, lift: 0 },
  { group: cell, lift: 9, part: 'cell', anchor: new THREE.Vector3(30, 6, 7.5) },
  { group: robots, lift: 20, part: 'robot', anchor: new THREE.Vector3(-10, 17, 2) },
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
  const css = getComputedStyle(document.documentElement);
  ink.color.set(css.getPropertyValue('--line').trim());
  fineInk.color.copy(ink.color);
  paper.color.set(css.getPropertyValue('--paper').trim());
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
const state = { apart: 0, named: 0, drawing: still.matches ? 1 : 0, peek: 0 }; // peek: a small lift inviting the first click

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
  const closed = Math.min(roomH / 62, W / 100);
  const open = Math.min(roomH / 92, W / 124);
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
  const { apart, named, drawing, peek } = state;
  const lifted = apart + peek;
  for (const layer of layers) layer.group.position.y = layer.base + layer.lift * lifted;
  // Closed, each arm bends over the conveyor with its tool pointing down; open, it straightens up a little
  for (const { turret, shoulder, elbow, wrist } of arms) {
    turret.rotation.y = 2 - apart * 0.5;
    shoulder.rotation.z = 0.3 - apart * 0.15;
    elbow.rotation.z = 2.1 - apart * 0.8;
    wrist.rotation.z = 0.74 - apart * 0.1;
  }
  ink.opacity = 0.8 * drawing;
  fineInk.opacity = 0.2 * drawing;
  paper.opacity = drawing;
  aim(lifted);
  renderer.render(scene, camera);

  // Labels: anchor projected to the screen, text in a column to the right of the drawing
  const column = camera.aspect < 1 ? W - 8 : W / 2 + Math.min(W / 2 - 24, roomH * 1.05);
  for (const label of labels) {
    p3.copy(label.layer.anchor);
    p3.y += label.layer.lift * lifted;
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

// 5. On load the drawing comes in, and lifts slightly now and then until the first click. Clicking opens or closes it.
fit();
draw();
let peeking = null;
if (!still.matches) {
  animate(state, { drawing: 1, duration: 900, ease: 'outCubic', onUpdate: draw });
  peeking = animate(state, { peek: 0.07, duration: 700, delay: 1600, loopDelay: 2200, ease: 'inOutSine', loop: true, alternate: true, onUpdate: draw });
}
let opened = false;
room.addEventListener('click', () => {
  opened = !opened;
  room.setAttribute('aria-expanded', String(opened));
  if (still.matches) {
    state.apart = state.named = opened ? 1 : 0;
    draw();
    return;
  }
  if (peeking) {
    peeking.pause();
    peeking = null;
    animate(state, { peek: 0, duration: 300, ease: 'outQuad', onUpdate: draw });
  }
  if (opened) {
    animate(state, { apart: 1, duration: 1300, ease: 'inOutCubic', onUpdate: draw });
    animate(state, { named: 1, duration: 500, delay: 900, ease: 'outQuad', onUpdate: draw });
  } else {
    animate(state, { named: 0, duration: 200, ease: 'inQuad', onUpdate: draw });
    animate(state, { apart: 0, duration: 1100, ease: 'inOutCubic', onUpdate: draw });
  }
});
