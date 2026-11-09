# M0 diagnostics and loading reliability

Implementation date: 2026-11-09 (Asia/Seoul). Parent: review branch `codex/neon-district-5-review`, commit `9089476`. Product baseline: `c2940a0`.

References: [roadmap](./NEON_DISTRICT_5_ROADMAP.md), [technical review](./CODEX_REVIEW.md), [review PR #1](https://github.com/Lioda9130/lioda9130.github.io/pull/1).

## Implemented

- Opt-in `?debug=1` diagnostics: configured vs instantiated actors, actor bounding boxes intersecting the camera frustum (not occlusion-tested visibility), asset pending/success/failure, draw calls, triangles, texture/geometry counts. Counts are not memory byte measurements.
- Four camera presets (Spawn, Crossing, Market, Skyrail) reset actor/train/rain/sculpture simulation to t=0 and pause animation. Presets do not save a new motion preference. They are debug tools, not changes to normal navigation.
- A measurement button records 10 seconds of warm-up then 30 seconds of raw rAF intervals. Median FPS and 1% low use the formulas in the review. Hidden/offscreen/paused/blurred samples interrupt a run rather than producing a misleading completed score. Repeat three times per viewpoint/browser for a full baseline. JSON includes raw samples and environment fields.
- No diagnostic UI or frame-sample collection without the query parameter. Actor frustum calculations run only when diagnostics refresh; their overhead is included in reported timings.
- Shared asset state covers manifest, surface maps, GLB parsing, embedded image decode and actor/building spawn jobs. HTTP/image deadlines are 15 seconds. Partial failures remain explicitly visible in the diagnostic report.
- Model loading waits for embedded images, failed cache entries can be requested again, and missing actor variants fall back to the available variants. No automatic unlimited retries. If every variant fails, the actor spawn job is marked failed.
- Async load completion requests a render even with Motion off. Canvas datasets record instantiated actors rather than planned counts. Readiness appears as loading / partial / ready.
- Walking keys apply only while the city canvas is focused. Returning from a hidden tab does not preserve pressed movement keys.

## Reproduce locally

Serve the repository's `docs` directory with an HTTP static server (for example VS Code Live Server), then open `/?debug=1`. Do not use file:// URLs. Existing GitHub Pages production still serves main and will not show these branch changes.

1. Wait until pending assets reach zero; record failures rather than hiding them.
2. Select Spawn and capture the actual browser viewport. Repeat Crossing, Market, Skyrail. Do not label a capture as the fully loaded baseline when it has failed assets.
3. Select Measure 10s + 30s; keep the tab focused and visible. It turns ambient motion on for the measurement without changing the saved preference. Export the JSON when complete. Viewpoint changes interrupt measurement.
4. Repeat three times for default and low (`?debug=1&quality=low`) quality. Record browser/version, GPU/software-renderer status, OS, resolution, DPR, power mode, and branch SHA alongside each result. GPU identity is not collected by this implementation; the JSON explicitly says it is unidentified.
5. Verify drag-look, WASD/arrow movement, sprint, click travel/re-targeting, cancel/reset, map/destinations, text guide, touch and resized layout. Verify normal mode without `debug=1` as well.

## Checks performed

All passed locally on Node.js:

```text
node tests/verify.mjs
node tests/diagnostics.mjs
node --experimental-vm-modules tests/app-lifecycle.mjs
```

Changed JS modules also passed `node --check`. The additional tests exercise FPS math, interrupted runs, asset-state transitions, simulated HTTP/decode failures, retry after failure, decode readiness, partial actor spawning at both quality settings, deterministic actor poses, reduced-motion async redraw, dataset counts, keyboard focus and hidden-tab handling.

These tests use mock texture loading and a mock DOM. They do not validate image decoding in an actual browser, shader compilation, final appearance or GPU performance.

## Browser evidence and remaining gate

The computer-use inventory returned no apps or browsers on 2026-11-09: native pipe unavailable and browser access host unavailable. No preview server or alternative browser automation was started after that result. **No new screenshots, measured FPS, Chromium/Edge comparison or hardware baseline are supplied.** Browser validation remains required before treating M0 as complete or merging to main. There is no performance improvement claim.

## Scope differences and rollback

The roadmap proposed a measurement-only first PR. This branch also fixes the observed loading/focus issues because their behavior would invalidate reduced-motion and partial-loading measurements. It does not replace the loader with GLTFLoader, smooth/rebuild models, redesign districts, increase actors, introduce traffic rules or upgrade Three.js.

This is a separate draft implementation PR stacked on the review branch; production main is unchanged. Roll back by closing the draft or reverting its implementation commit; no model files or existing untracked work are deleted. Merge the documentation review first, then retarget this PR to main after browser validation.
