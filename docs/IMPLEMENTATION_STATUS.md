# Ergon implementation and verification ledger

Active scope: all IDs in EXISTING_FEATURE_IMPROVEMENT_PLAN.md, plus the user's request to preserve the existing Greek world, use reference artwork, repair vase picking and all controls, lower rendering cost, run on a distinct port, and investigate/integrate compatible work from the remote 3D-world branch.

Working checkout: /Users/sakshamtyagi/hackathon/rollingballui. Reference checkout: /Users/sakshamtyagi/testfolder/ergon. Reference assets are byte-identical to existing public/art and public/statue assets; use the originals rather than duplicating them.

## In progress
- NAV-01–08: direct task routes and accessible navigation, preserving voluntary story.
- JOB-01–15: shared fixed sample data, honest units/dates, persistent local actions, optional map.
- CARD-01–13: personal draft/media storage, preview, validation and reliable PNG.
- OFFER-01–09: correct interval/unknown/unit logic, source-job round trip and undo.
- RIGHTS-01–10: reviewed official sources, bounded suggestions, editable printable wage draft.
- UX-01–12: English/Hindi primary tasks, focus, speech, touch, reduced motion and camera cleanup.
- ENG-01–07: split graphics, stop hidden work, static fallbacks, versioned storage, docs and package identity.
- Vase click/drag distinction, artifact button hit testing, remote world integration.

## Verification boundary
Physical phone keyboard/frame-rate and assistive-technology user testing require actual hardware/user sessions. Browser emulation, domain checks, resource measurements and production build will be reported separately. No backend, live employment delivery or legal filing will be added.

## Scope correction and checkpoint — 15 October 2026

The user rejected a replacement task-page shell. That shell is removed from the active application. The continuous climb and vase remain the main experience; the map alone has its own `#map` destination, as explicitly requested. Tools remain embedded and may expand in place. The original ball renderer is unchanged.

- Checkpoint commit: `6ac4dc7`.
- Latest branch inspected: `origin/b_proto_v2`, `492288f` (added models). Its original procedural temple, trees, Hephaestus and Athena are incorporated in the existing gallery renderer. Its painted hero backdrop is used. No second cinematic renderer is mounted. Credits retained.
- Claude project history identifies this same checkout and its `art-src/v2` folder. Neither checkout's Git worktree list contains a separate Claude worktree. Existing artwork and source in this checkout were retained; no unrelated worktree was overwritten.
- Implemented: fixed sample dates/coordinates, shared job filters/actions, selected-job offer import, persistent local interest and expiring hold, 3D flower map with filtered picking, local card fields/IndexedDB evidence, photo validation, explicit skills/all languages, PNG preview/download, bounded offer verdicts/unknowns/preset restore, scheme sources/readiness, editable/printable local wage drafts, scoped scene fallbacks, keyboard record controls, gallery frame budget and bundle split.
- Still requires acceptance verification: real-device layouts and keyboards, actual canvas picking in the live gallery, voice/camera permissions, map network/context-loss behavior, complete translation/contrast audit and all reference-document acceptance rows. Implementation is not evidence that every acceptance case passed.
- Browser/computer testing stopped on the user's explicit request. `npm run check` and `node scripts/check-domain.mjs` pass (112 domain assertions). Production build passes. No claim of complete browser verification is made.

The earlier “In progress” list is the original audit scope, not a claim that all IDs are closed. In particular, NAV-04/NAV-07 use expansion within the existing gallery rather than a replacement application; JOB-13 defaults to the 3D map following the user's later explicit direction.
