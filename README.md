# Lioda9130 — Neon District

An original cyberpunk city and personal website. Click the boulevard to travel through a procedural 3D scene, or use the Work, About, and Connect destinations. Inspired by immersive spatial websites; no third-party site's artwork or code is copied.

Website: https://lioda9130.github.io/

## Structure

- `docs/index.html`: homepage content, metadata, and structured data
- `docs/styles.css`: responsive layout and styles
- `docs/app.js`: pointer/keyboard navigation, camera travel, dialogs, motion preferences, and graceful fallback
- `docs/city.js`: procedural buildings, signs, lights, atmosphere, and street raycasting
- `docs/navigation.js`: destination positions and movement bounds
- `docs/vendor/`: self-hosted Three.js 0.170.0 and its MIT license
- `docs/favicon.svg`: site icon
- `docs/robots.txt` and `docs/sitemap.xml`: search discovery
- `docs/404.html`: missing-page response

Buildless HTML, CSS, and JavaScript modules. No package installation or build step. Three.js is pinned and served from this repository, with no runtime CDN requests. The city needs a browser with WebGL 2; the HTML content remains available without 3D or JavaScript.

## Explore

- Click or tap the street to move to that position. Buildings and sky are not movement targets.
- Choose a numbered marker, map destination, or navigation link to travel to a section and open its information panel.
- Focus the scene and use the arrow keys to move; `R` resets the view and `Escape` cancels travel.
- `Motion: off` freezes ambient animation and makes travel immediate. System reduced-motion preferences are respected.
- `Text view` provides all content and links without the 3D experience.
- Touch dragging scrolls the page; a tap moves through the scene.

## Preview

With Python installed, run from the repository directory:

```powershell
python -m http.server 8000 --directory docs
```

Open http://localhost:8000/ in a browser. Stop with Ctrl+C. Alternatively, use VS Code Live Server with `docs` as its server root. Do not open `index.html` through `file://`, because browser modules require HTTP.

## Checks

With Node.js 22 or later, run the dependency-free integration checks:

```powershell
node --experimental-vm-modules tests/verify.mjs
```

These cover navigation bounds, camera-ray geometry, app initialization, destination dialogs, interrupted travel, reduced motion, touch scroll discrimination, and WebGL fallback. They do not replace visual browser testing or GPU performance measurements.

## Publish changes

GitHub Pages publishes the `docs` folder on the `main` branch. Commit and push changes to update the website. Check the repository Actions tab for the deployment result.

```powershell
git add -- docs README.md
git commit -m "Update website"
git push origin main
```

## Google Search Console

Publication and Google indexing are separate steps. Neither indexing nor ranking is guaranteed.

1. Sign in to https://search.google.com/search-console/ with your own Google account.
2. Add a URL-prefix property for `https://lioda9130.github.io/`.
3. Choose HTML file verification and place the provided file, unchanged, in `docs/`. Alternatively, add the supplied verification meta tag inside the homepage `<head>`.
4. Commit and push, wait for deployment, then verify ownership in Search Console.
5. Submit `sitemap.xml` in Sitemaps.
6. Inspect `https://lioda9130.github.io/` and request indexing. Monitor the indexing report for results.

Never commit passwords or access tokens. A Search Console verification file or meta tag is intended to be public.

Official guidance: https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
