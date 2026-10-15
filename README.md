# Ergon

A frontend demonstration for workers to find sample work, describe their skills, check an offer and explore support. The original Sisyphus climb, chrome ball, descent into the amphora and interactive vase remain the main experience.

## Run

```sh
npm install
npm run dev -- --host 127.0.0.1 --port 5188 --strictPort
npm run check
node scripts/check-domain.mjs
npm run build
```

The four tools remain inside the vase gallery at `#work`, `#craft`, `#trust` and `#rights`. Each panel has an expand control. `#map` opens the separate agora: the original Three.js flower markers on a pitched MapLibre city, with shared filters, selectable jobs and a compact list. The list works when map resources fail. Distances are approximate straight-line distances, never walking routes.

## What works locally

- Fixed sample jobs around Andheri, Mumbai, with a labelled demo date of 15 October 2026. Location changes only your origin. Interest and one expiring 30-minute demo hold persist in browser storage; no employer is contacted and nothing is reserved.
- A personal work-card draft, explicit skills, all eleven spoken-language options, optional photographs and a 12-second voice recording. Fields use versioned localStorage; photo/audio blobs use IndexedDB. A readable canvas preview and the bronze tablet share the same generated card. PNG export does not include audio or endorsements.
- The offer checker preserves selected-job units and unknown terms. It uses sample daily benchmarks, not legal minimums, and keeps upfront-fee warnings prominent. Presets can be undone.
- Scheme suggestions show qualifications still to check and official sources. Aadhaar is a readiness question only; no identity number is collected. Wage reminders are editable local drafts with print and text download. Nothing is sent or filed.
- English/Hindi primary controls, optional speech, keyboard-accessible vase records and reduced-motion gallery layout. Browser voice availability varies.

## Artwork and 3D integration

Existing artwork and statue pieces from this checkout match the reference checkout under `testfolder/ergon`. The hero now uses the prior painted environment backdrop. Selected original procedural temples, trees, Hephaestus and Athena models from `origin/b_proto_v2` commit `492288f` are integrated into the existing gallery renderer. The original ball is unchanged. See `docs/PROTOTYPE_CREDITS.md` for upstream provenance; the upstream scanned kouros and separate cinematic application are not loaded here.

The map and gallery are separate chunks. The gallery mounts when approached, pauses off-screen/hidden and renders at a 30 fps budget with capped pixel ratio. These changes reduce unnecessary work but do not establish a measured device frame rate.

## The four tools

The main site includes a permanent sculpture display, reachable through “The tools”.
On the map page the same sculptures represent Private Work, Government Work,
Court and Labour Law Office. The work desks filter the 96 fictional listings by
source; Court offers the balance and wage-reminder draft, while Labour Law Office
opens worker-support tools. These are demo destinations, not real office addresses. Choose Hermes’ winged staff, Hephaestus’ bronze tablet,
Themis’ balance, or Athena’s owl and scroll. Open the corresponding tool beside
the sculpture; the card face and balance respond to your local draft. Map landmark
buttons open the same tools without leaving the map page. “Check terms” on a map
job opens the balance and loads that example offer. All existing hall exhibits,
statues and scroll chapters remain in place. Motion pauses outside the viewport;
reduced-motion users can explore the sculptures without continuous animation.

## Verification boundary

The world checks cover deterministic throw/split/reverse/mouth alignment/landing and chapters. The domain checks include 112 assertions for date boundaries, pay intervals, invalid and unknown terms, units, persistence failures, local holds, job imports and vase UV picking. A production build checks integration.

Browser/computer testing was stopped at the user's request. Real-device layout, keyboard, camera/microphone, map-network and live 3D interaction acceptance remains separate from those code checks. See `docs/IMPLEMENTATION_STATUS.md` for the implementation ledger.

The obsolete scrolling Agora component and its styles have been removed. Draft
persistence remains available without routine saved-on-device status text.
