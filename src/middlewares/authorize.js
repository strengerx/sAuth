import { unauthorized } from "../errors/httpErrors.js"
import { verifyToken } from "../tokens/jwt.js";

export const authorize = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const bearerTokenMatch = typeof authHeader === "string"
        ? authHeader.match(/^Bearer\s+(.+)$/i)
        : null;

    if (!bearerTokenMatch) {
        return next(unauthorized("No token provided"));
    }

    const token = bearerTokenMatch[1].trim();

    if (token.length === 0) {
        return next(unauthorized("No token provided"));
    }

    try {
        req.user = verifyToken({ token });
        return next();
    } catch (error) {
        return next(error);
    }
}
