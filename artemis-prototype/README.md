# ARTEMIS — A world of possibility

A desktop-first frontend prototype for finding informal work, showcasing skills, understanding job terms, and finding support. Its Greek garden is a continuous Three.js world with original articulated figures and scroll-driven cameras. No build step or package installation is required.

## Preview

Run `node server.mjs` from this directory, then open http://localhost:4173.

## The journey

- **The Hesperides:** scroll toward the bronze gates; both doors open and the camera passes through.
- **Sisyphus / Find work:** select a physical 3D boulder or its accessible job label. Sisyphus moves to the selected stone; scrolling moves it uphill. Review pay, hours, duration, and tools before saving a demo request.
- **Hephaestus / Your craft:** animated hammer strikes and forge sparks accompany trade selection and a browser-saved work card.
- **Hermes / Build trust:** bring together work, pay, and payment timing. The three agreement symbols respond to the checklist; the sample agreement follows the selected job.
- **Athena / Your rights:** an animated guardian, owl, shield, and olive grove introduce support panels and official links.
- **Request celebration:** sending a demo request opens a separate 3D Athena scene with a raised laurel and the selected job receipt.

Use the chapter bar to jump between scenes, or scroll in either direction. Job listings below the canvas provide a direct alternative. The Motion button and system reduced-motion preference stop ambient motion and use static chapter views. A non-WebGL fallback keeps the ordinary job and profile flows available.

## Prototype boundaries

All employers, job listings, pay, and distances are fictional. No real request is sent. Work cards, demo requests, and reports remain in browser storage. Optional work photos are stored locally. Sample hiring requests last only for the current visit. There is no backend, authentication, or verified worker/employer system.

## Files and assets

- `dist/index.html`, `dist/style.css`, `dist/cinema.css`: page and interface.
- `dist/app.js`: work cards, jobs, support, and demo interactions.
- `dist/cinema.js`: world, camera journey, raycasting, animation, and celebration.
- `dist/myth-models.js`: original procedural characters and architecture.
- `dist/CREDITS.md`: artwork and dependency attribution.

Three.js is vendored locally. Google Fonts requires network access; system serif and sans-serif fallbacks are provided. The old kouros asset and gallery module remain in the source archive but are not loaded by the current page.

## Validation

`npm run check` checks the three active JavaScript modules. Desktop browser checks cover all five scenes, selectable job labels, job details, saved demo requests and Athena celebration, work-card creation, agreement toggles and terms, support panels, and chapter navigation. The browser console was checked for rendering errors.
