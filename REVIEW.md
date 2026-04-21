# Repository Review: sAuth

## High-level critique

### What is working well
- Clean layered structure (`routes -> controllers -> services -> repo`) keeps responsibilities mostly separated.
- Input validation with Zod is present and strict for auth payloads.
- Centralized API response shape and global error normalization improve consistency.
- JWT helper utilities and authorization middleware are straightforward and readable.
- The custom test runner avoids environment-specific limitations and still gives good behavioral coverage.

### Key issues found
1. **Service/repository contract drift**
   - `auth.services.js` referenced non-existent repository functions (`getByEmail`, `findUserByEmailWithPassword`, `createUser`).
   - `user.services.js` referenced non-existent `findUserById`.
   - This caused runtime failures on protected user endpoints and likely on auth flows.

2. **Error observability is minimal in production-safe ways**
   - The global error handler logs only `error.message` for many failures.
   - There is no request correlation id / trace id support.

3. **Security hardening gaps**
   - No auth rate limiting on `/auth/authenticate` and `/auth/register`.
   - No refresh-token persistence/revocation strategy.
   - No explicit account lockout or suspicious login detection.

4. **Missing operational controls**
   - No readiness/liveness/health endpoints for deployment environments.
   - Startup is tightly coupled to DB connectivity; there is no graceful degradation mode.

5. **Test coverage opportunities**
   - Current tests validate some token/env/user flows, but registration/auth route contracts are not strongly covered.
   - No negative tests around malformed JSON for `validateBody` + error pipeline integration.

## Suggested feature improvements

### Priority 1 (security + reliability)
1. Add refresh token rotation + revocation list (or session store).
2. Add request rate limiting + brute-force mitigation on auth routes.
3. Add `/health/live` and `/health/ready` endpoints with DB readiness checks.
4. Add structured logging (JSON logs with request id) and propagate a `x-request-id` header.

### Priority 2 (product capability)
1. Add email verification flow for new registrations.
2. Add password reset flow with short-lived signed tokens.
3. Add token introspection/logout endpoint that invalidates refresh sessions.
4. Add role/permission support (`user`, `admin`) in JWT claims + middleware.

### Priority 3 (developer experience)
1. Add OpenAPI/Swagger docs generated from route/validation schema.
2. Add integration tests for `/auth/register`, `/auth/authenticate`, and error cases.
3. Add lightweight lint/format tooling (`eslint`, `prettier`) with CI checks.
4. Add typed config validation (e.g., Zod schema for env vars) with startup report.
