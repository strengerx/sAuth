import bcrypt from "bcrypt";
import { NODE_ENV } from "../configs/env.config.js";

const saltRounds = NODE_ENV === "production" ? 12 : 10;

export const hashPassword = async (password) => {
    try {
        const hash = await bcrypt.hash(password, saltRounds);
        return hash;
    } catch (err) {
        console.error("Hashing error:", err);
        throw err;
    }
};

export const comparePassword = async (password, hash) => {
    return bcrypt.compare(password, hash);
};
