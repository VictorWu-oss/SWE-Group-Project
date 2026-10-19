# ToiletTracker project roadmap

## Goal and planning assumptions

This roadmap takes the current repository to a verified, usable Cal Poly SLO
bathroom-finder release, then provides a decision-gated path for the additional
stories in [`user-stories.md`](./user-stories.md).

Plan for four people over about four focused weeks. This is a planning estimate,
not a promised date; adjust it after the first working integration. Work is
organized so each person can make progress asynchronously against agreed
interfaces and report blockers without waiting for a meeting.

The current release target is the mobile experience described in
[`README.md`](./README.md): campus bathroom search, a 2D map and nearby list,
details, and community cleanliness/busyness ratings. The backend and mobile
rating flow already exist. The checked-in locations are demo records with
unverified coordinates, so the app is not ready to represent real campus
locations until those are verified.

Do not silently expand the release scope. The project context has open
decisions about sign-in, rating presentation, rating freshness, comments,
accessibility data, and location verification. The README describes an
account-free flow and the implementation uses 1–5 cleanliness and
Low/Medium/High busyness ratings; confirm these as team decisions before
calling them final. No unconfirmed privacy, moderation, or campus-access policy
should be invented.

## Team lanes

Assign people to lanes at kickoff. A person can help another lane by opening a
small PR or documenting a finding, but keep one clear owner for each deliverable.

| Person | Primary lane | Owns |
|---|---|---|
| A — Mobile | Mobile product | 2D map, location/search/list, details and rating UX, accessibility of controls, device verification |
| B — Backend | API and data | SQLite schema/seed process, API contract, validation, persistence, backend tests and error handling |
| C — Product and campus data | Requirements and data quality | Stakeholder decisions, bathroom verification workflow, verified seed records, story/acceptance criteria and demo script |
| D — Quality and delivery | Integration and release | Test plan, regression/integration checks, usability checks, build/run documentation, release checklist and risk tracking |

Person D should make small implementation contributions where useful (for
example, focused tests or a separate web prototype only if approved), rather
than becoming a catch-all for unfinished work.

## Work that can start asynchronously

Start these in parallel during kickoff; use a short written handoff rather than
waiting for everyone to finish the same task:

1. **A — Mobile audit:** run the existing app, list reproducible UX gaps, and
   check map, search, permission-denied fallback, detail sheet, and review
   submission. Record device/OS and steps to reproduce.
2. **B — API audit:** run the API tests, document current routes and JSON
   shapes, and identify missing validation/error cases. Do not change response
   shapes without publishing a proposed contract first.
3. **C — Decisions and data:** ask the product stakeholder to resolve the
   release decisions below; in parallel, inventory candidate campus data and
   record its source and verification status. Do not replace demo coordinates
   with guesses.
4. **D — Test/release audit:** run `npm test`, capture baseline failures, draft
   a device/manual test matrix, and identify the cleanest end-to-end demo path.

### Shared async handoff rules

- Keep API and app changes in separate, reviewable PRs; use fixtures or mocks
  matching the agreed API response while the other lane is in progress.
- B publishes any proposed API/schema changes in the PR description before A
  depends on them. A publishes any proposed screen/interaction changes with
  acceptance criteria before implementation.
- Each async update states: completed, next, blocked-by (if any), and the PR or
  test evidence. Raise a blocker when it appears instead of waiting for the
  next checkpoint.
- Integrate at least twice each week. Do not hold up independent data research,
  test authoring, or UX work on backend implementation.

## Four-week sequence

### Week 1 — Agree scope and stabilize the existing MVP

**Goal:** have an agreed release contract, verified backlog, and reliable local
setup.

- **A:** run the mobile flow against the local API; fix high-impact defects in
  search, selected bathroom/details, review submission, loading/error states,
  and location-denied fallback.
- **B:** document and test the existing health, list/detail, and review routes;
  confirm server validation, database behavior, review uniqueness, and
  user-visible error responses.
- **C:** get decisions on MVP rating scale, whether account-free submission is
  the intended policy, user-reported rating language, data verification owner,
  and which bathrooms are appropriate to include. Turn decisions into
  Given/When/Then acceptance criteria.
- **D:** establish a requirement-to-test checklist; baseline the root
  `npm test` command; add/organize focused integration or manual checks for
  gaps not covered by current backend tests.
- **Together:** agree that this release is mobile-first. Decide whether the
  React web package is a deliverable or an unused starter; leave it out of
  scope unless a stakeholder explicitly requests a web app.

**Gate:** named MVP scope and measurable acceptance criteria are written down;
all four can run the documented API/mobile setup; demo data is clearly labeled.

### Week 2 — Complete core search, map, and review experience

**Goal:** core tasks work end-to-end on the agreed target devices.

- **A:** complete and polish the 2D map, nearby list, name/building search,
  distance ordering where location is available, optional-location fallback,
  bathroom detail sheet, and review form.
- **B:** close API contract gaps revealed in Week 1; preserve reliable SQLite
  persistence and validate malformed, duplicate, and unknown-bathroom
  submissions.
- **C:** provide a verified set of bathroom records and source/verification
  notes; if campus verification is not available, prepare a clearly labeled
  demo dataset and keep real-campus claims out of release materials.
