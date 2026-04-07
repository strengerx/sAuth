export default class AppError extends Error {
    constructor(message, statusCode, details = null, opts = {}) {
        super(message);
        this.name = this.constructor.name;

        this.statusCode = statusCode;
        this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
        this.isOperational = opts.isOperational ?? true;
        this.details = details ?? null;

        this.code = opts.code || null;

        this.cause = opts.cause || null;

        Error.captureStackTrace(this, this.constructor);
    }
}
