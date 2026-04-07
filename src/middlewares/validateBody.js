import { badRequest } from "../errors/httpErrors.js";

const formatZodIssues = (issues) => {
    return issues.map((issue) => ({
        field: issue.path.length > 0 ? issue.path.join(".") : "body",
        message: issue.message
    }));
};

const isEmptyObject = (value) => {
    return value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.keys(value).length === 0;
};

export const validateBody = (schema) => {
    return (req, res, next) => {
        if (req.body == null || isEmptyObject(req.body)) {
            return next(
                badRequest("Request body cannot be empty", [
                    { field: "body", message: "Send a non-empty request body." }
                ])
            );
        }

        const parsed = schema.safeParse(req.body);

        if (!parsed.success) {
            return next(
                badRequest("Validation failed", formatZodIssues(parsed.error.issues))
            );
        }

        req.body = parsed.data;
        return next();
    };
};

