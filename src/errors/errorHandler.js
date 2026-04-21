import AppError from "./AppError.js";
import { error as errorResponse } from "../responses/apiResponse.js";
import { logError } from "../utils/logger.js";

const isProduction = process.env.NODE_ENV === "production";

const getHttpStatus = (statusCode) => {
    const parsedStatus = Number(statusCode);

    if (Number.isInteger(parsedStatus) && parsedStatus >= 400 && parsedStatus <= 599) {
        return parsedStatus;
    }

    return 500;
};

const handleCastError = (error) => {
    return new AppError(
        `Invalid value for "${error.path}"`,
        400,
        [{ field: error.path, value: error.value }],
        { code: "ERR_INVALID_PARAM", cause: error }
    );
};

const handleValidationError = (error) => {
    const details = Object.values(error.errors ?? {}).map((validationError) => ({
        field: validationError.path,
        message: validationError.message,
        value: validationError.value
    }));

    return new AppError(
        "Validation failed",
        400,
        details,
        { code: "ERR_VALIDATION", cause: error }
    );
};

const handleDuplicateKeyError = (error) => {
    const duplicateFields = Object.entries(error.keyValue ?? {});
    const [field, value] = duplicateFields[0] ?? ["field", null];

    return new AppError(
        `Duplicate value for "${field}"`,
        409,
        [{ field, value, message: `${field} already exists` }],
        { code: "ERR_DUPLICATE_KEY", cause: error }
    );
};

const handleJwtError = (error) => {
    return new AppError(
        "Invalid authentication token",
        401,
        null,
        { code: "ERR_INVALID_TOKEN", cause: error }
    );
};

const handleJwtExpiredError = (error) => {
    return new AppError(
        "Authentication token has expired",
        401,
        null,
        { code: "ERR_TOKEN_EXPIRED", cause: error }
    );
};

const handleInvalidJsonError = (error) => {
    return new AppError(
        "Invalid JSON payload",
        400,
        null,
        { code: "ERR_INVALID_JSON", cause: error }
    );
};

const normalizeError = (error) => {
    if (error instanceof AppError) {
        return error;
    }

    if (error?.name === "CastError") {
        return handleCastError(error);
    }

    if (error?.name === "ValidationError") {
        return handleValidationError(error);
    }

    if (error?.code === 11000) {
        return handleDuplicateKeyError(error);
    }

    if (error?.name === "JsonWebTokenError") {
        return handleJwtError(error);
    }

    if (error?.name === "TokenExpiredError") {
        return handleJwtExpiredError(error);
    }

    if (error?.type === "entity.parse.failed") {
        return handleInvalidJsonError(error);
    }

    if (typeof error?.status === "number" || typeof error?.statusCode === "number") {
        const statusCode = getHttpStatus(error.statusCode ?? error.status);

        return new AppError(
            error.message || "Request failed",
            statusCode,
            error.details ?? null,
            { code: error.code ?? null, cause: error }
        );
    }

    return new AppError(
        "Internal Server Error",
        500,
        null,
        { code: "ERR_INTERNAL_SERVER", cause: error, isOperational: false }
    );
};

export const globalErrorHandler = (error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    const normalizedError = normalizeError(error);
    const isOperationalError = normalizedError.isOperational === true;
    const exposeError = !isProduction || isOperationalError;

    if (!isOperationalError || !isProduction) {
        logError("request_error", {
            requestId: req.id || null,
            method: req.method,
            path: req.originalUrl,
            statusCode: normalizedError.statusCode,
            code: normalizedError.code,
            message: error.message,
        });
    }

    return errorResponse(
        res,
        exposeError ? normalizedError.message : "Internal Server Error",
        normalizedError.statusCode,
        exposeError ? normalizedError.details : null,
        normalizedError.code,
        {
            method: req.method,
            path: req.originalUrl,
            requestId: req.id || null,
            // ...(isProduction ? {} : { stack: normalizedError.stack })
        }
    );
};
