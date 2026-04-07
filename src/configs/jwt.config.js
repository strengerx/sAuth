import { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } from "./env.config.js";

export const jwtConfig = {
    access: {
        secret: JWT_ACCESS_SECRET,
        expiresIn: "15m",
    },
    refresh: {
        secret: JWT_REFRESH_SECRET,
        expiresIn: "7d",
    },
};