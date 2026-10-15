# Ergon: existing-feature improvement specification

Status: proposed, not implemented. Prepared 15 October 2026 against commit `e487d6e`.

This document records the review findings and the exact outcomes expected from fixing them. It is an implementation brief, not a claim that the changes have been made. The reference experience was inspected in a desktop browser and at a 390 × 844 viewport; the production build passed. Physical-device, assistive-technology, slow-network and policy-content validation remain outstanding.

## 1. Scope contract

Improve the existing experience of finding work, showing skill, checking terms and understanding rights. Preserve the climb, vase, Greek identity, job list/map, work-card builder, voice/photo inputs, offer checker, scheme questionnaire and unpaid-wage tool.

“More powerful” means a person can understand, complete, revisit and trust an existing task with less effort. It does not mean adding more product areas.

Allowed improvements include correcting calculations, connecting existing tools, improving navigation, completing the outputs already promised by a tool, preserving local drafts, improving accessibility and making existing content readable in supported languages. These are depth improvements to existing features.

Explicitly excluded: accounts, backend services, live job ingestion, employer onboarding, a new posting workflow, chat, notifications, real reservations, actual application delivery, employer verification, payment collection, automated legal filing, automatic escalation, a work-attendance system, a new reviews system, AI matching, extra schemes, extra trades and additional media formats beyond what is needed to deliver the current outputs honestly.

Do not implement the unsupported employer promises merely to make every current link appear functional. Correct the links and wording within current scope. Do not create a separate application dashboard or extra product section to hold demonstration state.

Keep the project demonstrable as a frontend with sample data. Put the sample-data boundary beside consequential actions, not solely in the footer.

## 2. Product and design decisions

1. Workers' tasks receive direct, descriptive navigation. Mythology supplies identity and explanation.
2. Every primary action ends with a useful artifact or an accurately described state. No success message claims an external event that did not happen.
3. The story and tools use the same data and terms. A worker never retypes a selected job merely to check its offer.
4. Essential information and actions remain available without WebGL, dragging, hover, sound, camera or microphone.
5. On a phone, readable job results and tools take priority over scenery. The desktop exhibition retains its visual ambition.
6. A local draft belongs to the current browser, not to an account. Saving and export explain their limits plainly.

The exact balance between exhibition and service has not been confirmed. This plan retains the exhibition while making existing tasks independently accessible; it does not propose replacing the visual concept.

## 3. Issue register and expected fixes

Priorities: P1 = major confusion, incorrect result or incomplete primary task; P2 = meaningful usability/reliability improvement; P3 = polish/documentation. IDs are stable acceptance references.

### A. Navigation and storytelling

| ID | Priority | Current issue | Expected fix | Acceptance evidence |
|---|---|---|---|---|
| NAV-01 | P1 | Main labels are The climb / The hall / The agora. | Expose Find work / My work card / Check an offer / Get help. Retain the Greek names as secondary labels. Keep the story accessible through a subordinate link. | A first-time visitor can identify all four tasks without knowing a Greek term. |
| NAV-02 | P1 | Footer Find work points to the hall; Your record points to its beginning. | Link each existing worker action to the exact relevant tool or result area. Use one destination definition shared by header, footer and chapter links. | Every worker link lands on its named tool, with its heading clear of the fixed header. |
| NAV-03 | P1 | Hire nearby, Post fair terms, I need someone and Hire for tomorrow imply an employer flow that does not exist. | Replace unsupported actions with truthful existing destinations, e.g. View sample work record. Remove the unsupported Post fair terms link and employer call-to-action presentation; retain the existing record view. Do not build posting or hiring. | No control claims hiring or posting while opening worker job listings. |
| NAV-04 | P1 | Work-card and offer tools are reachable mainly through scroll chapters. | Give existing tools stable fragment destinations and an accessible direct view/expanded layout outside the scroll-timing dependency. Reuse the same components and state; do not maintain two separate implementations. | Direct links, reload at a fragment and browser Back restore the intended tool, including without animation. |
| NAV-05 | P1 | Phone navigation disappears and chapter controls show only Greek numerals. | Preserve access to all four task destinations on phones through a compact labelled navigation with an explicit accessible disclosure if needed. Chapter numerals may remain decorative. | At 320–430 px, every task is discoverable without guessing Α/Β/Γ/Δ. |
| NAV-06 | P2 | Long smooth jumps traverse unrelated scenes before arriving. | Make task jumps immediate or short; reserve cinematic motion for voluntary story traversal. Respect reduced motion and apply header-aware anchor spacing. | Find work reaches usable results promptly; reduced-motion navigation has no cinematic traversal. |
| NAV-07 | P2 | Hall forms use nested scrolling while the outer scroll changes chapters. | In direct task mode use normal document flow. Within story mode prevent chapter disappearance while actively editing; offer an explicit return to story rather than an automatic scroll jump. | Touch, keyboard and virtual-keyboard use never hide an active field or switch tools unintentionally. |
| NAV-08 | P2 | Story describes workers mainly through repeated loss and waiting. | Preserve the Sisyphus metaphor but balance hardship with skill, agency and concrete usefulness. Cut repeated statements once the problem is understood. | Each story segment adds meaning; practical task labels are visible without completing the story. |

