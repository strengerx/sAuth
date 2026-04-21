import mongoose from "mongoose";
import { DATABASE, MONGO_URI } from "./env.config.js";

const toPositiveInteger = (value, fallback) => {
    const parsedValue = Number(value);
    return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
};

const toNonNegativeInteger = (value, fallback) => {
    const parsedValue = Number(value);
    return Number.isInteger(parsedValue) && parsedValue >= 0 ? parsedValue : fallback;
};

const MONGO_CONNECT_MAX_RETRIES = toPositiveInteger(
    process.env.MONGO_CONNECT_MAX_RETRIES,
    5
);

const MONGO_CONNECT_RETRY_DELAY_MS = toNonNegativeInteger(
    process.env.MONGO_CONNECT_RETRY_DELAY_MS,
    2000
);

const MONGO_SERVER_SELECTION_TIMEOUT_MS = toPositiveInteger(
    process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS,
    5000
);

const splitMongoUri = (uri) => {
    const match = uri.match(/^(mongodb(?:\+srv)?:\/\/)(.*)$/i);

    if (!match) {
        return null;
    }

    const [, protocol, remainder] = match;
    const [authorityAndPath, ...queryParts] = remainder.split("?");
    const slashIndex = authorityAndPath.indexOf("/");

    return {
        protocol,
        authority: slashIndex === -1 ? authorityAndPath : authorityAndPath.slice(0, slashIndex),
        path: slashIndex === -1 ? "" : authorityAndPath.slice(slashIndex + 1),
        query: queryParts.length > 0 ? `?${queryParts.join("?")}` : "",
    };
};

export const buildMongoConnectionString = (mongoUri, database = "") => {
    const normalizedDatabase = typeof database === "string" ? database.trim() : "";

    if (normalizedDatabase.length === 0) {
        return mongoUri;
    }

    const mongoUriParts = splitMongoUri(mongoUri);

    if (!mongoUriParts || mongoUriParts.path.length > 0) {
        return mongoUri;
    }

    return `${mongoUriParts.protocol}${mongoUriParts.authority}/${encodeURIComponent(normalizedDatabase)}${mongoUriParts.query}`;
};

const CONNECTION_STRING = buildMongoConnectionString(MONGO_URI, DATABASE);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function connectMongoDB() {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (mongoose.connection.readyState === 2) {
        return mongoose.connection.asPromise();
    }

    let lastError = null;

    for (let attempt = 1; attempt <= MONGO_CONNECT_MAX_RETRIES; attempt += 1) {
        try {
            const conn = await mongoose.connect(CONNECTION_STRING, {
                serverSelectionTimeoutMS: MONGO_SERVER_SELECTION_TIMEOUT_MS
            });

            console.log(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
            return conn;
        } catch (err) {
            lastError = err;
            console.error(
                `MongoDB connect attempt ${attempt}/${MONGO_CONNECT_MAX_RETRIES} failed: ${err.message}`
            );

            if (attempt < MONGO_CONNECT_MAX_RETRIES) {
                await wait(MONGO_CONNECT_RETRY_DELAY_MS);
            }
        }
    }

    throw new Error(
        `Unable to connect to MongoDB after ${MONGO_CONNECT_MAX_RETRIES} attempts.`,
        { cause: lastError }
    );
}

export const getMongoReadiness = () => {
    return {
        ready: mongoose.connection.readyState === 1,
        state: mongoose.connection.readyState,
        host: mongoose.connection.host || null,
        name: mongoose.connection.name || null,
    };
};
