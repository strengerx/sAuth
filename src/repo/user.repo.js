import User from "../models/User.js";

const USER_PUBLIC_PROJECTION = "_id name email createdAt updatedAt";

const baseFindByEmail = (email) => User.findOne({ email });

export const findByEmail = async (email) => {
    return baseFindByEmail(email)
        .select(USER_PUBLIC_PROJECTION)
        .lean();
};

export const findByEmailWithPassword = async (email) => {
    return baseFindByEmail(email)
        .select("+password")
        .lean();
};

export const create = async (data) => {
    const user = await User.create(data);
    return user.toObject();
};

export const findById = async (id) => {
    return User.findById(id)
        .select(USER_PUBLIC_PROJECTION)
        .lean();
};