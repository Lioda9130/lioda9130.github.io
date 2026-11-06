// Keep destinations and travel constraints independent of rendering.
export const destinations = [
  { id: 'work', name: 'The work', number: '01', x: -4, z: -16 },
  { id: 'about', name: 'The person', number: '02', x: 4, z: -72 },
  { id: 'connect', name: 'The connection', number: '03', x: -3, z: -132 },
];
export const homePosition = { x: 0, z: 35 };
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
