# Ergon

**The record of everyday work.** A concept site for *Beyond the Waiting Line*:
helping India's daily-wage workers find work nearby, show their skill
without a résumé, trust the terms before they commit, and reach what
they're owed.

*Ergon* (ἔργον) is Greek for work, and for the deed done.

## The connected world

Scroll up the hillside with Sisyphus, then follow the thrown chrome sphere as
it splits into 28 smaller boulders and falls into the amphora. The transition
is rendered in code and reverses with the scroll; no video is needed.

Inside the colonnaded hall, four chapters connect a 3D exhibit to a tool:
Hermes finds work, Hephaestus makes a downloadable PNG work card, Themis
weighs offer terms, and Athena explores schemes and prepares a downloadable
wage-reminder draft. The chapter rail skips directly between tools. Turn the
vase or use the worker strip to open records. In the final hall scene, tap
“Throw a day of work” to launch a physics boulder.

The hall opens into a scroll-driven descent onto a MapLibre street map.
Glass flowers represent example jobs around Andheri, Mumbai. Filter the list,
open full terms, drag your location marker, or opt into geolocation. Distances
and walking times are estimates. Geolocation never moves example jobs to
pretend they are local vacancies. Map tiles require a network connection;
the job list remains available when the map cannot load.

Saving example work and sending word are session-only demo interactions.
No employer is contacted. Wage reminders are local drafts and are not filed.

## Run

```bash
npm install
npm run dev
```

All people, jobs and rates are mock data. Scheme rules are summarised from
public scheme pages; check them at a Common Service Centre.

## Verification

`npm run check` verifies deterministic split/reversal/landing, projected mouth
alignment, chapter selection and offer presets. `npm run build` checks the
production bundle. These checks do not establish physical-device frame rate,
camera/microphone access, speech voices or live employer services.
