**Ticket R-01: Extract Discovery Logic from the Map Screen (SELECTED)**

**Location:** packages/mobile-app/src/2d/CampusMapScreen.tsx

**Problem:** The screen handles search filtering, distance calculations, sorting, and UI rendering in one component. This makes the component difficult to read and the discovery logic difficult to test.

**Code Smell:** Large component, mixed responsibilities, and difficult-to-test logic.

**Clean Code Concept:** Single Responsibility Principle and Extract Method.

**Proposed Refactoring:** Move search, distance, sorting, and formatting logic into a separate utility module such as src/main/discovery.ts. Add unit tests for search matches, no results, distance ordering, and alphabetical ordering.

**Old Code:**

```tsx
const orderedBathrooms = bathrooms
  .filter((bathroom) => `${bathroom.name} ${bathroom.building}`
    .toLowerCase().includes(search.trim().toLowerCase()))
  .map((bathroom) => ({
    bathroom,
    distanceKilometers: location && bathroom.latitude !== null
      ? distanceBetween(location, {
        latitude: bathroom.latitude,
        longitude: bathroom.longitude,
      })
      : null,
  }))
  .sort((first, second) => {
    const firstDistance = first.distanceKilometers ?? Number.POSITIVE_INFINITY;
    const secondDistance = second.distanceKilometers ?? Number.POSITIVE_INFINITY;
    return location
      ? firstDistance - secondDistance
      : first.bathroom.name.localeCompare(second.bathroom.name);
  });
```

**New Code:**

```tsx
const orderedBathrooms = useMemo(
  () => filterAndSortBathrooms(
    bathrooms,
    search,
    location,
    cleanlinessFilter,
    busynessFilter,
    { restroomTypes, accessibility, amenities, sort },
  ),
  [accessibility, amenities, bathrooms, busynessFilter, cleanlinessFilter,
    location, restroomTypes, search, sort],
);
```

**How We Verified the Refactoring:**

We ran the discovery tests to verify name and building search, empty results, distance sorting, alphabetical sorting, and distance labels. We also ran the mobile TypeScript check to verify that the extracted utility was correctly integrated with CampusMapScreen.tsx.

**Ticket R-02: Consolidate Bathroom Summary Database Queries (SELECTED)**

**Location:** packages/express-backend/src/services/reviewService.js

**Problem:** The list and detail operations contain overlapping database-query and mapping logic. The detail lookup previously loaded unnecessary records and searched through them in memory.

**Code Smell:** Duplicate logic, inefficient implementation, and possible inconsistency between list and detail responses.

**Clean Code Concept:** Don’t Repeat Yourself and Extract Method (DRY)

**Proposed Refactoring:** Create one reusable parameterized query function that supports full lists, search queries, and individual bathroom IDs. Reuse the same projection and row-mapping logic for both list and detail endpoints.

**Old Code:**

```js
function getBathroomSummary(database, bathroomId, installationId) {
  const rows = getAllBathroomRows(database, installationId);
  const row = rows.find((bathroom) => bathroom.id === bathroomId);
  return row ? mapDirectoryBathroom(row) : null;
}
```

**New Code:**

```js
function getBathroomSummary(database, bathroomId, installationId, date = new Date()) {
  const [row] = getBathroomRows(database, installationId, date, { bathroomId });
  return row ? mapDirectoryBathroom(row, date) : null;
}

function getBathroomRows(database, installationId, date, { bathroomId, search } = {}) {
  const filters = [];
  const parameters = [installationId, getLosAngelesDay(date)];

  if (typeof bathroomId === 'string') {
    filters.push('b.id = ?');
    parameters.push(bathroomId);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  return database.prepare(`
    SELECT b.*, COUNT(r.id) AS review_count,
      AVG(r.cleanliness) AS average_cleanliness
    FROM bathrooms b
    LEFT JOIN reviews r ON r.bathroom_id = b.id
    ${whereClause}
    GROUP BY b.id
    ORDER BY b.name COLLATE NOCASE
  `).all(...parameters);
}
```

**How We Verified the Refactoring:**

