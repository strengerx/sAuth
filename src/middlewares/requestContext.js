import { randomUUID } from "node:crypto";
import { logInfo } from "../utils/logger.js";

export const requestContext = (req, res, next) => {
    const requestId = req.headers["x-request-id"] || randomUUID();
    req.id = String(requestId);
    res.setHeader("x-request-id", req.id);

    const startedAt = process.hrtime.bigint();

    res.on("finish", () => {
        const elapsedNs = process.hrtime.bigint() - startedAt;
        const durationMs = Number(elapsedNs) / 1_000_000;

        logInfo("http_request", {
            requestId: req.id,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: Number(durationMs.toFixed(2)),
            ip: req.ip,
        });
    });

    next();
};
