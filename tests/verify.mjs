import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as navigation from '../docs/navigation.js';
import * as THREE from '../docs/vendor/three.module.js';
import { createCityLife } from '../docs/city-life.js';

for (const compact of [false, true]) {
  const scene = new THREE.Scene();
  const life = createCityLife(scene, compact);
  const crowd = scene.getObjectByName('walking-pedestrians');
  const taxi = scene.getObjectByName('air-taxi');
  assert.equal(crowd.count, (compact ? 18 : 34) * 6);
  const startPose = Array.from(crowd.instanceMatrix.array);
  const startZ = taxi.position.z;
  life.update(.5);
  assert.notDeepEqual(Array.from(crowd.instanceMatrix.array), startPose, 'People walk and articulate');
  assert.notEqual(taxi.position.z, startZ, 'Traffic moves');
  const stoppedPose = Array.from(crowd.instanceMatrix.array);
  life.update(0);
  assert.deepEqual(Array.from(crowd.instanceMatrix.array), stoppedPose, 'Paused simulation does not jump');
  for (let i = 0; i < 400; i++) life.update(.05);
  assert.ok(Array.from(crowd.instanceMatrix.array).every(Number.isFinite));
  for (const vehicle of scene.children.filter(child => child.name === 'air-taxi')) {
    assert.ok(vehicle.position.y > 8, 'Air traffic stays above the walking camera');
  }
}

assert.deepEqual(navigation.streetPosition(100, -999), { x: 6, z: -148 });
assert.deepEqual(navigation.streetPosition(-100, 999), { x: -6, z: 35 });
assert.deepEqual(navigation.streetPosition(NaN, Infinity), { x: 0, z: 35 });
for (const destination of navigation.destinations) {
  const point = navigation.destinationPosition(destination);
  assert.ok(point.z > destination.z && Math.abs(point.x) < 6);
}
let previous = 0;
for (let i = 0; i <= 100; i++) {
  const value = navigation.easeTravel(i / 100);
  assert.ok(value >= previous && value <= 1);
  previous = value;
}
assert.equal(previous, 1);

// Retargeting must retain momentum, then brake smoothly without a position jump.
const moving = { x: 0, z: 35 }, speed = { x: 0, z: 0 };
for (let i = 0; i < 60; i++) navigation.advanceTravel(moving, speed, { x: 0, z: -100 }, 1 / 60);
const before = { ...moving }, beforeSpeed = speed.z;
navigation.advanceTravel(moving, speed, { x: 3, z: 25 }, 1 / 60);
assert.ok(Math.abs(speed.z - beforeSpeed) < 3, 'Retargeting preserves velocity');
assert.ok(Math.hypot(moving.x - before.x, moving.z - before.z) < .5, 'No teleport on retarget');
for (let i = 0; i < 900; i++) navigation.advanceTravel(moving, speed, { x: 3, z: 25 }, 1 / 60);
assert.ok(Math.hypot(moving.x - 3, moving.z - 25) < .02);
const frameRates = [30, 60, 144].map(fps => {
  const point = { x: 0, z: 35 }, velocity = { x: 0, z: 0 };
  for (let i = 0; i < fps * 3; i++) navigation.advanceTravel(point, velocity, { x: 2, z: 20 }, 1 / fps);
  return point;
});
assert.ok(Math.abs(frameRates[0].z - frameRates[2].z) < .001, 'Frame-rate independent damping');

const camera = new THREE.PerspectiveCamera(62, 16 / 9, .1, 550);
camera.position.set(0, 4.2, 35);
camera.lookAt(0, 7, -7);
camera.updateMatrixWorld();
const ray = new THREE.Raycaster();
ray.setFromCamera(new THREE.Vector2(0, -.45), camera);
const point = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
assert.ok(point.z < 35 && point.z > -148 && Math.abs(point.x) < 8);

