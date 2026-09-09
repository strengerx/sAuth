# sAuth

sAuth is a production-style Node.js authentication API built around **Express, MongoDB/Mongoose, Redis, bcrypt, JWT, and Zod**. The project focuses on practical authentication engineering: short-lived access tokens, Redis-backed refresh sessions, atomic refresh-token rotation, session revocation, abuse protection, request tracing, health checks, and a documented API contract.

> **Goal:** build authentication as a system, not just a `jwt.sign()` helper.

## Highlights

- JWT access tokens with a separate refresh-token flow
- Redis-backed server-side refresh sessions
- Atomic refresh-token rotation with Redis Lua scripts
- Refresh-token reuse detection and session revocation
- Redis-backed distributed rate limiting
- Account-aware brute-force protection
- Zod request validation
- Password hashing with bcrypt
- Configurable trusted-proxy handling
- Structured JSON logging and request IDs
- Liveness and dependency-readiness endpoints
- Centralized HTTP error handling
- OpenAPI 3 documentation
- ESLint, Prettier, and executable regression tests

## Authentication Flow

```text
                         ┌──────────────────┐
                         │      Client      │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │   Express API    │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
              ┌───────────┐               ┌───────────┐
              │ MongoDB   │               │   Redis   │
              │   Users   │               │ Sessions  │
              └───────────┘               │ Rate limit│
                                          └───────────┘
```

### Login

```text
Credentials
    │
    ▼
Validate request
    │
    ▼
Check rate limits
    │
    ▼
Verify password
    │
    ▼
Create Redis refresh session
    │
    ▼
Issue access + refresh tokens
```

### Refresh

```text
Refresh token
    │
    ▼
Verify JWT policy
    │
    ▼
Atomically compare current token ID
    │
    ├── mismatch ──► Revoke session / reject reuse
    │
    └── match ─────► Generate new token ID
                           │
                           ▼
                    Issue new token pair
```

The refresh session is the server-side source of truth for refresh-token validity. Redis Lua scripts make rotation and revocation atomic, preventing concurrent refresh requests from both successfully advancing the same session.

## Security Model

### Token security

- Access and refresh tokens use separate secrets.
- JWT verification pins the expected algorithm (`HS256`), issuer (`sauth`), and audience (`sauth-client`).
- Refresh tokens contain session/token identifiers that are checked against Redis state.
- Refresh sessions have a server-side TTL aligned with refresh-token expiration.
- Logout revokes the associated refresh session.

### Refresh-token reuse protection

Each refresh session tracks its current token identifier. During rotation, Redis atomically verifies the presented identifier before replacing it. A stale identifier is treated as reuse and the session is revoked.

### Rate limiting

Authentication rate limiting is Redis-backed and therefore shared across application instances. The implementation uses an atomic Redis `INCR` + `PEXPIRE` Lua script and exposes standard rate-limit response headers.

Separate limits can be applied to authentication routes and account/IP combinations to reduce brute-force attempts.

### Failure behavior

Redis is a required dependency for protected authentication flows and rate limiting. If the session/rate-limit store is unavailable, the application fails closed with a generic `503` instead of bypassing security checks or exposing infrastructure details.

### Request tracing and proxy handling

Requests can carry a bounded, sanitized request ID for correlation. Structured logs record useful request metadata without credentials or tokens. Client IP information is only trusted through explicitly configured proxy hops.

## API

The API is mounted under `/api/v1`.

| Method | Path | Authentication | Purpose |
|---|---|---|---|
| `GET` | `/health/live` | None | Process liveness |
| `GET` | `/health/ready` | None | MongoDB and Redis readiness |
| `GET` | `/openapi.json` | None | OpenAPI contract |
| `POST` | `/auth/register` | None | Create a user |
| `POST` | `/auth/authenticate` | None | Authenticate and issue tokens |
| `POST` | `/auth/refresh` | Refresh token | Rotate refresh token and issue a new pair |
| `POST` | `/auth/logout` | Refresh token | Revoke the refresh session |
| `GET` | `/users/me` | Access token | Read the current user |
| `GET` | `/users/:id` | Access token | Read the current user's requested profile |