### B. Find work: map, list, details and local demonstration actions

| ID | Priority | Current issue | Expected fix | Acceptance evidence |
|---|---|---|---|---|
| JOB-01 | P1 | Today filters `kind === 'day'`, including Tomorrow and Saturday. | Separate start date from duration/category. Use a fixed, visibly labelled demo reference date; filter Today and This week by actual start dates. Longer work refers to duration. Resolve expired sample dates consistently. | Today contains only that demo day's starts; week boundaries and longer-duration cases are tested. |
| JOB-02 | P1 | Job locations are generated around the user's GPS position while written addresses remain in Mumbai. | Keep sample jobs fixed at their sample coordinates. Explain the demo neighbourhood before requesting location. Location moves only the worker marker and distance origin. | Using location never moves a job or changes its written locality. Outside the sample area, the empty state explains why. |
| JOB-03 | P1 | Straight-line distance is presented as minutes on foot. | Label distance as approximate straight-line distance. Remove walk-time claims until route data exists; do not add routing. Describe radius as distance range, not guaranteed walking reach. | The same distance description appears in controls, list and detail; no route-time promise remains. |
| JOB-04 | P1 | Pay and duration exist, but payday is absent from details. | Add missing offer terms to the existing sample-job data: payment timing, numeric hours where meaningful, fees, written-terms status and verification provenance. Show Unknown when not supplied. Do not invent assurances from a verified flag. | A worker can see when payment is expected and what remains unknown before responding. |
| JOB-05 | P1 | Selected work is disconnected from the existing offer checker. | A Check these terms action opens that same checker prefilled from the selected job, retaining a short source summary. Unknown values stay unknown. Editing creates a local what-if, not an altered job listing. | Checker inputs match job detail; returning retains selected job and filters. |
| JOB-06 | P1 | Send word implies real delivery and promises a reply by evening. | Keep the existing interest action but label it Send demo interest. Confirm Saved on this device; no employer has been contacted. Persist job ID and timestamp locally, show the saved state in the existing list/detail, and allow undo there. No dashboard, inbox or fabricated response progression. | Reload preserves interest; repeated clicks do not duplicate it; undo restores the action; wording never claims delivery. |
| JOB-07 | P1 | Hold says Held for 30 min without any timer or reservation. | Convert the existing hold interaction into an explicitly local demo hold with an expiry timestamp and visible remaining time. Explain it does not reserve a real place. Keep one active hold, matching current selection semantics; replacing one makes that clear. | Reload and background time do not reset the clock. Expired holds clear. Release works. |
| JOB-08 | P1 | Verified employer and hire counts appear authoritative. | Label these as sample verification/history beside the detail. Explain the meaning of the sample badge; do not imply live checks. | Verification is never the only reason to call an offer safe, and the demo label is visible before interest. |
| JOB-09 | P2 | Some trades are hidden in a horizontal row with no strong discovery cue. | Preserve all eight trades; show a clear overflow cue or a labelled trade selector. Keep active filters and result count visible. Expose selected state semantically. | Every trade can be discovered and selected with touch and keyboard without accidental page dragging. |
| JOB-10 | P2 | Empty results tell people to walk further. | Explain which filters removed results and offer explicit Reset filters / Increase range within current controls. For out-of-area location, offer Return to demo neighbourhood. Do not imply jobs exist just beyond the boundary. | Zero results have an actionable recovery and preserve the user's chosen origin until explicitly reset. |
| JOB-11 | P2 | Map failure UI covers construction failures; later errors only log warnings. | Separate map loading, ready and unavailable states. Handle style/network/WebGL failures with a concise message and usable list; include a deliberate retry action. | Blocking map resources still permits filtering and reading offers; no endless blank map. |
| JOB-12 | P2 | Map picking loops through all jobs, including filtered-out ones. | Derive list visibility, marker availability and hit testing from one filtered dataset. Clear or retain a selected detail only by an explicit consistent rule when filters change. | Hidden jobs cannot unexpectedly open from map clicks; list and marker counts agree. |
| JOB-13 | P2 | Mobile puts 62vh of map before the results. | Default to the existing list on phones; allow switching to the existing map with shared selection/filter state. Do not introduce a second search system. | A suitable job and its pay are visible without first scrolling through scenery. |
| JOB-14 | P2 | Detail changes do not explicitly manage focus or announce counts. | Move focus to the detail heading after opening, restore it to the originating row on Back, and politely announce settled result counts. Preserve list position. | Keyboard users can open, read and return without starting at the page top. |
| JOB-15 | P2 | Small hall job preview and full map can disagree about holds, distances and origin. | Use shared sample-job selectors and one local interaction store for both views. Preserve distinct display layouts without duplicating rules. | A hold or interest state has the same meaning in every existing job presentation. |

