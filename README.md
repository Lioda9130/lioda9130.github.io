# Neon District — A city after dark

Live site: https://lioda9130.github.io/

Installed from the user-supplied install_neon_district_4.py package (SHA-256: 2156f3d4d2f4a7bbb83f5492e205fef119c15ba092fafee2e59ce234762e9d70).
Original 4.x assets are retained as fallbacks. The current city uses 15 architectural LOD models, scanned concrete PBR maps, animated skinned citizens, detailed nearby concept cars, self-hosted Three.js r170 GLTFLoader and environment reflections. Asset sources, adaptation notes and licenses are linked from docs/credits.html.

The project is an explorable cyberpunk city, centered on atmosphere, wandering and street life. The creator credit remains in the footer; the experience is no longer a personal portfolio.

## Explore

- Drag the scene to look around in 360 degrees.
- Click a road to travel, or walk with WASD / arrow keys. Hold Shift to move faster.
- Choose Night market, Neon plaza or Skyrail to travel between districts without opening a popup.
- Use Reset view, Motion and City guide controls as needed.

## Development

The site uses static HTML, CSS and JavaScript with self-hosted Three.js. Serve docs over HTTP with VS Code Live Server, or python -m http.server 8000 --directory docs.

Run node tests/verify.mjs, node tests/diagnostics.mjs, node tests/street-detail.mjs, node tests/realism.mjs and node --experimental-vm-modules tests/app-lifecycle.mjs. These check source models, skin animation, independent skeletons, vehicle pivots, architectural LOD, paths and lifecycle logic. Texture decoding/GPU rendering and FPS still need real-browser validation.

Open the HTTP-served site with ?debug=1 for fixed viewpoints and frame sampling. Low quality uses ?quality=low (or ?debug=1&quality=low). Detailed cars are limited to three nearby passenger cars on default quality and one on low. Vans/buses retain the original models. Distant buildings and traffic use cheaper geometry.

GitHub Pages publishes docs from main. Local backups are excluded from Git. No build step is needed.

Publication does not guarantee Google indexing. The site retains its canonical URL, structured data, robots.txt and sitemap.xml; ownership verification and indexing requests can be handled in Google Search Console.
