import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DOTENV_CONFIG_QUIET = "true";

const projectRoot = process.cwd();

const envConfigUrl = pathToFileURL(path.join(projectRoot, "src/configs/env.config.js")).href;
const jwtUrl = pathToFileURL(path.join(projectRoot, "src/tokens/jwt.js")).href;
const mongooseConfigUrl = pathToFileURL(path.join(projectRoot, "src/configs/mongoose.config.js")).href;

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
