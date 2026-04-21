import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DOTENV_CONFIG_QUIET = "true";

const projectRoot = process.cwd();

const envConfigUrl = pathToFileURL(path.join(projectRoot, "src/configs/env.config.js")).href;
const jwtUrl = pathToFileURL(path.join(projectRoot, "src/tokens/jwt.js")).href;
const mongooseConfigUrl = pathToFileURL(path.join(projectRoot, "src/configs/mongoose.config.js")).href;
const appUrl = pathToFileURL(path.join(projectRoot, "src/app.js")).href;
const userModelUrl = pathToFileURL(path.join(projectRoot, "src/models/User.js")).href;
const tokenSessionUrl = pathToFileURL(path.join(projectRoot, "src/services/tokenSession.service.js")).href;
const authServicesUrl = pathToFileURL(path.join(projectRoot, "src/services/auth.services.js")).href;

const tests = [];

const test = (name, run) => {
    tests.push({ name, run });
};

const importFresh = async (moduleUrl, label) => {
    return import(`${moduleUrl}?test=${label}-${Date.now()}-${Math.random()}`);
};

const withEnv = async (overrides, run) => {
    const originalValues = new Map();

    for (const [key, value] of Object.entries(overrides)) {
        originalValues.set(key, process.env[key]);

        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }

    try {
        return await run();
    } finally {
        for (const [key, value] of originalValues.entries()) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
    }
};

const withPatchedMethods = async (target, patches, run) => {
    const originals = new Map();

    for (const [key, value] of Object.entries(patches)) {
        originals.set(key, target[key]);
        target[key] = value;
    }

    try {
        return await run();
    } finally {
        for (const [key, value] of originals.entries()) {
            target[key] = value;
        }
    }
};

const startServer = async (app) => {
    return await new Promise((resolve, reject) => {
        const server = app.listen(0, () => {
            const address = server.address();

            resolve({
                baseUrl: `http://127.0.0.1:${address.port}`,
                close: () => {
                    return new Promise((closeResolve, closeReject) => {
                        server.close((error) => {
                            if (error) {
                                closeReject(error);
                                return;
                            }

                            closeResolve();
                        });
                    });
                }
            });
        });

        server.on("error", reject);
    });
};

test("env config fails fast when required secrets are missing", async () => {
    await withEnv(
        {
            MONGODB_URI: "mongodb://localhost:27017/sauth",
            JWT_ACCESS_SECRET: "",
            JWT_REFRESH_SECRET: "",
            DATABASE: "",
        },
        async () => {
            await assert.rejects(
                importFresh(envConfigUrl, "missing-secrets"),
                /Missing required environment variables: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET/
            );
        }
    );
});

test("signToken throws an operational AppError for invalid token types", async () => {
    await withEnv(
        {
            MONGODB_URI: "mongodb://localhost:27017/sauth",
            JWT_ACCESS_SECRET: "test-access-secret",
            JWT_REFRESH_SECRET: "test-refresh-secret",
        },
        async () => {
            const { signToken } = await importFresh(jwtUrl, "jwt-invalid-type");

            assert.throws(
                () => signToken({ payload: { id: "user-1" }, type: "session" }),
                (error) => {
                    assert.equal(error.name, "AppError");
                    assert.equal(error.statusCode, 401);
                    assert.equal(error.code, "ERR_UNAUTHORIZED");
                    return true;
                }
            );
        }
    );
});

test("verifyToken returns decoded claims for a valid token", async () => {
    const { signToken, verifyToken } = await importFresh(jwtUrl, "jwt-valid-token");
    const token = signToken({ payload: { id: "user-1", email: "user@example.com" } });
    const decoded = verifyToken({ token });

    assert.equal(decoded.id, "user-1");
    assert.equal(decoded.email, "user@example.com");
});

test("verifyToken leaves JWT library errors intact for centralized handling", async () => {
    const { verifyToken } = await importFresh(jwtUrl, "jwt-invalid-token");

    assert.throws(
        () => verifyToken({ token: "not-a-jwt" }),
        (error) => error.name === "JsonWebTokenError"
    );
});

