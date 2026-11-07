// Keep destinations and travel constraints independent of rendering.
export const destinations = [
  { id: 'work', name: 'The work', number: '01', x: -4, z: -16 },
  { id: 'about', name: 'The person', number: '02', x: 4, z: -72 },
  { id: 'connect', name: 'The connection', number: '03', x: -3, z: -132 },
];
export const homePosition = { x: 0, z: 35 };
// Critically damped motion retains velocity when a destination changes.
// Capping the spring displacement limits cruising speed on long routes.
export function advanceTravel(position, velocity, target, dt) {
  const omega = 2.2;
  const dx = position.x - target.x, dz = position.z - target.z;
  const scale = Math.min(1, 20 / Math.max(.001, Math.hypot(dx, dz)));
  const decay = Math.exp(-omega * dt);
  for (const axis of ['x', 'z']) {
    const offset = (position[axis] - target[axis]) * scale;
    const anchor = position[axis] - offset;
    const impulse = (velocity[axis] + omega * offset) * dt;
    position[axis] = anchor + (offset + impulse) * decay;
    velocity[axis] = (velocity[axis] - omega * impulse) * decay;
  }
  const bounded = streetPosition(position.x, position.z);
  for (const axis of ['x', 'z']) {
    if (bounded[axis] !== position[axis]) velocity[axis] = 0;
    position[axis] = bounded[axis];
  }
  return Math.hypot(position.x - target.x, position.z - target.z) < .015
    && Math.hypot(velocity.x, velocity.z) < .04;
}
export function streetPosition(x, z) {
  return {
    x: Math.max(-6, Math.min(6, Number.isFinite(x) ? x : 0)),
    z: Math.max(-148, Math.min(35, Number.isFinite(z) ? z : 35)),
  };
}
export function destinationPosition(destination) {
  return streetPosition(destination.x * .35, destination.z + 17);
}
export function easeTravel(t) {
  const bounded = Math.max(0, Math.min(1, t));
  return bounded * bounded * (3 - 2 * bounded);
}
