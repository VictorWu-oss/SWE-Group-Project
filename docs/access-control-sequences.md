# TE6 access-control sequence

Passwords use bcrypt; tokens are expiring JWTs signed with `JWT_SECRET`.

```mermaid
sequenceDiagram
  actor U as **User**
  participant F as **Frontend**
  participant A as **Express API**
  participant D as **SQLite**
  U->>F: Enter credentials
  F->>A: **POST /api/auth/login**
  A->>D: Find user and bcrypt hash
  D-->>A: User record
  A->>A: Compare password and sign JWT
  A-->>F: **200 + token**
  F->>A: **Protected request + Bearer token**
  A->>A: Verify signature and expiry
  alt **Valid token**
    A->>D: Perform operation
    D-->>A: Result
    A-->>F: **2xx success**
  else **Invalid, missing, or expired**
    A-->>F: **401 Unauthorized**
  end
```
