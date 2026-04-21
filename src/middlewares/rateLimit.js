import { tooManyRequests } from "../errors/httpErrors.js";

const buckets = new Map();

const getBucket = (key, windowMs) => {
    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
        const next = { count: 0, resetAt: now + windowMs };
        buckets.set(key, next);
        return next;
    }

    return existing;
};

export const createRateLimiter = ({
    windowMs = 15 * 60 * 1000,
    max = 20,
    keyGenerator,
    message = "Too many requests",
}) => {
    return (req, res, next) => {
        const key = keyGenerator ? keyGenerator(req) : `${req.ip}:${req.path}`;
        const bucket = getBucket(key, windowMs);

        bucket.count += 1;

        const remaining = Math.max(max - bucket.count, 0);
        const retryAfterSec = Math.ceil((bucket.resetAt - Date.now()) / 1000);

        res.setHeader("x-ratelimit-limit", String(max));
        res.setHeader("x-ratelimit-remaining", String(remaining));
        res.setHeader("x-ratelimit-reset", String(bucket.resetAt));

        if (bucket.count > max) {
            res.setHeader("retry-after", String(Math.max(retryAfterSec, 1)));
            return next(
                tooManyRequests(message, [{ field: "rateLimit", message: `Retry after ${retryAfterSec}s` }])
            );
        }

        return next();
    };
};

export const authRouteLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: "Too many authentication attempts",
    keyGenerator: (req) => `${req.ip}:${req.path}`,
});

export const authBruteForceLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: "Too many login attempts for this account",
    keyGenerator: (req) => `${req.ip}:${String(req.body?.email || "unknown").toLowerCase()}:authenticate`,
});