### C. Work card: selection, evidence, preview and download

| ID | Priority | Current issue | Expected fix | Acceptance evidence |
|---|---|---|---|---|
| CARD-01 | P1 | Reload loses profile edits and evidence. | Save structured draft fields locally; use IndexedDB for photo/audio blobs. Display Saved on this device only after a successful write. Handle unavailable storage without blocking editing or download. | Reload restores fields/media; quota failure preserves the in-memory draft and offers honest feedback. |
| CARD-02 | P1 | A sample person's name and experience are prefilled as if they were the user. | Begin with clearly labelled sample data or empty personal fields. Provide an explicit use-sample path for demonstration. Never silently export a sample identity as the user's. | Preview/download makes it clear whose information it contains. |
| CARD-03 | P1 | PNG says VOICE INTRO ✓ without a playable introduction. | Preserve local recording/playback, but remove the voice badge from the PNG. Tell the user before downloading that audio stays in this browser and is not part of the image. No audio hosting, QR service or new export format. | A card recipient sees no implied playable audio that the image cannot deliver. |
| CARD-04 | P1 | PNG promises vouches after jobs though no vouching system exists. | Remove unsupported vouch promises from generated personal cards and accompanying copy. Distinguish sample records' fictional vouches from the user's self-described skill. | Download contains no invented endorsements or implied automatic work history. |
| CARD-05 | P2 | Last three language options are excluded by `slice(0, 8)`. | Render all existing LANGS values, grouped or wrapped clearly. Separate spoken languages on a card from interface language. | English, Urdu and Odia are selectable and survive save/reload/export. |
| CARD-06 | P2 | Changing trade silently selects two new skills. | Keep current-trade selections explicit. Do not invent capabilities for the user; restore previously chosen skills when revisiting a trade, or clearly request fresh selection. | A trade switch never creates a claim the user did not select. |
| CARD-07 | P2 | Card is primarily a turning 3D object. | Provide an ordinary readable preview of the same generated card beside the existing download action; 3D remains an optional presentation. Announce updates without repeatedly reading the whole card. | The card can be checked at phone width and without WebGL before download. |
| CARD-08 | P2 | Long names, many languages and skills can overrun or be silently truncated. | Define bounds and wrap rules for each field, including Devanagari. Keep meaningful values readable; explicitly tell users when the image cannot fit a selection. Use actual intended font metrics and wait for assets before export. | Long supported-script names and all languages do not overlap the illustration, seal or photos. |
| CARD-09 | P2 | Photo upload has no useful invalid-file/decode/size feedback. | Validate file type, decode and reasonable byte/pixel limits; resize for the existing output. Enforce the existing three-photo cap before adding. Preserve valid photos if another fails. | Corrupt files and oversized inputs get specific recovery messages; three photos remain removable. |
| CARD-10 | P2 | Removing a photo is immediate; image/audio object URLs can accumulate. | Provide undo for removal and release stale URLs after references are gone. Stop microphone tracks and timers on cancellation/unmount/error. Show recording duration and the existing 12-second limit before starting. | No recording continues after leaving; repeated replace/remove cycles do not retain obsolete media. |
| CARD-11 | P2 | Microphone denial and unsupported recording are poorly explained. | Show recording as optional, with clear unavailable/denied/retry states. Never block card completion. Do not request permission until the user chooses recording. | A person refusing permission can still finish and download the card. |
| CARD-12 | P2 | Blank names, pending images and failed `toBlob` are not handled. | Validate required fields before export; distinguish preparing, ready and failed states. Guard null blobs, sanitize filenames, preserve draft and permit retry. | No blank/partial artifact is reported as successfully downloaded; a retry does not erase inputs. |
| CARD-13 | P2 | “No forms” conflicts with a multi-control form. | Use honest copy: No résumé or certificate needed. Explain required versus optional inputs; group trade/name, skill/experience, languages/evidence. | A first-time worker understands what is needed and can finish without photos or voice. |

