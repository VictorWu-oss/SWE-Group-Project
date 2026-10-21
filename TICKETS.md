# ToiletTracker implementation tickets

## Team assignment

| Team member | Product slice |
|---|---|
| Justin | Search, filters, nearby list, and bathroom details |
| Victor | Map, location, directions, and accessibility |
| Gavin | Ratings, reviews, and maintenance reports |
| Aaliyah | Web foundation, shared infrastructure, integration, and release |

Every ticket requires a small PR, a short async update, and review from at
least one teammate. For any customer-facing feature, the owner must verify the
web UI, mobile UI, API behavior, and its test evidence.

---

## Week 1 — Foundation

### TT-101 — Justin — Define and scaffold bathroom discovery

**Purpose:** establish the data contract and initial screens for finding a
bathroom.

**Tasks**

- Inspect the existing bathroom list and detail API response.
- Propose the agreed searchable/filterable fields: name, building, and approved
  attributes only.
- Write the request/response examples in `docs/api-contract.md`.
- Create fixture data for normal results, no results, and a bathroom with
  missing optional fields.
- Build the initial web search field, bathroom-result list, and details view.
- Compare the existing mobile discovery flow with the web contract and record
  mobile gaps in the PR.
- Add backend tests for a normal list response and an empty search/filter result.

**Validation**

- Web UI can render fixtures without the API running.
- API tests pass for list and no-result cases.
- A teammate can understand the contract without reading implementation code.

**Handoff:** publish API field names and fixture shapes for Victor, Gavin, and
Aaliyah before beginning Week 2.

---

### TT-102 — Victor — Establish map and location behavior

**Purpose:** choose a workable map path and remove ambiguity around location
permissions.

**Tasks**

- Run the current mobile map and identify its required data fields.
- Confirm a compatible map approach for the React/Vite web app.
- Write expected behavior for location permission states: granted, denied,
  unavailable, and loading.
- Define distance sorting when a user location exists and alphabetical sorting
  when it does not.
- Create a web map scaffold that can display fixture markers.
- Confirm mobile map behavior remains intact after any shared data changes.
- Document the OpenStreetMap attribution requirement.

**Validation**

- A fixture marker appears in the web map scaffold.
- The app has a specified usable fallback when location is denied.
- Distance calculation inputs are documented and match the bathroom contract.

**Handoff:** provide the marker and selected-bathroom interface to Justin and
Aaliyah.

---

### TT-103 — Gavin — Stabilize the rating contract

**Purpose:** make rating behavior predictable before both client implementations
depend on it.

**Tasks**

- Document the existing POST review route, required fields, success response,
  validation errors, and duplicate-review error.
- Confirm the 1–5 cleanliness scale and Low/Medium/High busyness values.
- Build a web rating-form foundation using fixtures or the local API.
- Verify the mobile form uses the same validation rules and field values.
- Add or update API tests for valid, malformed, unknown-bathroom, and duplicate
  submissions.
- Define user-facing wording that describes ratings as community reports rather
  than live occupancy.
- Record whether maintenance reports are explicitly in scope; do not implement
  them until an owner and handling policy are agreed.

**Validation**

- Valid review submission returns an updated bathroom aggregate.
- Invalid and duplicate requests produce understandable client-safe messages.
- Automated API tests cover the reviewed error cases.

**Handoff:** share exact form fields and failure states with Aaliyah and Justin.

---

### TT-104 — Aaliyah — Make the web app runnable

**Purpose:** convert the React/Vite starter into a usable web application base.

**Tasks**

- Add a root `dev:web` script for the React/Vite workspace.
- Create the web app layout, navigation, and a responsive page container.
- Add a typed API client that mirrors the Express response shapes.
- Create shared web loading, error, and empty-state components.
- Add a fixture mode or simple fixture module for safe independent UI work.
- Ensure lint and production build commands work from the repository root.
- Update README startup instructions for API, web, and mobile development.

**Validation**

- A clean local checkout can start API, web, and mobile with documented steps.
- The web app has visible loading/error/empty states.
- Web lint and production build pass.

**Handoff:** publish how feature owners add a page, make API calls, and test with
fixtures.

---

## Week 2 — End-to-end MVP

### TT-201 — Justin — Deliver search, filters, and details on both clients

**Purpose:** let users find a bathroom and understand its available information.

**Tasks**

- Connect web search and list screens to the real API.
- Implement approved filters in the backend with strict input validation.
- Add the matching filter controls and results behavior in the mobile app.
- Add web and mobile handling for: initial loading, network error, no matches,
  and missing optional metadata.
- Implement bathroom details consistently in both clients.
- Ensure selecting a bathroom from a list provides an interface Victor can open
  from a map marker.
- Add backend tests for every supported filter and a client check for no results.

**Validation**

- Search by bathroom and building name works on web and mobile.
- A selected filter produces matching results in both clients.
- Details use the same API record in both clients.

**Handoff:** provide stable list and detail interactions for TT-202 and TT-204.

---

### TT-202 — Victor — Deliver cross-platform map and nearby flow

**Purpose:** let users browse bathrooms geographically without making location
permission mandatory.

**Tasks**

- Connect web map markers to the live bathroom API.
- Connect mobile markers to the same API fields.
- Implement marker selection and navigation/opening of bathroom details.
- Implement browser geolocation and mobile permission handling.
- Add nearby distance ordering when coordinates are available.
- Fall back to name ordering when location is denied or unavailable.
- Add user-visible location states and map failure messaging.
- Verify map attribution is visible in the web implementation.

**Validation**

- Selecting a map marker opens the matching bathroom details on both clients.
- Denying location still permits search, map browsing, and list browsing.
- Nearby ordering changes only when a valid location is available.

