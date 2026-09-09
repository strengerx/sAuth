# sAuth

> A reusable, security-focused Node.js authentication backend built around JWT access tokens and stateful refresh sessions.

sAuth is an authentication service designed to make the **hard parts of JWT authentication explicit**: refresh-token rotation, session state, reuse detection, revocation, validation, and abuse protection.

## Features

- JWT access and refresh tokens
- Stateful refresh-token sessions
- Refresh-token rotation
- Refresh-token reuse detection
- Session revocation on logout
- bcrypt password hashing
- Zod request validation
- Authentication and brute-force rate limiting
- Centralized HTTP error handling
- Consistent JSON API responses
- MongoDB persistence with Mongoose
- Automated test entry point

## Authentication lifecycle

```text
Register
   │
   ▼
Validate input ──► Hash password ──► Store user

Login
   │
   ▼
Validate credentials
   │
   ▼
Create refresh session
   │
   ▼
Issue access + refresh tokens

Refresh
   │
   ▼
Verify refresh JWT
   │
   ▼
Validate session + token ID
   │
   ├── mismatch ──► Revoke session
   │
   ▼
Rotate refresh-token state
   │
   ▼
Issue new token pair

Logout
   │
   ▼
Revoke refresh session
```

A refresh token carries a session identifier and token identifier. The server compares the presented token against the active session state. An unexpected token identifier indicates possible reuse and causes the session to be revoked.

## Security model

sAuth separates token cryptography from authentication business logic. Credentials are validated before use, passwords are hashed before persistence, authentication attempts are rate-limited, and refresh sessions can be explicitly revoked.

The current refresh-session storage is intentionally simple and in-memory. **Do not use it as-is for a horizontally scaled production deployment.** Replace it with shared persistent storage such as Redis or a database-backed session store so all application instances observe the same session state.

## API

The authentication router exposes:

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/authenticate` | Authenticate credentials and issue tokens |
| POST | `/register` | Create a user account |
| POST | `/refresh` | Rotate a refresh token and issue a new token pair |
| POST | `/logout` | Revoke the refresh session |

The exact route prefix depends on the server configuration.

## Tech stack

- **Node.js** — ES Modules
- **Express 5** — HTTP API
- **MongoDB / Mongoose** — persistence
- **jsonwebtoken** — JWT creation and verification
- **bcrypt** — password hashing
- **Zod** — input validation

## Getting started

### Prerequisites

- Node.js 18+
- MongoDB

### Install

```bash
npm install
```

Create the environment configuration required by the application for database and JWT settings. **Never commit real secrets.**

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
├── middlewares/  # Validation and rate limiting
├── repo/         # Database access
├── routes/       # Express routes
├── services/     # Authentication/session business logic
├── tokens/       # JWT creation and verification
└── utils/        # Hashing, responses, logging, async helpers
```

## Production hardening roadmap

For a production deployment, consider adding:

- Redis-backed refresh-session storage
- Key rotation and asymmetric JWT signing where appropriate
- Secure, HTTP-only, SameSite cookie strategy for browser clients
- Refresh-token family tracking and stronger replay detection
- Token/session expiration and cleanup jobs
- Audit/security event logging
- Account lockout or progressive throttling policies
- Password reset and email-verification flows
- Automated security and dependency scanning
- Integration tests covering authentication abuse cases
- CI checks for tests, linting, and security regressions

## Why this project

The goal of sAuth is not merely to demonstrate how to sign a JWT. It focuses on the surrounding security model required to make authentication manageable: session lifecycle, rotation, revocation, reuse detection, validation, and abuse protection.

## Status

**Active development.** Interfaces and implementation details may evolve.

## License

ISC
