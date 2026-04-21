import { forbidden, unauthorized } from "../errors/httpErrors.js";
import { verifyToken } from "../tokens/jwt.js";

export const authorize = ({ type = "access" } = {}) => {
    return (req, res, next) => {
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next(unauthorized("Authorization token missing or malformed"));
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            return next(unauthorized("Authorization token missing or malformed"));
        }

        try {
            const decoded = verifyToken({ token, type });

            req.user = decoded;
            return next();
        } catch (error) {
            return next(unauthorized("Invalid or expired token"));
        }
    };
};

export const requireSameUser = (paramKey = "id") => {
    return (req, res, next) => {
        if (String(req.user?.id) !== String(req.params[paramKey])) {
            return next(forbidden("You can only access your own user resource"));
        }

        return next();
    };
};
