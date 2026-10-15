# Ergon

**Where the work is kept.** A concept site for *Beyond the Waiting Line*: a
platform that helps India's daily-wage workers (masons, painters, electricians,
plumbers, hawkers) find nearby work, show their skill without a résumé, trust
the terms before they commit, and reach the welfare schemes they're owed.

*Ergon* (ἔργον) is Greek for work, and for the deed done.

## The hero, in three acts

1. **The climb.** Scroll pushes a chrome boulder up a terracotta hill behind a
   marble Sisyphus. Story cards ink in as it passes: the labour naka at dawn,
   the hiring hill of ancient Athens, skill with no paper, terms by word of
   mouth. Stop scrolling and the boulder slips back. At the summit it rolls
   away.
2. **The descent.** Every boulder falls into an amphora. This is a scroll-
   scrubbed film (`public/media/descent.mp4`, see `docs/VIDEO.md`), with a live
   WebGL fallback until the film exists.
3. **The hall.** The amphora, in WebGL, on a plinth in a dark gallery. Its
   frieze shows modern Indian workers painted in Attic black-figure style, and
   paints itself in as the boulders land. Four chapters (Α Β Γ Δ) turn a
   different worker to face you: find work, show your skill, the terms first,
   your rights. Drag to turn the vase; touch any figure to open their record;
   every chapter can be read aloud in Hindi.

## Run

```bash
npm install
npm run dev
```

## Where things are

- `src/engine.js`, `src/hill.js`, `src/figure.js`, `src/Ball.jsx`: the climb
- `src/vase/profile.js`: the amphora's lathe profile and texture layout
- `src/vase/paint.js`: paints the vase surface (bands, frieze, wear) into canvases
- `src/vase/VaseScene.jsx`: the hall in three.js (vase, case, light, boulders, camera)
- `src/vase/VaseHall.jsx`: scroll timeline, video scrub, chapters and interactions
- `src/vase/data.js`: mock workers, jobs and schemes
- `public/art/`: the frieze plates (generated with Codex), keyed at runtime

All names, jobs and numbers are mock data.