- **D:** independently test the API and app against agreed acceptance
  criteria, including empty/loading/error states and retry behavior; report
  actionable defects with reproduction steps.

**Async pairing:** A can build against the current typed API client while B
implements backend tests. C can validate bathroom records independently of
either implementation. D can prepare fixtures and test cases before features
are merged.

**Gate:** one user can find a bathroom, inspect reported information, submit a
rating, and see the updated aggregate without a developer-only workaround.

### Week 3 — Data verification, usability, and story decisions

**Goal:** the release is credible and the team makes explicit choices about
the remaining user stories.

- **A:** verify map usability on a physical phone and supported simulator;
  check permission prompts, accessible labels/controls, text sizing, and
  outdoor/poor-network behavior.
- **B:** check data import/seed repeatability and that updating bathroom
  metadata does not erase community reports. Add only fields required by
  approved stories.
- **C:** complete campus data verification or document why it is unavailable;
  validate the app’s bathroom eligibility with the stakeholder; map every
  additional story to a decision, data owner, and acceptance criterion.
- **D:** run end-to-end regression, check error and no-data cases, review
  user-facing language for clarity about subjective/community reports, and
  prepare the demo script.
- **Together:** decide which additional stories belong in the next increment.
  Do not implement stories that require unresolved access, privacy, moderation,
  data, or safety policy.

**Gate:** release locations are verified (or the release is explicitly a demo);
all reported rating information is presented as user-reported, not live or
verified occupancy.

### Week 4 — Stabilize and release the agreed scope

**Goal:** the team can install, run, demonstrate, and hand off the release.

- **A:** fix prioritized mobile defects and verify the release build and
  physical-device flow against the API over the intended network.
- **B:** run the complete backend suite on a clean local database; confirm
  startup, health check, seed behavior, and persistence across restart.
- **C:** sign off the bathroom dataset, acceptance criteria, and scope notes;
  prepare a concise walkthrough of known limitations.
- **D:** run the full root check, verify install/start instructions from a clean
  checkout, and assemble final regression results and release notes.
- **Together:** triage remaining issues as release blockers, accepted
  limitations, or future work; tag/submit the agreed course/project
  deliverable only after the Definition of Done below is met.

If the agreed scope is not stable by the end of Week 3, use Week 4 for the MVP
and move optional features to a later increment instead of reducing test time.

## Later-increment backlog (decision-gated)

These appear in [`user-stories.md`](./user-stories.md), but they are not all
supported by current confirmed requirements or data. Resolve the questions
below before sizing or implementation. Keep each approved feature behind its
own acceptance criteria and add API/data, mobile UI, and tests together.

| Story area | Prerequisite decision/data |
|---|---|
| Accessibility, step-free route, floor, entrance | Verified accessibility attributes and routing source; confirm who maintains them |
| Menstrual products, baby-changing, hooks/shelves, stall types | Confirm which attributes are in scope and obtain a reliable per-bathroom source |
| Staff-only/reserved bathrooms | Confirm audience and campus access policy before showing restricted locations |
| Opening hours | Reliable source and owner for updates; define how closed/unknown hours are represented |
| Maintenance issue reports | Define what gets reported, who receives it, whether comments are allowed, and the required abuse/privacy handling |
| Directions and route safety | Choose/approve routing and safety data sources; specify what route information is supportable |
| Rating comments or moderation | Decide whether comments exist and establish moderation/privacy requirements before collecting text |
| Rating freshness/expiry | Agree how busyness ages and how stale reports are displayed; current UI shows a timestamp and explicitly says it is not live |
| 3D map or chat | Confirm these later milestones are still desired, then size separately; neither is required for the current MVP |
| React web app | Confirm that a browser app is a deliverable; the current React frontend is a starter template, not a product feature |

## Definition of Done

- The approved scope and acceptance criteria are traceable to tests or a
  documented manual check.
- `npm test` passes from the repository root; any environment-only manual
  checks and their results are recorded.
- The API starts, responds to `/api/health`, and the documented seed flow is
  repeatable without deleting existing ratings.
- On an agreed phone/simulator, a user can search/list bathrooms, view the map
  and details, submit the supported review, and understand loading, failure,
  location-denied, no-review, and demo-data states.
- No unverified coordinates or bathroom attributes are presented as confirmed
  campus facts. If only demo records are available, the release is labeled as
  a demo and is not represented as ready for campus navigation.
- User-facing claims do not imply that reports are verified, live occupancy,
  or a guaranteed one-person-one-review system.
- Setup, known limitations, test evidence, and ownership for verified campus
  data are handed off in the repository documentation.

## Key risks and responses

| Risk | Response |
|---|---|
| Bathroom location data cannot be verified in time | Keep demo labels and limit the release/demo claim; do not guess coordinates |
| Open product decisions stall implementation | Record the owner and answer needed in Week 1; implement only the already-agreed MVP meanwhile |
| Mobile and API work drift apart | Publish contract changes first; integrate twice weekly and keep typed fixtures aligned |
| Physical device cannot reach local API or map tiles | Test the documented LAN setup early; retain and test the no-location fallback |
| Optional stories overwhelm the core release | Gate later-increment work on explicit decisions and preserve Week 4 for regression and handoff |