### D. Offer checker

| ID | Priority | Current issue | Expected fix | Acceptance evidence |
|---|---|---|---|---|
| OFFER-01 | P1 | Pay branch calls some above-reference values a little under the local rate. | Define ordered, explicit intervals with correct below/near/above wording and boundary tests. Separate sample benchmark comparison from scam certainty. | All threshold values and values just below/above each boundary receive accurate descriptions. |
| OFFER-02 | P1 | Mock rates lead to authoritative Fair offer wording. | Display Sample benchmark, not a legal minimum. Use Clearer terms / Questions to ask / Serious warning as bounded conclusions. Explain unresolved terms; no guarantee of safety or eventual payment. | Verdict text states what was checked and what remains unknown. |
| OFFER-03 | P1 | Daily benchmark comparison cannot represent monthly, shift or whole-job pay honestly. | Preserve original pay amount and unit from a selected job. Compare only compatible known units; if conversion requires assumptions, show comparison unavailable rather than silently normalizing. | A monthly listing is never compared directly with a daily rate. |
| OFFER-04 | P1 | Numeric inputs allow empty/negative/non-finite values into conclusions. | Keep editable input text separate from validated values. Require valid positive pay and bounded hours; fee can be zero, not negative. Show inline guidance and suppress definitive verdict until valid. | Clearing a field, pasting invalid input or entering a negative value cannot produce Fair offer. |
| OFFER-05 | P1 | Address/written/verified toggles treat yes/no as complete knowledge. | Support unknown for imported missing terms; use plain questions. Explain that user-selected verification is an assumption, not a verification action. Treat missing essential terms as questions to resolve. | Unknown data is not converted to a reassuring default. |
| OFFER-06 | P1 | Advice makes categorical overtime/legal claims without context. | Audit each policy-sensitive statement against current official sources during implementation; record jurisdiction, applicability, source and checked date. Until verified, remove categorical legal wording and give general questions to ask. | No numeric legal entitlement is published solely because it existed in the old rules file. |
| OFFER-07 | P2 | Scales can imply a serious warning is cancelled by good terms. | Keep hard warnings prominent regardless of total weights. Use the scales as explanation, with text as the actual decision aid. Make each result state the concern and the next question/action. | An upfront-fee warning cannot visually or verbally disappear behind a mostly positive score. |
| OFFER-08 | P2 | Presets overwrite edits without indicating the change. | Label presets as sample offers, show which one is loaded, and protect a changed draft through lightweight undo/restore. | Trying a sample does not irretrievably discard an entered offer. |
| OFFER-09 | P2 | Current detail must be remembered when moving to checker. | Keep the selected job's title, pay/unit and missing terms visible; preserve local checker edits on return. | Worker can interpret the result without switching back to recall the offer. |

