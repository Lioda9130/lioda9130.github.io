# Street detail iteration — 2026-11-09

Requested by owner: more detailed buildings, rotating wheels and less cartoon-like people.

Base: `ca7da67` / PR #2. References: [roadmap](./NEON_DISTRICT_5_ROADMAP.md), [review](./CODEX_REVIEW.md).

## Implemented

- Six vehicle types: derive four wheel centers/radii from the original rubber geometry, hide static tyres, remove the static rim triangles while retaining other aluminium trim, and build smooth tyres, hubs and five-spoke alloy faces. Wheel rotation is `-distance / radius`, using each lane's world length and actual vehicle speed. Rotation is absolute so pausing, resetting simulation time and loop wrapping do not accumulate drift. Vehicles have independently animated pivots and shared geometry. Curved monocoque shells receive averaged normals; architectural edges and vehicle trim keep their existing normals.
- Pedestrians: four original code-built adult templates replace the displayed 4.x character silhouettes. Smaller head, narrower shoulders, jaw/nose/ears, muted clothing, collars, zipper, pockets, cuffs, hands and shoes. Ten articulated/batched meshes per person. Hip/knee and shoulder/elbow motion follows distance travelled; subtle torso counter-rotation replaces large bouncing. All original GLBs remain in the repository for comparison. The new people do not require those old character files to load.
- Three near-spawn buildings (12, 13, 14): street-facing side elevations gain framed bays, recessed-looking warm panes, mullions, shelf silhouettes, handles, stone sills and canopies. Static additions are batched by material. This is facade detail, not a walk-in interior or a complete district redesign.

## Quantitative checks (not GPU measurements)

`node tests/street-detail.mjs` inspects generated geometry and animation:

- Every car has four valid axle pivots, tyre bottoms near the road, and independent clone rotation. One metre of travel gives the expected angular displacement; zero simulation distance resets rotation.
- Adults are between 1.65 and 1.90 units tall before per-instance height variation, under .70 units wide, and have finite normals and elbow/knee joints. Distance-driven poses are deterministic.
- Each adult has 3,972 triangles and 10 visible meshes versus the old source character files' 6,560–6,984 triangles and 11–12 primitives. This is a source geometry comparison, not measured FPS or actual draw-call improvement.
- Detailed cars have 4,500–4,680 triangles and 22–23 visible meshes each, up from the source cars' 3,316–3,496 triangles and 11–12 primitives. Rotating wheels have a rendering cost that must be measured in-browser.
- Representative building_13 additions: 1,056 triangles in four meshes. Original building geometry remains intact.

Passed:

```text
node tests/verify.mjs
node tests/diagnostics.mjs
node tests/street-detail.mjs
node --experimental-vm-modules tests/app-lifecycle.mjs
```

## Visual verification and limitations

Computer-use inventory again returned no apps/browsers: native pipe and browser host unavailable. No actual browser screenshot, wheel-motion video, visual approval or FPS reading is supplied. These are source-level improvements pending real-browser validation, not a photorealism claim.

The people are procedural articulated models, not scanned humans, skinned GLBs, motion capture or foot-IK characters. Traffic still follows the existing straight lane loops and does not obey signals. The facade panes use simple opaque/emissive materials and silhouettes, not actual interior rooms. Check these limitations at close viewing distances before release.

## Roadmap deviation and next review

The owner explicitly requested visual/animation work after M0, so this small detail iteration precedes M1's official GLTFLoader/rigged-character prototype. It preserves the original GLBs and does not introduce externally licensed assets. Controls, night-city identity, road bounds and actor counts remain intact.

Review at Spawn, Crossing, Market and Skyrail using the M0 presets. Compare default/low quality, pause/resume, movement directions, wheel/arch clearance and foot contact. Measure the increased vehicle draw cost before deciding whether to merge. This branch is stacked on PR #2; public main is unchanged. Rollback is reverting this iteration or closing its draft PR, without deleting prior source assets or untracked local work.
