import { randomUUID } from "node:crypto";
import { unauthorized } from "../errors/httpErrors.js";

const sessions = new Map();

export const createSession = (userId) => {
    const sessionId = randomUUID();

    sessions.set(sessionId, {
        userId: String(userId),
        currentTokenId: null,
        revoked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    return sessionId;
};

export const rotateSession = ({ sessionId, userId, tokenId }) => {
    const session = sessions.get(String(sessionId));

    if (!session || session.revoked) {
        throw unauthorized("Refresh session is invalid or revoked");
    }

    if (session.userId !== String(userId)) {
        session.revoked = true;
        session.updatedAt = new Date().toISOString();
        throw unauthorized("Refresh session is invalid or revoked");
    }

    if (session.currentTokenId && session.currentTokenId !== String(tokenId)) {
        session.revoked = true;
        session.updatedAt = new Date().toISOString();
        throw unauthorized("Refresh token reuse detected");
    }

    const nextTokenId = randomUUID();
    session.currentTokenId = nextTokenId;
    session.updatedAt = new Date().toISOString();

    return { sessionId: String(sessionId), tokenId: nextTokenId };
};

export const revokeSession = (sessionId) => {
    const session = sessions.get(String(sessionId));

    if (!session) {
        return false;
    }

    session.revoked = true;
    session.updatedAt = new Date().toISOString();
    return true;
};

export const isReady = () => true;