### E. Schemes and unpaid wages

| ID | Priority | Current issue | Expected fix | Acceptance evidence |
|---|---|---|---|---|
| RIGHTS-01 | P1 | Simplified predicates appear to establish scheme eligibility. | Keep the same scheme catalogue; label results Potentially relevant. Show why a result appeared, missing conditions and an official next step. Never promise qualification from this questionnaire. | Low income alone is not represented as confirmed PM-JAY eligibility, for example. |
| RIGHTS-02 | P1 | Scheme rules, amounts, prerequisites and contacts lack adjacent provenance. | Verify against official sources before implementation, store source URLs and last-checked dates with each rule, and show concise source links. Distinguish mandatory documents from commonly requested ones. | Each published policy-sensitive result is traceable; uncertain content is explicitly unresolved. |
| RIGHTS-03 | P2 | Work/state-dependent rules are flattened into yes/no matches. | Without adding questionnaire fields, explicitly list jurisdiction/work-history checks that remain unresolved. Do not add a national eligibility engine. | Construction-board results state that state and required work proof still need checking. |
| RIGHTS-04 | P2 | Aadhaar/bank selections produce broad Get Aadhaar first advice regardless of context. | Tie preparation advice to the displayed scheme and its verified rules. Separate matching from readiness to apply. | Missing one document does not imply all assistance is unavailable. |
| RIGHTS-05 | P2 | Scheme results form a long wall of prose. | Use compact existing result rows: purpose, why relevant, documents, where next. Expand supporting detail on demand; render official destinations as actual links. | A phone user can identify the next step without reading every scheme paragraph. |
| RIGHTS-06 | P1 | Claim tool asserts check-ins, reminder delivery and automatic escalation that do not exist. | Remove those assertions. State that this tool prepares a local draft from user-entered facts; nothing is sent or filed. Keep a manual, source-verified next-step checklist. | No success state or instruction claims an employer/department has received anything. |
| RIGHTS-07 | P1 | Prepare my claim only renders a one-line total. | Complete the promised preparation as an editable plain-language summary of employer, days, rate and total; show its assumptions and evidence checklist. Allow browser print/save from the same tool. No new legal-service workflow. | The worker can take away a readable draft containing the entered facts and clear filing limits. |
| RIGHTS-08 | P1 | Claim inputs imply certainty and do not validate amounts. | Label total as an estimate from days × agreed daily rate, not an adjudicated entitlement. Validate employer, positive rate and existing day bounds. Explain that partial payments/deductions are not captured; don't add accounting features. | Invalid/blank values cannot create a ready claim; limitations appear in its output. |
| RIGHTS-09 | P2 | Preparing and editing are disconnected; draft disappears on reload. | Save local claim inputs, provide Review draft → Edit → Print, and invalidate ready state whenever facts change. | Printed summary matches current inputs; reload restores draft without implying it was filed. |
| RIGHTS-10 | P2 | PF/ESIC shorthand and assumptions may confuse unfamiliar users. | Expand the question in plain language, add Don't know, and treat uncertainty as something to check. Keep the existing questionnaire scope. | A person uncertain about coverage can continue without making a false answer. |

### F. Language, reading, accessibility and visual refinement

