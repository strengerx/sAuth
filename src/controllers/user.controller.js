import catchAsync from "../utils/catchAsync.js";
import * as responses from "../responses/apiResponse.js";
import * as userService from "../services/user.services.js";

export const getCurrentUser = catchAsync(async (req, res) => {
    const user = await userService.getUserById(req.user.id);
    return responses.success(res, user, "current user fetched successfully");
});

export const getUserById = catchAsync(async (req, res) => {
    const user = await userService.getUserById(req.params.id);
    return responses.success(res, user, "user fetched successfully");
});
