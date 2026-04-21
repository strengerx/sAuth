import jwt from "jsonwebtoken";
import { jwtConfig } from "../configs/jwt.config.js";
import { unauthorized } from "../errors/httpErrors.js"

const getTokenConfig = (type) => {
    const config = jwtConfig[type];

    if (!config) {
        throw unauthorized(`Invalid token type: ${type}`);
    }

    return config;
};

export const signToken = ({ payload, type = "access" }) => {
    const config = getTokenConfig(type);
    return jwt.sign(payload, config.secret, {
        expiresIn: config.expiresIn,
    });
};

export const generateTokens = (user, refreshState) => {
    if (!refreshState?.sessionId || !refreshState?.tokenId) {
        throw unauthorized("Refresh token state is required");
    }

    return {
        access: signToken({
            payload: {
                id: user._id,
                email: user.email,
                sid: refreshState.sessionId,
            },
        }),
        refresh: signToken({
            payload: {
                id: user._id,
                sid: refreshState.sessionId,
                jti: refreshState.tokenId,
            },
            type: "refresh",
        }),
    };
};

export const verifyToken = ({ token, type = "access" }) => {
    const config = getTokenConfig(type);
    return jwt.verify(token, config.secret);
}