| ID | Priority | Current issue | Expected fix | Acceptance evidence |
|---|---|---|---|---|
| UX-01 | P1 | Footer implies six-language service but lists static text. | Fully support English and Hindi for existing primary tasks using a shared string catalogue and visible language control. List other languages only as work-card language choices, not available UI translations. No expansion to six UI languages. | Switching language updates navigation, controls, errors, results and completion messages without losing data. |
| UX-02 | P1 | Spoken summaries omit terms and mix untranslated start labels. | Generate speech from the same translated display data: trade, pay/unit, start, hours, duration, approximate distance, payment timing and warnings. Preserve user control over playback. | Spoken and visible offer details agree in both supported languages. |
| UX-03 | P2 | Speech support/voice availability and cleanup are incomplete. | Handle unavailable voice, load/error/end events, single active playback, stopped state and component cleanup. Keep visible text as the reliable equivalent. | Listen never remains stuck on; navigation stops stale speech; absent Hindi voices are explained honestly. |
| UX-04 | P1 | Vase records rely on pointer hit testing in an aria-hidden canvas. | Provide ordinary labelled controls for the same existing sample records and a text equivalent for each selected record. Preserve 3D selection as an alternative. | All current records can be opened and closed with keyboard and screen reader without hit testing. |
| UX-05 | P2 | Map role/application and visual active states may not convey usable semantics. | Keep map exploration optional; label filter groups and pressed/current states. Make result rows and detail controls the accessible primary path. Audit whether application role is necessary. | Keyboard-only discovery, filtering and detail reading are complete without the map. |
| UX-06 | P2 | Several controls are 28–34 px; metadata often 11–13 px. | Aim for 44 × 44 CSS px interaction areas, comfortably readable body/control text and separated secondary metadata. Preserve density through hierarchy rather than shrinking touch targets. | Phone actions do not overlap; 200% zoom retains content and controls. |
| UX-07 | P2 | Translucent panels, map detail and particles compete with text. | Use sufficiently opaque reading surfaces; reduce ornament behind active forms. Measure actual contrast for text, focus and states. Keep clay/cream/slip palette and Greek motifs. | Text meets agreed contrast targets in its worst background state; focus stays visible. |
| UX-08 | P2 | Motion accommodations exist in parts but not across the full task experience. | Audit every animation, map transition, auto-rotation, particle effect and scroll reveal. Reduced motion exposes all tools immediately and suppresses nonessential movement. Keep a static meaningful composition. | OS reduced-motion preference does not hide information or require the cinematic path. |
| UX-09 | P2 | Sticky panels can be obscured by phone keyboards and safe areas. | Use available viewport space and safe-area padding, keep focused fields visible, and let direct task views scroll naturally. | Real-device keyboard use permits reaching validation messages and submit/download actions. |
| UX-10 | P2 | Live changes, drawer closure and error focus are inconsistent. | Define focus entry/return for tool/detail/record transitions, Escape for dismissible overlays, polite status announcements and field-linked errors. Avoid announcing every animation or keypress. | A keyboard/screen-reader walkthrough completes every existing task with predictable focus. |
| UX-11 | P3 | Competing hero scenery and decorative microcopy dilute action hierarchy. | Preserve the composition but keep Find work visually dominant, secondary story action clearly subordinate and body copy on a stable readable area. De-emphasize Reflect me. | First-time visitor identifies the primary action quickly; scenery does not cross essential text. |
| UX-12 | P2 | Camera reflection is peripheral and may fail ambiguously. | Keep it optional and subordinate; explain local use before permission, disable repeat requests while pending, stop tracks on all failure/unmount paths and distinguish denied/unavailable states. | No permission request on load; refusal has no effect on work tools; turning off releases the camera. |

### G. Reliability, performance and project accuracy