test("GET /users/me returns the authenticated user's profile", async () => {
    const { default: app } = await importFresh(appUrl, "user-route-me");
    const { default: User } = await import(userModelUrl);
    const { signToken } = await importFresh(jwtUrl, "jwt-user-route-me");

    const userRecord = {
        _id: "user-1",
        name: "Jane Doe",
        email: "jane@example.com",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T01:00:00.000Z",
    };

    let requestedId = null;

    await withPatchedMethods(
        User,
        {
            findById: (id) => ({
                select: () => ({
                    lean: async () => {
                        requestedId = id;
                        return id === userRecord._id ? userRecord : null;
                    }
                })
            })
        },
        async () => {
            const server = await startServer(app);
            const token = signToken({
                payload: { id: userRecord._id, email: userRecord.email }
            });

            try {
                const response = await fetch(`${server.baseUrl}/users/me`, {
                    headers: {
                        authorization: `Bearer ${token}`
                    }
                });
                const body = await response.json();

                assert.equal(response.status, 200);
                assert.equal(requestedId, userRecord._id);
                assert.deepEqual(body.data, {
                    id: userRecord._id,
                    name: userRecord.name,
                    email: userRecord.email,
                    createdAt: userRecord.createdAt,
                    updatedAt: userRecord.updatedAt,
                });
            } finally {
                await server.close();
            }
        }
    );
});

test("GET /users/:id blocks access to another user's profile", async () => {
    const { default: app } = await importFresh(appUrl, "user-route-forbidden");
    const { default: User } = await import(userModelUrl);
    const { signToken } = await importFresh(jwtUrl, "jwt-user-route-forbidden");

    let findByIdCalls = 0;

    await withPatchedMethods(
        User,
        {
            findById: () => {
                findByIdCalls += 1;
                return {
                    select: () => ({
                        lean: async () => null
                    })
                };
            }
        },
        async () => {
            const server = await startServer(app);
            const token = signToken({
                payload: { id: "user-1", email: "jane@example.com" }
            });

            try {
                const response = await fetch(`${server.baseUrl}/users/user-2`, {
                    headers: {
                        authorization: `Bearer ${token}`
                    }
                });
                const body = await response.json();

                assert.equal(response.status, 403);
                assert.equal(body.code, "ERR_FORBIDDEN");
                assert.equal(findByIdCalls, 0);
            } finally {
                await server.close();
            }
        }
    );
});

test("GET /users/:id returns 404 when the authenticated user does not exist", async () => {
    const { default: app } = await importFresh(appUrl, "user-route-not-found");
    const { default: User } = await import(userModelUrl);
    const { signToken } = await importFresh(jwtUrl, "jwt-user-route-not-found");

    await withPatchedMethods(
        User,
        {
            findById: () => ({
                select: () => ({
                    lean: async () => null
                })
            })
        },
        async () => {
            const server = await startServer(app);
            const token = signToken({
                payload: { id: "user-1", email: "jane@example.com" }
            });

            try {
                const response = await fetch(`${server.baseUrl}/users/user-1`, {
                    headers: {
                        authorization: `Bearer ${token}`
                    }
                });
                const body = await response.json();

                assert.equal(response.status, 404);
                assert.equal(body.code, "ERR_NOT_FOUND");
            } finally {
                await server.close();
            }
        }
    );
});

test("buildMongoConnectionString appends DATABASE only when the URI has no database path", async () => {
    const { buildMongoConnectionString } = await importFresh(mongooseConfigUrl, "mongo-append-database");

    const connectionString = buildMongoConnectionString(
        "mongodb://localhost:27017/?retryWrites=true",
        "sauth"
    );

    assert.equal(connectionString, "mongodb://localhost:27017/sauth?retryWrites=true");
});

