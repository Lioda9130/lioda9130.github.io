# Neon District — Codex collaboration instructions

## Project identity (read first)
- This repository is **an explorable 3D cyberpunk city**, not a personal portfolio. Keep the current night-city explorer identity, Market / Plaza / Skyrail sections and text-only accessibility fallback.
- **Read `planning/NEON_DISTRICT_5_ROADMAP.md` before planning or implementing any new city work.** Read `planning/CODEX_REVIEW.md` for outstanding technical review questions.
- Baseline for the initial plan: commit `c2940a0583bfbc439495de425c6e030fde577113` (2026-11-08). **Always inspect the current branch first**; the plan may have become stale.

## What to do when asked for a design/architecture review
1. Compare the roadmap against current source code. Do not claim a feature is implemented just because a roadmap mentions it.
2. Inspect `docs/app.js`, `docs/city.js`, `docs/city-life.js`, `docs/navigation.js`, `docs/neon4-loader.js`, `docs/index.html`, `tests/verify.mjs` and relevant assets.
3. Record specific technical findings, risks, proposed file edits, tests, and open questions in `planning/CODEX_REVIEW.md` (or the linked GitHub Issue if one exists).
4. Recommend a **small first PR** (baseline metrics and/or loader migration prototype) before redesigning the whole city.
5. Do not overwrite the running site or import unlicensed assets without explicit approval.

## Non-negotiable product decisions
- Visual direction: original blue-hour / after-dark megacity, with **60% futuristic City Center massing, 25% Tokyo storefront/streetscape realism, 15% Hong Kong signage density**. Inspiration only, no direct copyrighted environment copying.
- Avoid repetitive box towers / texture-only superficial variation. Prioritize distinct building silhouettes, high-quality near-street architecture, authentic ground-floor interiors, PBR materials and readable lighting.
- The world must feel alive: animated pedestrians, vehicles responding to roads/signals, drones/rail, mixed behaviors. Real count != configured count; instrument and measure.
- Preserve inverted X/Y 360° drag-look, WASD camera-relative movement, Shift sprint, click-to-travel, Escape cancel, R reset, destination buttons, minimap and keyboard access.
- Keep GitHub Pages static hosting functional. Protect `main` by proposing small branches/PRs, with baseline comparison, screenshots, FPS readings and rollback steps.

## Acceptance and honesty
- Run `node tests/verify.mjs` after relevant changes; add tests for loader, pathing, browser errors, FPS and visual regression when practical.
- A concept image is **not** an actual render. A standalone GLB renderer image is **not** a website screenshot. State the distinction explicitly.
- No performance guarantee without hardware/browser/resolution measurement. Do not report async asset spawns as already loaded.
- In reviews and PRs, link back to `planning/NEON_DISTRICT_5_ROADMAP.md` and list deviations with reasons.
