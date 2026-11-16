# TE6 access-control design

The API uses account credentials for authenticated actions; public bathroom discovery remains readable. Passwords are stored as bcrypt hashes. Tokens are JWTs signed with `JWT_SECRET`, expire after 24 hours, and are sent in an `Authorization: Bearer` header.

## Sign in

```mermaid
sequenceDiagram
  actor User
  participant Web as Web frontend
  participant API as Express /api/auth/login
  participant DB as SQLite users
  User->>Web: Enter username and password
  Web->>API: POST credentials over HTTPS
  API->>DB: SELECT username and bcrypt hash
  DB-->>API: User record
  API->>API: Compare password and sign 24-hour JWT
  API-->>Web: 200 token
  Web->>Web: Store token locally
```

## Sign in

```mermaid
sequenceDiagram
  actor User
  participant Web as Web frontend
  participant API as Express /api/auth/login
  participant DB as SQLite users
  User->>Web: Enter credentials
  Web->>API: POST credentials
  API->>DB: SELECT user by normalized username
  API->>API: scrypt password and timing-safe comparison
  API->>API: Sign token on success
  API-->>Web: 200 token, or 401 generic error
  Web->>Web: Store token only on success
```

## Protected request

```mermaid
sequenceDiagram
  participant Web as Web frontend
  participant API as Express middleware
  participant DB as SQLite
  Web->>API: Request with Authorization: Bearer token
  API->>API: Verify signature and expiry
  alt valid token
    API->>DB: Perform authenticated operation
    DB-->>API: Result
    API-->>Web: 2xx response
  else missing, forged, or expired token
    API-->>Web: 401 Authentication is required
  end
```