// Minimal DOM fixture: tests interaction wiring without pretending to render pixels.
class Element {
  constructor(tag = 'DIV') {
    this.tagName = tag; this.children = []; this.events = {}; this.dataset = {};
    this.style = {}; this.attributes = {}; this.textContent = ''; this.hidden = false;
    this.isConnected = true; this.open = false;
    const classes = new Set();
    this.classList = { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value) };
  }
  addEventListener(type, fn) { (this.events[type] ||= []).push(fn); }
  fire(type, values = {}) { for (const fn of this.events[type] || []) fn({ target: this, preventDefault() {}, ...values }); }
  setAttribute(name, value) { this.attributes[name] = value; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  focus() { this.focused = true; }
  scrollIntoView() { this.scrolled = true; }
  getBoundingClientRect() { return { left: 0, top: 0, right: 1200, bottom: 800, width: 1200, height: 800 }; }
  showModal() { this.open = true; }
  close() { this.open = false; this.fire('close'); }
  matches(selector) { return selector.includes(this.tagName.toLowerCase()) || (this.isEyebrow && selector.includes('.eyebrow')); }
  cloneNode() { const node = new Element(this.tagName); node.textContent = this.textContent; return node; }
}
const nodes = new Map();
const get = id => { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); };
const controls = navigation.destinations.map(destination => {
  const control = new Element('A'); control.dataset.destination = destination.id; return control;
});
for (const destination of navigation.destinations) {
  const section = get(destination.id);
  const eyebrow = new Element('P'); eyebrow.isEyebrow = true; eyebrow.textContent = destination.number;
  const heading = new Element('H2'); heading.textContent = destination.name;
  const paragraph = new Element('P'); paragraph.textContent = 'Accessible destination content.';
  section.children = [eyebrow, heading, paragraph];
  section.querySelector = selector => selector === 'h2' ? heading : eyebrow;
}
const body = new Element();
let queuedFrame = null;
let now = 0;
let hitCount = 0;
const sceneCamera = { position: { set(x, y, z) { Object.assign(this, { x, y, z }); } }, lookAt() {}, updateMatrixWorld() {} };
const fakeCity = {
  camera: sceneCamera, resize() {}, marker() {}, render() {},
  project() { return { x: 600, y: 400, visible: true }; },
  streetHit() { hitCount++; return { x: 1, z: -30 }; },
};
const context = vm.createContext({
  console,
  document: { body, hidden: false, querySelector: selector => get(selector.slice(1)), querySelectorAll: () => controls, getElementById: get, createElement: tag => new Element(tag.toUpperCase()), addEventListener() {} },
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  requestAnimationFrame: callback => { queuedFrame = callback; return 1; },
  cancelAnimationFrame: () => { queuedFrame = null; },
  addEventListener() {},
  IntersectionObserver: class { observe() {} },
});
const navModule = new vm.SyntheticModule(Object.keys(navigation), function () {
  for (const [key, value] of Object.entries(navigation)) this.setExport(key, value);
}, { context });
const cityModule = new vm.SyntheticModule(['createCity'], function () {
  this.setExport('createCity', () => fakeCity);
}, { context });
await cityModule.link(() => {});
await cityModule.evaluate();
const source = await readFile(new URL('../docs/app.js', import.meta.url), 'utf8');
const appModule = new vm.SourceTextModule(source, { context, importModuleDynamically: () => cityModule });
await appModule.link(specifier => {
  assert.equal(specifier.split('?')[0], './navigation.js');
  return navModule;
});
await appModule.evaluate();
function frames(count = 330) {
  for (let i = 0; i < count && queuedFrame; i++) {
    const callback = queuedFrame; queuedFrame = null;
    now += 50; callback(now);
  }
}
frames(1);
assert.equal(sceneCamera.position.z, 35);
controls[0].fire('click');
frames();
assert.equal(get('destination-dialog').open, true);
assert.equal(get('dialog-title').textContent, 'The work');
assert.equal(sceneCamera.position.z, navigation.destinationPosition(navigation.destinations[0]).z);
get('continue-exploring').fire('click');
assert.equal(get('destination-dialog').open, false);
assert.equal(controls[0].focused, true);

controls[1].fire('click'); frames(2);
controls[2].fire('click'); frames();
assert.equal(get('dialog-title').textContent, 'The connection');
get('close-dialog').fire('click');
get('motion-toggle').fire('click');
get('reset-view').fire('click'); frames(1);
assert.equal(sceneCamera.position.z, 35);
assert.equal(get('motion-toggle').attributes['aria-pressed'], 'true');
assert.equal(get('intro').classList.contains('dismissed'), false);

get('city').fire('pointerdown', { clientX: 10, clientY: 10 });
get('city').fire('pointerup', { clientX: 10, clientY: 100, button: 0 });
assert.equal(hitCount, 0, 'A touch scroll must not trigger movement');
get('city').fire('pointerdown', { clientX: 10, clientY: 10 });
get('city').fire('pointerup', { clientX: 10, clientY: 10, button: 0 }); frames(1);
assert.equal(hitCount, 1);
assert.equal(sceneCamera.position.z, -30);
get('city').fire('keydown', { key: 'ArrowUp' }); frames(1);
assert.equal(sceneCamera.position.z, -42);
get('city').fire('webglcontextlost');
assert.equal(body.classList.contains('city-unavailable'), true);
controls[0].fire('click');
assert.equal(get('destination-dialog').open, false);
assert.equal(queuedFrame, null);

const html = await readFile(new URL('../docs/index.html', import.meta.url), 'utf8');
const jsonLD = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
assert.equal(JSON.parse(jsonLD)['@graph'][0].url, 'https://lioda9130.github.io/');
assert.equal((html.match(/<h1\b/g) || []).length, 1);
assert.ok(!html.includes('noindex'));
for (const destination of navigation.destinations) assert.ok(html.includes(`id="${destination.id}"`));
console.log('PASS: navigation bounds, camera ray, app initialization, all destinations, route interruption, dialog focus, reduced motion, reset, touch scrolling, click movement, keyboard movement, WebGL fallback, and SEO metadata.');
