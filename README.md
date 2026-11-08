# Neon District — A city after dark

Live site: https://lioda9130.github.io/

Installed from the user-supplied install_neon_district_4.py package (SHA-256: 2156f3d4d2f4a7bbb83f5492e205fef119c15ba092fafee2e59ce234762e9d70).
The package contains 34 GLB models, local surface textures, city navigation and animated traffic/pedestrians. Its texture paths were corrected to match the packaged files.

The project is an explorable cyberpunk city, centered on atmosphere, wandering and street life. The creator credit remains in the footer; the experience is no longer a personal portfolio.

## Explore

- Drag the scene to look around in 360 degrees.
- Click a road to travel, or walk with WASD / arrow keys. Hold Shift to move faster.
- Choose Night market, Neon plaza or Skyrail to travel between districts without opening a popup.
- Use Reset view, Motion and City guide controls as needed.

## Development

The site uses static HTML, CSS and JavaScript with self-hosted Three.js. Serve docs over HTTP with VS Code Live Server, or python -m http.server 8000 --directory docs.

Run node tests/verify.mjs to check model loading, asset references and road routes. Browser checks are still needed for rendering and performance.

GitHub Pages publishes docs from main. Local backups are excluded from Git. No build step is needed.

Publication does not guarantee Google indexing. The site retains its canonical URL, structured data, robots.txt and sitemap.xml; ownership verification and indexing requests can be handled in Google Search Console.
