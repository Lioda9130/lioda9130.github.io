import * as THREE from './vendor/three.module.js';

// Shared instanced geometry keeps a moving crowd inexpensive to draw.
export function createCityLife(scene, compact = false) {
  const count = compact ? 18 : 34;
  const clothing = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), clothing, count * 6);
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#d5a68f' }), count);
  bodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  heads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bodies.frustumCulled = heads.frustumCulled = false;
  bodies.name = 'walking-pedestrians'; heads.name = 'pedestrian-heads';
  const palette = ['#60cad4', '#bc568c', '#a7b5d0', '#d39458', '#6688ab'];
  for (let i = 0; i < count; i++) {
    for (let part = 0; part < 6; part++) {
      bodies.setColorAt(i * 6 + part, new THREE.Color(part === 2 || part === 3 ? '#36465f' : palette[i % palette.length]));
    }
  }
  scene.add(bodies, heads);
  const parent = new THREE.Object3D();
  const piece = new THREE.Object3D();
  const transform = new THREE.Matrix4();
  function part(mesh, index, x, y, z, sx, sy, sz, angle = 0) {
    piece.position.set(x, y, z); piece.scale.set(sx, sy, sz); piece.rotation.set(angle, 0, 0);
    piece.updateMatrix(); transform.multiplyMatrices(parent.matrix, piece.matrix);
    mesh.setMatrixAt(index, transform);
  }
  const taxis = [];
  const chassis = new THREE.BoxGeometry(1.65, .55, 3.6);
  const glass = new THREE.BoxGeometry(1.25, .4, 1.7);
  const lamp = new THREE.BoxGeometry(1.4, .08, .06);
  const shell = new THREE.MeshBasicMaterial({ color: '#455e75' });
  const window = new THREE.MeshBasicMaterial({ color: '#153c51' });
  const light = new THREE.MeshBasicMaterial({ color: '#8af9ff' });
  const tail = new THREE.MeshBasicMaterial({ color: '#ff4c87' });
  for (let i = 0; i < (compact ? 4 : 7); i++) {
    const vehicle = new THREE.Group(); vehicle.name = 'air-taxi';
    vehicle.add(new THREE.Mesh(chassis, shell));
    const cabin = new THREE.Mesh(glass, window); cabin.position.y = .42; vehicle.add(cabin);
    for (const [z, mat] of [[-1.83, light], [1.83, tail]]) {
      const strip = new THREE.Mesh(lamp, mat); strip.position.z = z; vehicle.add(strip);
    }
    const underglow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.2), new THREE.MeshBasicMaterial({ color: '#54e3ef', transparent: true, opacity: .25, side: THREE.DoubleSide }));
    underglow.rotation.x = -Math.PI / 2; underglow.position.y = -.3; vehicle.add(underglow);
    scene.add(vehicle); taxis.push(vehicle);
  }
  let clock = 0;
  function update(delta) {
    clock += delta;
    for (let i = 0; i < count; i++) {
      const side = i % 2 ? 1 : -1;
      const direction = i % 4 < 2 ? 1 : -1;
      const progress = (i * 17.31 + clock * (.8 + i % 5 * .13)) % 250;
      const z = direction > 0 ? -210 + progress : 40 - progress;
      const gait = clock * (3.4 + i % 3 * .35) + i * 2.1;
      const swing = Math.sin(gait) * .55;
      parent.position.set(side * (9.05 + (i % 3 - 1) * .43), .21 + Math.abs(Math.sin(gait)) * .035, z);
      parent.rotation.y = direction > 0 ? 0 : Math.PI;
      parent.updateMatrix();
      const k = i * 6;
      part(bodies, k, 0, 1.3, 0, .48, .65, .3);
      part(bodies, k + 1, 0, .93, 0, .38, .18, .28);
      part(bodies, k + 2, -.13, .52, Math.sin(swing) * .28, .16, .78, .18, swing);
      part(bodies, k + 3, .13, .52, -Math.sin(swing) * .28, .16, .78, .18, -swing);
      part(bodies, k + 4, -.32, 1.19, -Math.sin(swing) * .2, .13, .6, .14, -swing);
      part(bodies, k + 5, .32, 1.19, Math.sin(swing) * .2, .13, .6, .14, swing);
      part(heads, i, 0, 1.83, 0, .19, .23, .19);
    }
    bodies.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
    taxis.forEach((taxi, i) => {
      const direction = i % 2 ? 1 : -1;
      const progress = (clock * (8 + i % 3 * 2) + i * 47) % 310;
      taxi.position.set(direction * 5.5, 9 + i % 3 * 2.8 + Math.sin(clock * .8 + i) * .16, direction > 0 ? -260 + progress : 50 - progress);
      taxi.rotation.y = direction > 0 ? Math.PI : 0;
      taxi.rotation.z = Math.sin(clock * .5 + i) * .025;
    });
  }
  update(0);
  return { update };
}