We ran the backend tests to verify list ordering, case-insensitive search, empty search results, detail lookup, unknown IDs, and review aggregates. These tests confirmed that the shared query preserved the existing API behavior.

**Ticket R-03: Separate Review Validation from Review Persistence (SELECTED)**

**Location:** packages/express-backend/src/services/reviewService.js, especially submitReview

**Problem:** The submitReview function validates request fields while also managing transactions, duplicate checks, database inserts, updates, and error handling.

**Code Smell:** Long method and mixed responsibilities.

**Clean Code Concept:** Single Responsibility Principle and Extract Method.

**Proposed Refactoring:** Extract review-input validation into a separate validateReviewInput function. Keep database transactions and persistence inside submitReview. This makes validation independently testable and makes the persistence logic easier to follow.

**Old Code:**

```js
function submitReview(database, input, now = new Date()) {
  if (!input || typeof input !== 'object') {
    throw validationError('A review request body is required.');
  }
  if (!Number.isInteger(input.cleanliness)
      || input.cleanliness < 1 || input.cleanliness > 5) {
    throw validationError('Cleanliness must be a whole number from 1 to 5.');
  }

  database.exec('BEGIN IMMEDIATE');
  // Validation, duplicate checks, insert, update, and commit were mixed here.
}
```

**New Code:**

```js
function submitReview(database, input, now = new Date()) {
  const { bathroomId, installationId, cleanliness, busyness } = validateReviewInput(input);
  const day = getLosAngelesDay(now);
  const timestamp = now.toISOString();

  database.exec('BEGIN IMMEDIATE');
  try {
    // The transaction now contains only lookup and persistence work.
    database.prepare(`
      INSERT INTO reviews
        (bathroom_id, installation_id, review_day, cleanliness, busyness, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(bathroomId, installationId, day, cleanliness, busyness, timestamp);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

function validateReviewInput(input) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw Object.assign(new Error('A review request body is required.'), { statusCode: 400 });
  }
  if (!Number.isInteger(input.cleanliness)
      || input.cleanliness < 1 || input.cleanliness > 5) {
    throw Object.assign(new Error(
      'Cleanliness must be a whole number from 1 to 5.'
    ), { statusCode: 400 });
  }
  return input;
}
```

**How We Verified the Refactoring:**

We ran the backend tests to verify valid submissions, invalid cleanliness values, malformed requests, unknown bathrooms, duplicate submissions, Los Angeles calendar-day behavior, and persistence after a database restart. These tests confirmed that validation and persistence still behave correctly after being separated.

**Ticket R-04: Separate Map Rendering Helpers from WebView Lifecycle Logic**

**Location:** packages/mobile-app/src/2d/CampusMap.tsx

**Problem:** The component is responsible for generating map HTML, configuring map tiles, styling markers, parsing WebView messages, and managing the React Native WebView lifecycle.

**Code Smell:** Large component and mixed presentation, configuration, and communication responsibilities.

**Clean Code Concept:** Single Responsibility Principle and Extract Module.

**Proposed Refactoring:** Move map HTML generation, marker styling, and WebView message parsing into focused helper functions or modules. Keep only WebView lifecycle and React Native state management in the component.

**Ticket R-05: Split Bathroom Details Responsibilities into Smaller Components**

**Location:** packages/mobile-app/src/rating/BathroomDetailsScreen.tsx

**Problem:** The details screen handles rating submission, directory information, hours, directions, safety information, maintenance reports, and navigation.

**Code Smell:** Large component, mixed responsibilities, and high coupling.

**Clean Code Concept:** Single Responsibility Principle and Component Extraction.

**Proposed Refactoring:** Extract directory information and directions into a BathroomDirectoryDetails component. Extract maintenance-report loading, submission, and history into a MaintenanceReportsSection component. Leave rating behavior and overall screen layout in BathroomDetailsScreen.

The three tickets selected for the refactoring sprint are R-01, R-02, and R-03. These tickets were selected because they improve testability, reduce duplicated logic, and separate responsibilities without changing the application’s intended features or behavior.
