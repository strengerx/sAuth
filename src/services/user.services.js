import { notFound } from "../errors/httpErrors.js";
import * as userRepo from "../repo/user.repo.js"

const toUserResponse = (user) => {
    return {
        id: String(user._id),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
};

export const getUserById = async (id) => {
    const user = await userRepo.findUserById(id);
    if (!user) {
        throw notFound("User not found");
    }
    return toUserResponse(user);
};
