import * as THREE from './vendor/three.module.js';
import { createCityLife } from './city-life.js?v=20261108';

// Procedural geometry and textures: no stock city, remote fonts, or model downloads.
export function createCity(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 760 ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#080c1b');
  scene.fog = new THREE.FogExp2('#0d182b', .0065);
  const camera = new THREE.PerspectiveCamera(62, 1, .1, 550);
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const planeGeometry = new THREE.PlaneGeometry(1, 1);
  let seed = 9130;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const material = color => new THREE.MeshBasicMaterial({ color });
  const cyan = material('#63e6eb');
  const pink = material('#ed3b94');
  const amber = material('#ffb674');
  const dark = material('#0a1121');
  const roof = material('#172139');
  const unitBox = (x, y, z, w, h, d, mat) => {
    const mesh = new THREE.Mesh(boxGeometry, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    scene.add(mesh);
    return mesh;
  };
  function canvasTexture(width, height, draw) {
    const image = document.createElement('canvas');
    image.width = width; image.height = height;
    draw(image.getContext('2d'));
    const texture = new THREE.CanvasTexture(image);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }
  const windowMaterials = ['#57c7d8', '#dd508d', '#8d89c9', '#e3b082'].map((color, i) => {
    const texture = canvasTexture(128, 256, ctx => {
      ctx.fillStyle = ['#0a1728', '#151225', '#101527', '#101a26'][i];
      ctx.fillRect(0, 0, 128, 256);
      for (let y = 5; y < 256; y += 11) {
        for (let x = 5; x < 128; x += 10) {
          ctx.globalAlpha = random() > .40 ? .48 + random() * .52 : .08;
          ctx.fillStyle = color;
          ctx.fillRect(x, y, 3 + random() * 3, 4);
        }
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#030913';
      for (let x = 0; x < 128; x += 32) ctx.fillRect(x, 0, 2, 256);
    });
    return new THREE.MeshBasicMaterial({ map: texture });
  });
  const glowTexture = canvasTexture(128, 128, ctx => {
    const gradient = ctx.createRadialGradient(64, 64, 1, 64, 64, 64);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(.08, '#ffffffa0');
    gradient.addColorStop(.35, '#ffffff25');
    gradient.addColorStop(1, '#ffffff00');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
  });
  function glow(x, y, z, color, size, opacity = .55) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color, opacity, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    sprite.position.set(x, y, z); sprite.scale.set(size, size, 1);
    scene.add(sprite);
    return sprite;
  }
  function sign(text, subtitle, x, y, z, width, height, color, rotation = 0) {
    const map = canvasTexture(512, 256, ctx => {
      ctx.fillStyle = '#090f1e'; ctx.fillRect(0, 0, 512, 256);
      ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.strokeRect(5, 5, 502, 246);
      ctx.fillStyle = color; ctx.textAlign = 'center';
      ctx.font = '700 78px Arial'; ctx.fillText(text, 256, 133);
      ctx.font = '18px monospace'; ctx.fillText(subtitle, 256, 191);
      ctx.fillRect(25, 24, 34, 4); ctx.fillRect(453, 228, 34, 4);
    });
    const panel = new THREE.Mesh(planeGeometry, new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide }));
    panel.position.set(x, y, z); panel.scale.set(width, height, 1); panel.rotation.y = rotation;
    scene.add(panel);
    glow(x, y, z + .2, color, width * 2, .18);
    return panel;
  }

  // A broad, unobstructed boulevard makes click-to-travel collision-free.
  unitBox(0, -.2, -90, 180, .35, 400, material('#080f1c'));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(16, 215), new THREE.MeshBasicMaterial({ color: '#101b29' }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, .015, -65);
  scene.add(ground);
  for (const side of [-1, 1]) {
    unitBox(side * 9.2, .09, -75, 2.5, .2, 240, roof);
    unitBox(side * 7.9, .12, -75, .035, .025, 240, cyan);
    unitBox(side * 10.5, .35, -75, .12, .7, 240, dark);
  }
  const roadLine = material('#778a92');
  for (let z = 35; z > -185; z -= 8) unitBox(0, .04, z, .075, .02, 2.6, roadLine);
  // Neon streaks on the wet street, kept as inexpensive translucent planes.
  for (let i = 0; i < (innerWidth < 760 ? 55 : 100); i++) {
    const reflection = new THREE.Mesh(planeGeometry, new THREE.MeshBasicMaterial({ color: i % 3 ? '#36c5d6' : '#d93c8c', transparent: true, opacity: .04 + random() * .12, depthWrite: false }));
    reflection.rotation.x = -Math.PI / 2;
    reflection.position.set((random() - .5) * 14, .06 + i * .0001, 35 - random() * 240);
    reflection.scale.set(.08 + random() * .7, 1 + random() * 9, 1);
    scene.add(reflection);
  }
  for (let row = 0; row < 16; row++) {
    for (const side of [-1, 1]) {
      for (let depth = 0; depth < 2; depth++) {
        const x = side * (18 + depth * 20 + random() * 3);
        const z = 22 - row * 16 - depth * 5;
        const height = 12 + random() * 43 + depth * 15;
        const width = 9 + random() * 6;
        const facade = windowMaterials[(row + depth + (side > 0 ? 1 : 0)) % 4];
        unitBox(x, height / 2, z, width, height, 11 + random() * 3, facade);
        unitBox(x, height + .2, z, width + .4, .45, 12, roof);
        if (row % 3 === 0) {
          unitBox(x, height + 3, z, .13, 6, .13, roof);
          glow(x, height + 6, z, '#ff4373', 2.2, .7);
        }
        if (!depth) {
          const neon = row % 3 ? cyan : pink;
          unitBox(x - side * (width / 2 + .06), height * .45, z + 5, .075, height * .65, .075, neon);
          unitBox(x, height * .78, z + 7.1, width * .85, .07, .06, neon);
          if (row % 2 === 0) glow(x - side * 5, height * .4, z + 6, row % 3 ? '#4acbd8' : '#dd2587', 15, .26);
        }
      }
    }
  }
  // Skyline silhouettes and distant traffic frame the vanishing point.
  for (let i = 0; i < 25; i++) {
    const x = (i - 12) * 8;
    const h = 25 + random() * 70;
    unitBox(x, h / 2, -280 - random() * 40, 5 + random() * 6, h, 8, windowMaterials[i % 4]);
  }
  sign('NEON', 'NIGHT IS JUST THE BEGINNING', -13, 15, 6, 9, 4.5, '#ff5dba', .2);
  sign('9130', 'INDEPENDENT / ALWAYS EXPLORING', 14, 26, -24, 12, 6, '#78eff7', -.18);
  sign('OPEN', 'IDEAS AFTER DARK', 12, 8, 9, 5, 2.5, '#ffc38e', -.25);
  sign('CREATE', 'A DIFFERENT KIND OF WEB', -13, 23, -68, 10, 5, '#67eedc', .18);
  sign('HELLO', 'CONNECTION ESTABLISHED', 13, 17, -124, 10, 5, '#ff70ab', -.18);
  // Suspended luminous gateway.
  unitBox(-10, 17, -96, .3, 34, .3, roof);
  unitBox(10, 17, -96, .3, 34, .3, roof);
  unitBox(0, 33, -96, 20, .3, .3, cyan);
  sign('LIODA9130', 'MAKE SOMETHING WORTH EXPLORING', 0, 29, -96, 17, 4, '#92e4ef');
  for (let z = 24; z > -180; z -= 24) {
    for (const side of [-1, 1]) {
      unitBox(side * 9, 2.7, z, .09, 5.4, .09, roof);
      unitBox(side * 8.7, 5.4, z, .8, .06, .16, amber);
      glow(side * 8.7, 5.4, z, '#ffac78', 5, .6);
    }
  }
  // Atmosphere uses points rather than hundreds of independently drawn objects.
  const rainPositions = new Float32Array((innerWidth < 760 ? 500 : 1100) * 3);
  for (let i = 0; i < rainPositions.length; i += 3) {
    rainPositions[i] = (random() - .5) * 65;
    rainPositions[i + 1] = random() * 65;
    rainPositions[i + 2] = 45 - random() * 240;
  }
  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rain = new THREE.Points(rainGeometry, new THREE.PointsMaterial({ color: '#94bad3', size: .055, transparent: true, opacity: .38, depthWrite: false }));
  scene.add(rain);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(11, 48), new THREE.MeshBasicMaterial({ color: '#697c9c', fog: false }));
  moon.position.set(65, 84, -270); scene.add(moon);
  glow(65, 84, -269, '#405b84', 85, .22);
  const train = unitBox(-80, 41, -175, 15, .6, .8, cyan);
  const cityLife = createCityLife(scene, innerWidth < 760);
  let ambientTime = 0;
  const beacon = new THREE.Mesh(new THREE.RingGeometry(.6, .67, 40), new THREE.MeshBasicMaterial({ color: '#8ffff4', transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false }));
  beacon.rotation.x = -Math.PI / 2; beacon.position.y = .15; beacon.visible = false; scene.add(beacon);
  const raycaster = new THREE.Raycaster();
  const cursor = new THREE.Vector2();
  const targetPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  const projection = new THREE.Vector3();
  let width = 1, height = 1;

  return {
    camera,
    resize() {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width; height = bounds.height;
      renderer.setSize(width, height, false);
      camera.aspect = width / height; camera.updateProjectionMatrix();
    },
    streetHit(clientX, clientY) {
      const bounds = canvas.getBoundingClientRect();
      cursor.set(((clientX - bounds.left) / width) * 2 - 1, -((clientY - bounds.top) / height) * 2 + 1);
      raycaster.setFromCamera(cursor, camera);
      if (!raycaster.ray.intersectPlane(targetPlane, hit)) return null;
      // Clicking architecture or the sky does not teleport through it.
      if (Math.abs(hit.x) > 8 || hit.z < -155 || hit.z > 38 || hit.distanceTo(camera.position) > 110) return null;
      return { x: hit.x, z: hit.z };
    },
    project(x, y, z) {
      projection.set(x, y, z).project(camera);
      return { x: (projection.x * .5 + .5) * width, y: (-projection.y * .5 + .5) * height, visible: projection.z > -1 && projection.z < 1 && Math.abs(projection.x) < .9 && Math.abs(projection.y) < .72 };
    },
    marker(x, z, visible) { beacon.position.set(x, .15, z); beacon.visible = visible; },
    render(delta, time, animated) {
      if (animated) {
        ambientTime += delta;
        cityLife.update(delta);
        for (let i = 1; i < rainPositions.length; i += 3) {
          rainPositions[i] -= delta * 10;
          if (rainPositions[i] < 0) rainPositions[i] = 65;
        }
        rainGeometry.attributes.position.needsUpdate = true;
        train.position.x = ((ambientTime * 9) % 180) - 90;
        beacon.scale.setScalar(1 + Math.sin(ambientTime * 4) * .15);
      }
      renderer.render(scene, camera);
    },
  };
}
