import { conflict, unauthorized } from "../errors/httpErrors.js";
import * as userRepo from "../repo/user.repo.js"
import { generateTokens } from "../tokens/jwt.js";
import * as hash from "../utils/hash.js";

export const register = async (resource) => {
    const existingUser = await userRepo.getByEmail(resource.email);
    if (existingUser) {
        throw conflict("Email already exists");
    }
    const hashPassword = await hash.hashPassword(resource.password);
    return userRepo.create({ ...resource, password: hashPassword });
}

export const authenticate = async ({ email, password }) => {
    const user = await userRepo.getByEmailWithPassword(email);
    if (!user) {
        throw unauthorized("invalid credentials!")
    }
    const isMatch = await hash.comparePassword(password, user.password);
    if (!isMatch) {
        throw unauthorized("invalid credentials!")
    }
    const tokens = generateTokens(user);
    return { user: { id: user._id, name: user.name }, tokens }
}
