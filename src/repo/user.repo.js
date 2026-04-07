import User from "../models/User.js"

export const getByEmail = async (email) => {
    return User.findOne({ email }).lean();
};

export const getByEmailWithPassword = async (email) => {
    return User.findOne({ email }).select("+password").lean();
};

export const create = async (resource) => {
    return User.create(resource);
};