**Handoff:** share the final map state/error requirements with Aaliyah for
cross-platform regression.

---

### TT-203 — Gavin — Deliver cross-platform ratings

**Purpose:** allow users to submit and understand community cleanliness and
busyness reports.

**Tasks**

- Connect the web rating form to the real review endpoint.
- Confirm the mobile form submits the identical field values and handles the
  same response errors.
- Refresh the bathroom aggregate after a successful submission in both clients.
- Show an understandable duplicate-submission message without exposing internal
  database details.
- Display busyness timestamp and explain it is a recent community report, not
  live occupancy.
- Add client checks for success, validation error, API failure, and duplicate
  review behavior.
- Keep maintenance reports out unless their Week 1 scope decision approved them.

**Validation**

- A submitted rating updates cleanliness/busyness information in both clients.
- Duplicate submissions are rejected consistently by API, web, and mobile.
- The wording does not imply verified or live data.

**Handoff:** provide known review limitations to Aaliyah for release notes.

---

### TT-204 — Aaliyah — Integrate client infrastructure

**Purpose:** make individual features behave like one coherent web/mobile product.

**Tasks**

- Apply responsive layout to discovery, map, and rating pages.
- Standardize API error parsing and retry affordances in the web app.
- Verify shared API types and fixtures match the implemented backend response.
- Add a web integration check for search-to-details or details-to-rating flow.
- Ensure root checks run backend tests, web lint/build, and mobile TypeScript.
- Update setup documentation with web API URL configuration.
- Review each Week 2 PR for cross-platform completeness before merge.

**Validation**

- The web app works at desktop and narrow-browser widths.
- One end-to-end web flow runs against the real local API.
- Root check instructions are accurate.

**Handoff:** publish a short integration-status note before Week 3 testing.

---

## Week 3 — Test and freeze scope

### TT-301 — Justin — Test discovery edge cases

**Tasks**

- Test search by name and building on web and mobile.
- Test every supported filter independently and in supported combinations.
- Test no matches, no bathrooms, missing optional fields, and slow/failed API.
- Check keyboard navigation, focus visibility, labels, and readable empty states
  in the web app.
- Check mobile labels and touch targets for discovery controls.
- Fix release-blocking discovery defects or document accepted limitations.

**Done when:** evidence covers normal, empty, error, and missing-data discovery
states for both clients.

---

### TT-302 — Victor — Test maps and location across platforms

**Tasks**

- Test web map behavior in a supported desktop browser.
- Test mobile map behavior on a physical phone or simulator.
- Test location granted, denied, unavailable, and loading conditions.
- Test failed map tiles or no-network behavior where practical.
- Verify marker selection, nearby ordering, and name-order fallback.
- Record platform-specific limitations and fix release blockers.

**Done when:** browser and mobile test evidence is recorded, including fallback
behavior and any known map limitations.

---

### TT-303 — Gavin — Test rating persistence and failures

**Tasks**

- Submit ratings from web and mobile against the same API database.
- Verify updated aggregates appear correctly after submission.
- Test malformed payloads, unknown bathrooms, duplicate submissions, and API
  downtime messaging.
- Run the persistence tests after database restart.
- Verify Los Angeles calendar-day duplicate behavior is still covered.
- Confirm rating copy remains accurate in all supported screens.

**Done when:** API automation passes and both clients have recorded success and
failure-path evidence.

---

### TT-304 — Aaliyah — Run cross-platform regression and freeze scope

**Tasks**

- Run the complete root test/check command.
- Complete a browser smoke test of the primary user journey.
- Complete a mobile smoke test of the primary user journey.
- Verify setup from a clean checkout or a clean install path.
- Check responsive layouts at desktop, tablet, and narrow-browser widths.
- Add a Playwright smoke test for the primary web flow if supported.
- Publish a final triage list: release blocker, accepted limitation, or deferred
  work.

**Done when:** MVP scope is frozen and every remaining issue has a recorded
release decision.

---

## Week 4 — Stabilize and release

### TT-401 — Justin — Release discovery flow

**Tasks**

- Fix approved discovery defects from TT-301.
- Re-test search, filters, and details after integration changes.
- Verify final seed records render safely when optional attributes are absent.
- Confirm demo/verification labels appear wherever needed.

**Done when:** all remaining discovery issues are closed or accepted and evidence
is linked in the final update.

---

### TT-402 — Victor — Release map and location flow

**Tasks**

- Fix approved map/location defects from TT-302.
- Re-test browser and mobile geolocation independently.
- Verify map attribution and location-denied fallback.
- Confirm no unverified coordinates are described as verified campus data.

**Done when:** map functionality and its documented fallbacks work on supported
targets.

---

### TT-403 — Gavin — Release ratings flow

**Tasks**

- Fix approved rating defects from TT-303.
- Re-test rating submission and aggregate refresh on web and mobile.
- Confirm review-limit and busyness-freshness wording is accurate.
- Verify no screen suggests live occupancy or guaranteed one-person-one-vote.

**Done when:** rating behavior is consistent on both clients and known
limitations are included in handoff notes.

---

### TT-404 — Aaliyah — Produce the release candidate

**Tasks**

- Run the final root check, web production build, and Expo start flow.
- Verify API health, seeding, and persistence from a clean database.
- Verify README commands and environment setup one final time.
- Assemble release notes with supported features, known limitations, and test
  evidence.
- Prepare a short demo showing the same search-to-rating journey on web and
  mobile.
- Coordinate final triage and confirm the Definition of Done in `ROADMAP.md`.

**Done when:** the team has a reproducible web/mobile demo path and every
Definition-of-Done item is complete or explicitly accepted as a limitation.