| ID | Priority | Current issue | Expected fix | Acceptance evidence |
|---|---|---|---|---|
| ENG-01 | P2 | Main build produces ~4.76 MB minified JS / ~1.55 MB gzip. | Split map and exhibition dependencies; load them when approached or requested. Render useful DOM content first. Measure resulting entry transfer and readiness on a documented device/network profile. | A worker can access text/results before downloading or initializing the entire exhibition. Report measured before/after values, not guessed speed claims. |
| ENG-02 | P2 | Multiple render loops and effects can consume resources off screen. | Audit active-state gates, map repaint calls, texture resolution, render targets and disposal. Pause off-screen/hidden-tab decorative work without freezing active inputs. Avoid high-performance GPU preference for essential text tasks. | Profile idle, story, map and hidden-tab states; no persistent unnecessary redraw or resource growth. |
| ENG-03 | P1 | Essential UI lacks a complete fallback if decorative WebGL initialization fails. | Isolate scene failures behind error boundaries and show static artwork; preserve the existing tools and list. Keep map failure separate from exhibition failure. | Disabled/lost WebGL does not prevent card fields, offer checking or rights content. |
| ENG-04 | P2 | Local persistence could falsely imply secure account storage. | Use versioned, bounded browser storage; distinguish saved, saving and unavailable states. Provide a clear way to clear this device's drafts within the existing tools. Do not store actual Aadhaar numbers or introduce identity fields. | Corrupt/old/quota-limited data recovers safely; shared-device users understand where drafts remain. |
| ENG-05 | P2 | Unvalidated inputs and independent state can diverge across tool presentations. | Centralize job selectors, units, local draft schemas and domain calculations in small modules. Keep scene animation state separate from user facts. | One user edit produces consistent DOM, generated artifact and optional 3D representation. |
| ENG-06 | P3 | README advertises absent Painted toggle, outdated chapter structure and forge interactions. | Rewrite documentation to match final actual controls, current four tools, mock-data boundaries, local saving and output limits. Retain artwork attribution where accurate. | A new reviewer can reproduce the demo using README without searching for missing controls. |
| ENG-07 | P3 | Package name rollingballui obscures project identity. | Rename package metadata to Ergon consistently when implementing, including lock metadata; do not upgrade dependencies as part of this work. | Build/install commands remain unchanged and package identity matches the project. |

## 4. Exact completion contracts

### Find work

Choose a trade/time/range → read matching sample jobs → open an offer → inspect terms or open the existing checker → save demo interest or use a demo hold → see an accurate locally persisted state → undo/release if desired.

The local interest action uses `idle → saved locally → removed`. It never pretends to progress through employer review, acceptance or reply. A hold uses `none → held until timestamp → expired/released`; browser suspension does not pause real elapsed time. Do not reserve real work or contact anyone.

### Work card

Choose trade → enter name/experience and explicit skills → optionally add languages/photos/voice → inspect a readable preview → download the PNG. Fields and local evidence survive reload. The exported image includes only what it actually contains: no playable-voice badge, invented vouches or unsupported automatic history.

Use `editing → preparing preview → ready → preparing image → download initiated`, with specific recoverable errors. Do not report a file as safely saved merely because the browser download was initiated. Optional evidence never blocks a basic card.

### Offer checker

Open manually or from a selected sample job → inspect known and unknown terms → edit assumptions → read explicit concerns and questions → return to the same offer. A source job remains unchanged. Presets are labelled demonstrations. A total or scale never overrides a hard warning.

### Schemes and unpaid wages

Schemes: answer the existing questions → see potentially relevant schemes → understand why, what remains to check, what to bring and the official next destination.

Wages: enter the existing employer/day/rate facts → review estimated amount and limitations → edit a readable draft → print/save it manually. Nothing is delivered, filed or automatically escalated. No attendance record is fabricated.

## 5. Content and state consistency rules

- One sample-data indicator at the relevant decision surface, repeated in consequential completion/output states. Avoid a wall of disclaimers.
- Use consistent action language: View offer, Check these terms, Send demo interest, Hold in this demo, Download work card, Review wage draft.
- Preserve units everywhere. A job amount is not daily income unless the listing says so.
- Unknown is distinct from No, and missing is distinct from zero.
- Sample-person facts and the user's own facts must never mix silently.
- Local saving is not an account, synchronization, delivery, verification or filing.
- Use one dataset to drive visible text, spoken summaries, calculations and optional visuals.
- Translation updates presentation, never stored facts or selections.
- A denied device permission leaves a complete non-permission path.

## 6. Implementation sequence

1. **Truth and correctness:** JOB-01–08, CARD-03–04, OFFER-01–06, RIGHTS-01–02/06–08. Remove unsupported external promises immediately; establish sample dates, units and unknown states.
2. **Access and continuity:** NAV-01–07, JOB-14–15, CARD-01–02, RIGHTS-09, ENG-04–05. Give each existing tool a stable home and a shared local draft.
3. **Complete current outputs:** CARD-05–13, OFFER-07–09, RIGHTS-03–05/10. Finish preview/export, explain checker results and deliver a usable wage draft.
4. **Phone/language/accessibility:** JOB-09–13 and UX-01–12. Establish readable task-first layouts with keyboard, language and reduced-motion parity.
5. **Performance and final accuracy:** NAV-08 and ENG-01–03/06–07. Profile, isolate decorative failures, update docs and polish the existing visual system.

