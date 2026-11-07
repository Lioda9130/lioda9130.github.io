import { destinations, homePosition, streetPosition, destinationPosition, advanceTravel } from './navigation.js?v=20261108';

const canvas = document.querySelector('#city');
const status = document.querySelector('#travel-status');
const intro = document.querySelector('#intro');
const dialog = document.querySelector('#destination-dialog');
const motionButton = document.querySelector('#motion-toggle');
const resetButton = document.querySelector('#reset-view');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let animated = !motionPreference.matches;
let motionOverride = false;
try {
  const saved = localStorage.getItem('neon-district-motion');
  if (saved === 'on' || saved === 'off') { animated = saved === 'on'; motionOverride = true; }
} catch { /* Storage can be unavailable; system preference remains the default. */ }
let city;
let ready = false;
let travel = null;
let dirty = true;
let inView = true;
let frame = null;
let lastTime = 0;
let elapsed = 0;
let entered = false;
let returnFocus = null;
const position = { ...homePosition };
const velocity = { x: 0, z: 0 };
const pointer = { x: 0, y: 0 };
const view = { x: 0, y: 0 };
const markers = [];

function syncMotion() {
  motionButton.textContent = `Motion: ${animated ? 'on' : 'off'}`;
  motionButton.setAttribute('aria-pressed', String(!animated));
  if (ready && !travel && !dialog.open) status.textContent = animated
    ? 'YOUR CITY. YOUR DIRECTION.' : 'MOTION OFF — CLICK TO CHANGE LOCATION';
}
syncMotion();

function openDestination(destination) {
  const section = document.getElementById(destination.id);
  document.querySelector('#dialog-number').textContent = section.querySelector('.eyebrow').textContent;
  document.querySelector('#dialog-title').textContent = section.querySelector('h2').textContent;
  const copy = document.querySelector('#dialog-copy');
  copy.replaceChildren(...Array.from(section.children)
    .filter(element => !element.matches('h2, .eyebrow'))
    .map(element => element.cloneNode(true)));
  if (!dialog.open) dialog.showModal();
  status.textContent = `${destination.number} / ${destination.name.toUpperCase()} — ARRIVED`;
}

function enter() {
  entered = true;
  intro.classList.add('dismissed');
}

function moveTo(target, onArrival = null) {
  if (!ready) return;
  enter();
  const end = streetPosition(target.x, target.z);
  // A new click always replaces the previous route and pending destination.
  travel = {
    end,
    onArrival,
  };
  city.marker(end.x, end.z, true);
  status.textContent = 'MOVING THROUGH THE DISTRICT';
  requestFrame();
}

function goToDestination(id, trigger) {
  const destination = destinations.find(item => item.id === id);
  if (!destination) return;
  returnFocus = trigger;
  moveTo(destinationPosition(destination), () => openDestination(destination));
}

document.querySelectorAll('[data-destination]').forEach(control => {
  control.addEventListener('click', event => {
    if (!ready) {
      // Buttons on the map also have a useful non-WebGL path.
      if (control.tagName === 'BUTTON') document.getElementById(control.dataset.destination).scrollIntoView();
      return;
    }
    event.preventDefault();
    goToDestination(control.dataset.destination, control);
  });
});

function closeDialog() { dialog.close(); }
document.querySelector('#close-dialog').addEventListener('click', closeDialog);
document.querySelector('#continue-exploring').addEventListener('click', closeDialog);
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog();
});
dialog.addEventListener('close', () => {
  status.textContent = 'CHOOSE A DESTINATION. MAKE YOUR OWN WAY.';
  (returnFocus?.isConnected ? returnFocus : canvas).focus({ preventScroll: true });
  returnFocus = null;
  dirty = true; requestFrame();
});

motionButton.addEventListener('click', () => {
  animated = !animated;
  motionOverride = true;
  try { localStorage.setItem('neon-district-motion', animated ? 'on' : 'off'); } catch { /* Optional persistence. */ }
  syncMotion(); dirty = true; requestFrame();
});
motionPreference.addEventListener('change', event => {
  if (motionOverride) return;
  animated = !event.matches;
  syncMotion(); dirty = true; requestFrame();
});

function reset() {
  pointer.x = pointer.y = 0;
  moveTo(homePosition, () => {
    entered = false;
    intro.classList.remove('dismissed');
    status.textContent = 'YOUR CITY. YOUR DIRECTION.';
  });
}
resetButton.addEventListener('click', reset);
canvas.addEventListener('pointermove', event => {
  if (!ready || event.pointerType === 'touch') return;
  const bounds = canvas.getBoundingClientRect();
  pointer.x = (event.clientX - bounds.left) / bounds.width * 2 - 1;
  pointer.y = (event.clientY - bounds.top) / bounds.height * 2 - 1;
  dirty = true; requestFrame();
});
canvas.addEventListener('pointerleave', () => { pointer.x = pointer.y = 0; dirty = true; requestFrame(); });
let pointerDown = null;
canvas.addEventListener('pointerdown', event => { pointerDown = { x: event.clientX, y: event.clientY }; });
canvas.addEventListener('pointercancel', () => { pointerDown = null; });
canvas.addEventListener('pointerup', event => {
  if (!ready || !pointerDown || event.button !== 0) return;
  const dragDistance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
  pointerDown = null;
  if (dragDistance > 12) return; // A touch scroll is not a travel command.
  const hit = city.streetHit(event.clientX, event.clientY);
  if (hit) moveTo(hit);
  else status.textContent = 'CLICK THE STREET OR CHOOSE A NUMBERED DESTINATION';
});
canvas.addEventListener('keydown', event => {
  if (!ready) return;
  const directions = { ArrowUp: [0, -12], ArrowDown: [0, 12], ArrowLeft: [-3, 0], ArrowRight: [3, 0] };
  if (directions[event.key]) {
    event.preventDefault();
    const base = travel?.end || position;
    const [x, z] = directions[event.key];
    moveTo({ x: base.x + x, z: base.z + z });
  } else if (event.key.toLowerCase() === 'r') {
    event.preventDefault(); reset();
  } else if (event.key === 'Escape') {
    travel = null; velocity.x = velocity.z = 0; city.marker(0, 0, false);
    status.textContent = 'TRAVEL PAUSED'; dirty = true; requestFrame();
  }
});