`/users/:id` is protected by same-user authorization rather than being a general user lookup endpoint.

Successful responses use a consistent `status`, `message`, `data`, and `meta` shape. Errors expose an HTTP status, stable error code, request ID, and safe validation details.

## OpenAPI

The API contract is defined in `src/docs/openapi.js` and exposed through `/openapi.json`.

The current contract covers the primary authentication endpoints. A useful next step is expanding it to fully describe request/response schemas, authentication requirements, cookies/headers, error payloads, and reusable security components.

## Project Structure

```text
server.js
src/
├── configs/       # Environment, MongoDB, Redis, and JWT configuration
├── controllers/   # HTTP request handlers
├── docs/          # OpenAPI API contract
├── errors/        # Application errors and normalization
├── middlewares/   # Validation, authentication, authorization, tracing, rate limits
├── models/        # Mongoose models
├── repo/          # Database access layer
├── responses/     # Standard API response helpers
├── routes/        # HTTP route definitions
├── services/      # Authentication, user, and session business logic
├── tokens/        # JWT creation and verification
├── utils/         # Logging and shared utilities
└── validations/   # Zod request schemas

tests/             # Executable regression suite
```

The repository deliberately separates controllers, services, persistence, token handling, and infrastructure configuration so authentication behavior can evolve without turning route handlers into a monolith.

## Setup

### Requirements

- Node.js 20+
- MongoDB
- Redis

### Install

```bash
npm ci
```

### Configure

```bash
cp .env.example .env
```

On Windows, copy `.env.example` to `.env` using your editor or PowerShell.

Configure MongoDB, Redis, JWT secrets, token/session TTLs, rate limits, and proxy settings according to the environment. Production deployments reject JWT secrets shorter than 32 characters.

**Never commit real secrets.**

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

## Development Commands

```bash
npm test
npm run lint
npm run format
npm run format:check
npm run check
```

`npm run check` runs linting, formatting validation, and the test suite.

## Testing

The regression suite covers configuration validation, JWT policy, protected user routes, health behavior, Redis-backed rate limiting, and refresh-session rotation/reuse protection.

Redis and MongoDB integration behavior should also be exercised in CI using disposable service containers or equivalent test infrastructure.

## Deployment Considerations

sAuth is designed with production-style failure behavior, but it is still a learning/reference project rather than a turnkey identity provider.

Before production adoption, consider:

- TLS termination and secure cookie configuration
- Refresh-token storage strategy and CSRF model for browser clients
- Secret management through a dedicated secrets manager
- Redis high availability and persistence requirements
- MongoDB indexes, backups, and connection-pool tuning
- Centralized log collection and metrics
- Distributed tracing
- CI security/dependency scanning
- Automated integration and load testing
- Account recovery and password-reset flows
- Email verification and MFA/WebAuthn where required
- User/admin session management APIs

## Engineering Trade-offs

### Why Redis?

Redis provides shared, low-latency state for refresh sessions and rate limiting. This avoids process-local authentication state and allows multiple application instances to coordinate session rotation and abuse protection.

### Why server-side refresh sessions?

A purely stateless refresh JWT is difficult to revoke immediately. Keeping refresh-session state server-side makes logout, reuse detection, and future session-management features possible.

### Why Lua scripts?

Refresh rotation is a read-modify-write operation. A Lua script keeps the validation and mutation inside Redis as one atomic operation, reducing race conditions between concurrent refresh requests.

## Roadmap

- [ ] Complete OpenAPI request/response schemas
- [ ] Add browser-oriented secure cookie/CSRF documentation and tests
- [ ] Add password reset and email verification
- [ ] Add session listing and per-session revocation
- [ ] Add MFA/WebAuthn support
- [ ] Add integration-test services to CI
- [ ] Add metrics and distributed tracing
- [ ] Add dependency and container security scanning
- [ ] Add load/concurrency tests for refresh rotation

## Status

**Active development.** The project is primarily intended as a serious authentication-engineering learning project and reusable backend foundation. APIs and internal interfaces may evolve.

## License

The package metadata currently declares **ISC**. Confirm the intended public licensing terms before treating this as a distributable authentication package.
