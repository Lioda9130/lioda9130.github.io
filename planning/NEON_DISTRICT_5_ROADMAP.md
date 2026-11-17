# Neon District 5.0 — HD Dynamic City Roadmap

> **Status:** draft for discussion, not an implementation report.
> **Project:** [Neon District](https://lioda9130.github.io/)
> **Repository:** `Lioda9130/lioda9130.github.io`
> **Initial baseline:** `c2940a0583bfbc439495de425c6e030fde577113` (2026-11-08)
> **Owners of decisions:** project owner; Codex proposes technical changes; ChatGPT provides reviews and design suggestions.

## Executive objective

Build a **navigable, living, believable 3D cyberpunk city** for the web. The website is no longer a personal portfolio. The current 4.x experience has useful free-roaming controls and original GLB assets, but appears repetitive, low-detail and insufficiently alive in close-up screenshots. We will **fix one high-quality, representative district before expanding world size**.

### Design and gameplay constraints

- Inspiration ratio: **60% futuristic megacity City Center; 25% Tokyo retail streets; 15% Hong Kong signage/street density**. Use original geometry, brands and assets instead of directly transferring game geometry or trademarked signs.
- Visually readable **blue hour / city after dark**. The skyline, building façades and sidewalks should be visible; accent neons and lit windows must coexist with grounded ambient sky light.
- Wide boulevards, distinctive intersections, real sidewalks, intentional open space, varied massing and storefront interiors. Avoid cloning a single window material over a dozen towers.
- Dynamic systems: pedestrians (idle/walk/turn/wait/cross/visit), cars (lane-follow/slow/stop/turn), aerial vehicles and elevated rail. Density must scale with quality preset.
- Existing controls must survive: inverted X/Y drag-to-look and 360° yaw, WASD/arrow camera-relative walk, Shift sprint, click-to-route, Escape cancel, R reset, destination map, accessibility fallback.
- Static GitHub Pages build and SEO/canonical metadata must continue to work.

## Verified source baseline (inspect latest main before making changes)

| File | Current behavior | Major gap / risk |
|---|---|---|
| `docs/index.html` | Neon District / “The city never sleeps”, Night Market, Neon Plaza, Skyrail | Keep experience-focused copy, avoid reverting portfolio |
| `docs/city.js` | Renderer, sky, lighting, PBR base, buildings, props, GLB loading, transit, rain, hit tests | Large multi-purpose module; visual repetition; no reliable WebGL screenshot regression |
| `docs/neon4-loader.js` | Custom subset of glTF/GLB mesh/material/node loading and caching | General skeletal skinning, animation clips and advanced extensions not supported as standard `GLTFLoader` does |
| `docs/city-life.js` | Desktop configuration: 54 pedestrians, 21 vehicles, 4 drones, 4 pedestrian base models; linear loops | Configured != visible loaded count; simplistic gait; no traffic control integration |
| `docs/navigation.js` | 5×5 road grid, walkability and A* routing | Grid rigidity, destination behavior and movement jitter require regression coverage |
| `docs/app.js` | Inputs, camera, HUD, journey, animation frame | Risk of coupling between camera state and route state |
| `tests/verify.mjs` | JS/asset/model and a few route smoke checks | No real browser render, animations, FPS or dynamic traffic correctness tests |

## Roadmap prioritized by measurable outcome

### M0 — Safe baseline and reproducible diagnostics (P0)
**Deliverables:** baseline captures and metrics from one known browser+GPU+resolution; asset manifest report; player input smoke cases; no changes to visual design.

Actions:
1. Make a working branch from current main; record SHA and version in project notes.
2. Capture identical spawn/Grand Crossing/Night Market/Skyrail viewpoints with actual browser screenshots (not generated concepts).
3. Instrument loaded vs configured actors, GLB success/failure, `renderer.info.render.calls`, triangles, textures, and 1% low/median FPS.
4. Confirm use on Chromium and Edge; note GPU, viewport and quality settings.
5. Run `node tests/verify.mjs`; collect browser console errors.

**Exit gate:** reproducible baseline on documented hardware and no unreviewed overwrites of production.

### M1 — Stable rendering and GLB asset pipeline (P0)
**Deliverables:** official Three.js `GLTFLoader` feasibility PR, working sample animated character GLB, documented codec/license requirements.

Actions:
1. Prototype official `GLTFLoader` with the repository's vendored Three.js version; do not swap everything blindly.
2. Support rigged GLB clips (Idle / Walk / Turn) using `AnimationMixer`; validate normals/UV/PBR maps/color space.
3. Create data manifests for assets, scale/origin conventions, per-asset LOD budgets and missing-file fallback behavior.
4. Study asset compression only after baseline: KTX2 for textures, Meshopt/Draco when compatibility and loaders are verified.
5. Preserve existing 34 GLBs until tested; classify each as reuse, improve, replace or retire.

**Exit gate:** one rigged animated GLB, one PBR building, and a car load in the website without breaking controls and `verify.mjs`.

### M2 — Grand Crossing 120×120 vertical slice (P0)
**Deliverables:** a genuinely higher-quality district representative of the future city.

Architecture targets (quality goals, not existing quantities):
- Roughly **12 independently distinguishable building designs**, not merely 12 re-tinted boxes.
- Roughly **20 varied street-facing storefront modules** with modeled glass frames, doors, interiors, signage, HVAC/utilities, canopy and lighting.
- Layered large-road intersection: multiple lanes, real corners/curbs, pedestrian sidewalks and crosswalks; one plaza with open sky view.
- Separate skyline, midground, near street LOD and a balanced blue-hour lighting rig.
- Street ground materials with subtle imperfections, roughness differences, wet patches and a controlled reflection budget.

**Exit gate:** side-by-side real render comparison at identical viewpoints; no repeated wall-of-windows impression in hero shots; player can walk/take click routes through the entire slice.

### M3 — Dynamic life and traffic rules (P1)
**Deliverables:** credible pedestrian and vehicle interaction rather than looping in isolation.

- Pedestrians: distinct silhouette/clothing/scale; rigged movement and idle transitions; waypoint walking; traffic light wait/cross; occasional shop stops; local separation.
- A target of **25–40 visibly active pedestrians** in the first slice on reference PC, subject to FPS measurements (not a guarantee).
- Cars: lane graph, destination selection, smooth turning, intersection signals, spacing/stop behavior, headlights and brake lights. Bus/taxi service stops.
- Train: arrivals/returns; optional station stops. Aerial traffic follows separate air lanes.
- Use a shared simulation time and performance budgets rather than arbitrary animation counts.

**Exit gate:** scripted intersection walkthrough demonstrates synchronized signals, pedestrian crossing and cars braking/turning, with no obvious overlap or deadlock in a test run.

### M4 — District identity and expansion (P1)
**Deliverables:** varied Night Market, Neon Plaza, Skyrail, Tokyo Retail Avenue, Skyline District connected by safe paths.

- Different architecture/signage/npc schedule per district, not uniform grids.
- Streaming/chunk loading for any expansion beyond the high-detail core; stable persistence of player position through loading.
- Refine route topology and collision; no building-penetrating paths or travel becoming stuck/oscillating.

**Exit gate:** all important destinations can be reached on foot or click-travel, including through inter-district intersections, with browser regression test coverage.

### M5 — Visual finishing and performance (P2)
**Deliverables:** quality tiers, practical browser FPS and stability benchmarks, accessible fallback, GitHub Pages release.

- PBR base/normal/roughness/metallic/occlusion; calibrated exposure and tone mapping.
- Selective neon bloom and appropriate reflections. Avoid blanket brightness increase or fake wetness everywhere.
- LOD/culling/instancing for repeated objects, reduced shadow receivers, dynamic resolution and capped pixel ratio.
- **Target only:** desktop High/Ultra 60 fps, Medium/Low 30+ fps at documented hardware/viewport. Do not claim success without recorded benchmarks.
- Verify static hosting, SEO tags and text view after migration.

**Exit gate:** automated tests pass, real browser captures compare favorably, benchmark report exists, rollback documented, PR reviewed before main deploy.

## Architectural boundaries (suggested, not a mandated rewrite)

```text
docs/
├── index.html
├── app.js
├── styles.css
├── core/{renderer,lighting,camera,quality}.js
├── world/{city-layout,buildings,roads,districts,props}.js
├── systems/{navigation,pedestrians,traffic,signals,animation}.js
├── assets/{buildings,characters,vehicles,props,textures}/
└── vendor/
tests/{asset-validation,navigation,webgl-smoke}/
```

Codex should **propose the smallest practical sequence** to migrate functionality from the existing code, not rewrite everything in one PR. Investigate GLTFLoader and asset optimization against the actual vendored Three.js version.

## Hard constraints / non-goals

- No new portfolio/about-work home page: keep explorability and city identity.
- Do not publish generated concept art as if it were a browser or model render.
- Do not overwrite main via a one-shot patch. Each milestone is a reviewable branch/PR with tests and reversibility.
- Do not directly reuse proprietary game models, copyrighted advertising or unlicensed brand assets.
- Refrain from claiming Unreal Engine / AAA / raytraced photorealism without actual assets and validated WebGL implementation.
- Do not increase building/NPC counts to hide lacking quality or at the cost of major frame drops.

## Collaboration protocol — ChatGPT / Codex / owner

1. Treat **this Markdown file as the canonical plan**, linked from PRs and Issues. Codex: read `AGENTS.md` and write the initial technical review in `planning/CODEX_REVIEW.md`.
2. Separate **observed current code facts**, **proposals**, **implemented changes**, and **verified benchmarks**.
3. Ask the owner for approval of any redesign that changes key visual direction, controls, UI, main deploy or licensed external resources.
4. Each Codex PR must explain modified modules, key tradeoffs, visual evidence, test commands, rollback plan and links to this roadmap.
5. The owner can provide screenshots/videos of the current build to calibrate visual feedback.

## Questions Codex must answer before implementation

- Is the 4.0 loader/mesh structure still compatible with official GLTFLoader? What is the smallest safe migration?
- What prevents believable pedestrian animation in today's `city-life.js`? Which model authoring workflow is required?
- What are the most effective **three** graphics improvements visible from the spawn viewpoint?
- Which of the original 34 GLBs should be kept or replaced first, and why?
- How do we get reproducible browser screen captures and FPS stats in the current environment?
- What is the minimal first PR and its testable completion criteria?

**Next action:** Codex technical review → approve M0/M1 PR boundaries → implement M0, then reconsider later milestones based on measured outcomes.