test("buildMongoConnectionString preserves URIs that already include a database name", async () => {
    const { buildMongoConnectionString } = await importFresh(mongooseConfigUrl, "mongo-preserve-database");

    const connectionString = buildMongoConnectionString(
        "mongodb://localhost:27017/existing-db?retryWrites=true",
        "sauth"
    );

    assert.equal(connectionString, "mongodb://localhost:27017/existing-db?retryWrites=true");
});


test("GET /health/live returns liveness data and request id header", async () => {
    const { default: app } = await importFresh(appUrl, "health-live");
    const server = await startServer(app);

    try {
        const response = await fetch(`${server.baseUrl}/health/live`);
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.data.live, true);
        assert.ok(response.headers.get("x-request-id"));
    } finally {
        await server.close();
    }
});

test("GET /health/ready reflects dependency readiness", async () => {
    const { default: app } = await importFresh(appUrl, "health-ready");
    const server = await startServer(app);

    try {
        const response = await fetch(`${server.baseUrl}/health/ready`);
        const body = await response.json();

        assert.equal(response.status, 503);
        assert.equal(body.data.ready, false);
        assert.equal(body.data.dependencies.mongo.ready, false);
        assert.equal(body.data.dependencies.sessionStore.ready, true);
    } finally {
        await server.close();
    }
});

test("refresh session rotation revokes session on token reuse", async () => {
    const { createSession, rotateSession } = await importFresh(tokenSessionUrl, "token-session-rotation");

    const sessionId = createSession("user-1");
    const first = rotateSession({ sessionId, userId: "user-1", tokenId: null });
    const second = rotateSession({ sessionId, userId: "user-1", tokenId: first.tokenId });

    assert.ok(first.tokenId);
    assert.ok(second.tokenId);
    assert.notEqual(first.tokenId, second.tokenId);

    assert.throws(() => {
        rotateSession({ sessionId, userId: "user-1", tokenId: first.tokenId });
    }, (error) => error.name === "AppError" && error.statusCode === 401);
});


test("GET /protected rejects access tokens for revoked sessions", async () => {
    const { default: app } = await importFresh(appUrl, "protected-revoked-session");
    const { signToken } = await importFresh(jwtUrl, "jwt-revoked-session");
    const { createSession, rotateSession, revokeSession } = await importFresh(tokenSessionUrl, "token-session-revoke-access");

    const sessionId = createSession("user-1");
    rotateSession({ sessionId, userId: "user-1", tokenId: null });
    revokeSession(sessionId);

    const accessToken = signToken({
        payload: { id: "user-1", email: "jane@example.com", sid: sessionId },
        type: "access",
    });

    const server = await startServer(app);

    try {
        const response = await fetch(`${server.baseUrl}/protected`, {
            headers: { authorization: `Bearer ${accessToken}` },
        });
        const body = await response.json();

        assert.equal(response.status, 401);
        assert.equal(body.code, "ERR_UNAUTHORIZED");
    } finally {
        await server.close();
    }
});

test("refresh token cannot be reused after logout revokes its session", async () => {
    const { signToken } = await importFresh(jwtUrl, "jwt-logout-refresh");
    const { createSession, rotateSession } = await importFresh(tokenSessionUrl, "token-session-logout-refresh");
    const authServices = await importFresh(authServicesUrl, "auth-services-logout-refresh");

    const sessionId = createSession("user-1");
    const refreshState = rotateSession({ sessionId, userId: "user-1", tokenId: null });

    const refreshToken = signToken({
        payload: { id: "user-1", sid: refreshState.sessionId, jti: refreshState.tokenId },
        type: "refresh",
    });

    await authServices.logout({ refreshToken });

    await assert.rejects(
        authServices.refresh({ refreshToken }),
        (error) => error.name === "AppError" && error.statusCode === 401
    );
});

let passed = 0;

for (const { name, run } of tests) {
    try {
        await run();
        passed += 1;
        console.log(`PASS ${name}`);
    } catch (error) {
        console.error(`FAIL ${name}`);
        console.error(error);
        process.exitCode = 1;
    }
}

if (passed === tests.length) {
    console.log(`All ${passed} tests passed.`);
}
