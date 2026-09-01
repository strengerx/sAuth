# sAuth

A reusable Node.js authentication backend focused on secure session-based JWT authentication. It implements registration, credential authentication, access/refresh token generation, refresh-token rotation, logout/revocation, request validation, and authentication rate limiting.

## Highlights

- JWT access and refresh tokens
- Stateful refresh sessions with rotation
- Refresh-token reuse detection
- Explicit session revocation on logout
- Password hashing with bcrypt
- Request validation with Zod
- Authentication and brute-force rate limiting
- Centralized HTTP error handling
- Consistent JSON API responses
- MongoDB persistence with Mongoose
- Automated test entry point

## Authentication Flow

```text
Register
   │
   ▼
Hash password ──► Store user

Login
   │
   ▼
Verify credentials
   │
   ▼
Create session
   │
   ▼
Issue access + refresh tokens

Refresh
   │
   ▼
Verify refresh JWT
   │
   ▼
Validate session + current token ID
   │
   ▼
Rotate refresh token state
   │
   ▼
Issue new token pair

Logout
   │
   ▼
Revoke session
```

A refresh token carries a session identifier and token identifier. The server compares the presented token identifier with the active session state; unexpected reuse revokes the session.

## Security Model

The project separates token signing/verification from authentication business logic. Passwords are hashed before persistence, authentication inputs are validated, login attempts are rate-limited, and refresh sessions can be revoked.

The in-memory session store is intentionally simple for this project. A horizontally scaled production deployment should replace it with shared persistent storage such as Redis or a database-backed session store.

## API

The authentication router exposes:

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/authenticate` | Authenticate credentials and issue tokens |
| POST | `/register` | Create a user account |
| POST | `/refresh` | Rotate a refresh token and issue new tokens |
| POST | `/logout` | Revoke the refresh session |

The exact route prefix depends on the server configuration.

## Tech Stack

- Node.js / ES Modules
- Express 5
- MongoDB / Mongoose
- JSON Web Tokens
- bcrypt
- Zod

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB

### Install

```bash
npm install
```

Create the required environment configuration for the JWT and database settings used by the project. Keep secrets out of source control.

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

### Tests

```bash
npm test
```

## Architecture

```text
src/
├── configs/       # Application and JWT configuration
├── controllers/  # HTTP request handlers
├── errors/       # HTTP error helpers
├── middlewares/   # Validation and rate limiting
├── repo/         # Database access
├── routes/       # Express routes
├── services/     # Authentication/session business logic
├── tokens/       # JWT creation and verification
└── utils/        # Hashing, responses, logging, async helpers
```

## Why this project

sAuth is intentionally narrower than a full application: it isolates authentication concerns so the security model is easy to study and reuse. The interesting part is not simply issuing a JWT; it is managing refresh sessions, rotation, revocation, reuse detection, validation, and abuse protection together.

## Status

Active development. Interfaces and implementation details may evolve.

## License

ISC