The sequence is dependency-aware, not permission to defer accessibility or honest copy until the end. Build basic accessibility into each changed component and validate it comprehensively in phase 4.

## 7. Verification plan

Use targeted tests for domain correctness and manual interaction checks for presentation. Do not add tests that only restate component markup.

| Area | Required checks |
|---|---|
| Dates/filtering | Demo Today/week boundaries, duration independence, midnight/timezone, expired samples, all trades and empty results. |
| Distance/location | Known coordinate pair; jobs never relocate; blocked/unsupported/timeout location; out-of-area state; no walking-route claim. |
| Local actions | Duplicate interest, undo, hold replacement/expiry, reload, background tab, unavailable/corrupt storage. |
| Card | Blank/long/Hindi name, zero experience, all language choices, trade changes, no optional media, three photos, corrupt/oversized files, recording denial/timeout/navigation cleanup, export asset readiness and failure. |
| Checker | Each pay interval and boundary, invalid/blank/negative values, unknown terms, incompatible pay units, preset undo, serious-warning precedence, selected-job round trip. |
| Rights | Every questionnaire boundary, unknown coverage, potential-match wording, source review, invalid claim facts, edit-after-ready, output matches current facts, no delivery/filing claims. |
| Navigation | Every header/footer/record link, direct fragments, reload, Back, focus restoration, task use without completing story. |
| Accessibility | Keyboard-only primary tasks, screen reader labels/status/errors, zoom 200%, 320 px width, contrast measurement, reduced motion, no-WebGL fallback. |
| Devices | Desktop plus phone portrait/landscape; real phone keyboard/safe-area checks; touch map/list controls. Viewport emulation is not physical-device proof. |
| Failure/performance | Cold load on a documented constrained network, map style failure, offline-after-load, WebGL context loss, storage quota, repeated media edits, hidden-tab CPU and scene disposal. |
| Build/docs | Clean install, production build and production preview; README matches final implemented behaviour and scope. |

Record pass/fail evidence against each issue ID. Build success alone does not prove UX completion. Policy verification requires current official sources; this document does not certify the existing rates, eligibility rules or legal advice.

## 8. Assignment demonstration and acceptance

Demonstrate the same four features, without adding a fifth:

1. A worker chooses a trade, sees only jobs matching the selected date/range, checks full terms and saves demo interest. Reload preserves the local result.
2. The worker creates a personal card with explicit skills, previews it and downloads an accurate PNG.
3. The same selected job opens in the offer checker with the correct units and unknowns. Changing a risky term changes the explanation predictably.
4. The rights tool explains potentially relevant schemes with sources; the unpaid-wage branch produces a readable, editable, printable draft with an estimated total.

Assess design through clarity, hierarchy, consistency and retained identity; assess implementation through correct state, validation, recovery and connected tools; assess usefulness through whether the worker reaches these tangible outcomes. Do not fabricate a numerical marking prediction without the actual rubric.

## 9. Definition of done

- Every issue above is implemented and verified, or explicitly recorded as unresolved with a reason and user impact.
- No new product feature, external service or unsupported employer flow has been introduced.
- All four existing tasks have clear entry, valid input, useful result, edit/back behaviour and recoverable errors.
- The page never claims real delivery, reservation, verification, eligibility determination or legal filing.
- Greek identity and the voluntary exhibition remain coherent and visually distinctive.
- Task completion is possible on a phone, with keyboard, in reduced motion and without decorative WebGL.
- Current documentation distinguishes implementation proof from browser/device/policy proof.

## 10. Change tracking for implementation

For each implementation batch, record: issue IDs addressed; files changed; final behaviour; checks run and results; known limitations; and any proposed scope deviation. A deviation must be named before implementation, not smuggled in as polish. This planning document itself changes no application behaviour.