function requestFrame() {
  if (ready && inView && !document.hidden && frame === null) frame = requestAnimationFrame(tick);
}
function tick(now) {
  frame = null;
  const delta = lastTime ? Math.min((now - lastTime) / 1000, .05) : 1 / 60;
  lastTime = now;
  elapsed += delta;
  if (travel) {
    const arrived = !animated || advanceTravel(position, velocity, travel.end, delta);
    if (arrived) {
      Object.assign(position, travel.end);
      velocity.x = velocity.z = 0;
      const done = travel.onArrival;
      travel = null; city.marker(0, 0, false);
      status.textContent = 'CHOOSE A DESTINATION. MAKE YOUR OWN WAY.';
      done?.();
    }
    dirty = true;
  }
  const lookX = animated && !dialog.open ? pointer.x : 0;
  const lookY = animated && !dialog.open ? pointer.y : 0;
  if (!animated) view.x = view.y = 0;
  view.x += (lookX - view.x) * Math.min(1, delta * 3);
  view.y += (lookY - view.y) * Math.min(1, delta * 3);
  city.camera.position.set(position.x, 4.2, position.z);
  city.camera.lookAt(position.x + view.x * 9, 7 - view.y * 4, position.z - 42);
  // Projection follows the actual camera matrix rather than a simulated parallax.
  city.camera.updateMatrixWorld();
  for (const { destination, element } of markers) {
    const point = city.project(destination.x, 3.8, destination.z);
    const ahead = position.z - destination.z;
    const visible = entered && point.visible && ahead > 3 && ahead < 90;
    element.hidden = !visible;
    if (visible) element.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%)`;
  }
  document.querySelector('#coordinates').textContent = `${Math.abs(position.z).toFixed(2)} ${position.z < 0 ? 'S' : 'N'} · ${Math.abs(position.x).toFixed(2)} ${position.x < 0 ? 'W' : 'E'}`;
  document.querySelector('#map-player').style.top = `${(position.z + 148) / 183 * 90}px`;
  if (dirty || animated) city.render(delta, elapsed, animated && !dialog.open);
  dirty = false;
  if ((animated && !dialog.open) || travel) requestFrame();
}

function unavailable(message) {
  ready = false;
  travel = null;
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  document.body.classList.add('city-unavailable');
  document.querySelector('#world-markers').replaceChildren();
  status.textContent = message;
  canvas.setAttribute('tabindex', '-1');
  canvas.setAttribute('aria-hidden', 'true');
}

try {
  const { createCity } = await import('./city.js?v=20261108');
  city = createCity(canvas);
  city.resize();
  for (const destination of destinations) {
    const element = document.createElement('button');
    element.className = 'world-marker'; element.type = 'button'; element.hidden = true;
    const diamond = document.createElement('span'); diamond.className = 'diamond'; diamond.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    const number = document.createElement('small'); number.textContent = `DISTRICT ${destination.number}`;
    const name = document.createElement('strong'); name.textContent = `${destination.name} ↗`;
    label.append(number, name); element.append(diamond, label);
    element.setAttribute('aria-label', `Travel to ${destination.name}`);
    element.addEventListener('click', () => goToDestination(destination.id, element));
    document.querySelector('#world-markers').append(element);
    markers.push({ destination, element });
  }
  ready = true;
  status.textContent = animated ? 'YOUR CITY. YOUR DIRECTION.' : 'REDUCED MOTION — CLICK TO CHANGE LOCATION';
  addEventListener('resize', () => { city.resize(); dirty = true; requestFrame(); });
  document.addEventListener('visibilitychange', () => { lastTime = 0; dirty = true; requestFrame(); });
  new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    if (!inView && frame !== null) { cancelAnimationFrame(frame); frame = null; }
    if (!inView) { travel = null; velocity.x = velocity.z = 0; city.marker(0, 0, false); }
    lastTime = 0; dirty = true; requestFrame();
  }, { threshold: .05 }).observe(canvas);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    unavailable('3D PAUSED. USE TEXT VIEW, OR RELOAD TO RE-ENTER.');
  });
  requestFrame();
} catch (error) {
  console.warn('The 3D city is unavailable; the HTML website remains accessible.', error);
  unavailable('3D IS UNAVAILABLE ON THIS DEVICE. EXPLORE THE TEXT VIEW BELOW.');
}
