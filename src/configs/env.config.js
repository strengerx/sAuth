import dotenv from "dotenv";

dotenv.config({ quiet: true });

const requiredEnvKeys = [
    "MONGODB_URI",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
];

const missingEnvKeys = requiredEnvKeys.filter((key) => {
    const value = process.env[key];
    return typeof value !== "string" || value.trim().length === 0;
});

if (missingEnvKeys.length > 0) {
    throw new Error(
        `Missing required environment variables: ${missingEnvKeys.join(", ")}`
    );
}

const parsePort = (value) => {
    const parsedPort = Number(value);

    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
        throw new Error(`Invalid PORT value "${value}". PORT must be an integer between 1 and 65535.`);
    }

    return parsedPort;
};

const readEnv = (key, { fallback, trim = true } = {}) => {
    const value = process.env[key];

    if (typeof value !== "string") {
        return fallback;
    }

    const normalizedValue = value.trim();

    if (normalizedValue.length === 0) {
        return fallback;
    }

    return trim ? normalizedValue : value;
};

export const NODE_ENV = readEnv("NODE_ENV", { fallback: "development" });
export const SERVER_PORT = parsePort(readEnv("PORT", { fallback: "3000" }));
export const MONGO_URI = readEnv("MONGODB_URI");
export const DATABASE = readEnv("DATABASE", { fallback: "" });
export const JWT_ACCESS_SECRET = readEnv("JWT_ACCESS_SECRET", { trim: false });
export const JWT_REFRESH_SECRET = readEnv("JWT_REFRESH_SECRET", { trim: false });
