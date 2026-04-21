import catchAsync from "../utils/catchAsync.js";
import * as response from "../responses/apiResponse.js"
import * as authService from "../services/auth.services.js";

export const register = catchAsync(async (req, res) => {
    const user = await authService.register(req.body);
    const data = { name: user.name, id: user._id, email: user.email };
    return response.created(res, data, "user registered successfully");
});

export const authenticate = catchAsync(async (req, res) => {
    const resource = await authService.authenticate(req.body);
    return response.success(res, resource, "authenticate successfully!");
})

export const refresh = catchAsync(async (req, res) => {
    const resource = await authService.refresh(req.body);
    return response.success(res, resource, "token refreshed successfully");
});

export const logout = catchAsync(async (req, res) => {
    const resource = await authService.logout(req.body);
    return response.success(res, resource, "logged out successfully");
});
