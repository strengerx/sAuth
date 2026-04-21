import { conflict, unauthorized } from "../errors/httpErrors.js";
import * as userRepo from "../repo/user.repo.js"
import { generateTokens, verifyToken } from "../tokens/jwt.js";
import * as hash from "../utils/hash.js";
import { createSession, revokeSession, rotateSession } from "./tokenSession.service.js";

export const register = async (resource) => {
    const existingUser = await userRepo.findByEmail(resource.email);
    if (existingUser) {
        throw conflict("Email already exists");
    }
    const hashPassword = await hash.hashPassword(resource.password);
    return userRepo.create({ ...resource, password: hashPassword });
}

export const authenticate = async ({ email, password }) => {
    const user = await userRepo.findByEmailWithPassword(email);
    if (!user) {
        throw unauthorized("invalid credentials!")
    }
    const isMatch = await hash.comparePassword(password, user.password);
    if (!isMatch) {
        throw unauthorized("invalid credentials!")
    }

    const sessionId = createSession(user._id);
    const refreshState = rotateSession({ sessionId, userId: user._id, tokenId: null });
    const tokens = generateTokens(user, refreshState);

    return { user: { id: user._id, name: user.name, email: user.email }, tokens }
}

export const refresh = async ({ refreshToken }) => {
    const decoded = verifyToken({ token: refreshToken, type: "refresh" });

    if (!decoded?.id || !decoded?.sid || !decoded?.jti) {
        throw unauthorized("Invalid refresh token");
    }

    const refreshState = rotateSession({
        sessionId: decoded.sid,
        userId: decoded.id,
        tokenId: decoded.jti,
    });

    const user = await userRepo.findById(decoded.id);
    if (!user) {
        throw unauthorized("Invalid refresh token");
    }

    const tokens = generateTokens({ _id: user._id, email: user.email }, refreshState);

    return {
        user: { id: user._id, name: user.name, email: user.email },
        tokens,
    };
};

export const logout = async ({ refreshToken }) => {
    const decoded = verifyToken({ token: refreshToken, type: "refresh" });

    if (!decoded?.sid) {
        throw unauthorized("Invalid refresh token");
    }

    revokeSession(decoded.sid);
    return { loggedOut: true };
};
