# Unit Testing

Run the isolated backend service tests without starting the API server or connecting to a network service:

```sh
node --test packages/express-backend/tests/reviewService.test.js packages/express-backend/tests/maintenanceService.test.js
```

The tests seed a single bathroom in an in-memory SQLite database. The review persistence check uses a temporary local SQLite file only to verify reopening behavior. They do not call external APIs or network services.

| Unit | Test coverage | Why it matters |
| --- | --- | --- |
| `reviewService` | Los Angeles day calculation; invalid cleanliness returns `400` with the validation message; missing bathroom returns `404` with `Bathroom not found.`; a review is persisted; a duplicate same-day review returns `409` with the conflict message; reviews are accepted after the day changes and persist when the database is reopened. | Prevents invalid ratings, preserves one-review-per-installation-per-day behavior, and verifies review data survives storage boundaries. |
| `maintenanceService` | Unsupported category returns `400` with the category message; reports are trimmed, stored, and initialized as `open`; invalid status returns `400` with the allowed-status message. | Prevents unsupported report data from being saved and ensures the maintenance workflow starts from a predictable state. |

The checks assert status codes and client-facing error text for failure paths so route handlers can return clear responses.
