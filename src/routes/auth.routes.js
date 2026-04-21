import { Router } from "express";
import { authenticate, logout, refresh, register } from "../controllers/auth.controller.js";
import { validateBody } from "../middlewares/validateBody.js";
import { authenticateSchema, refreshSchema, registerSchema } from "../validations/auth.validation.js";
import { authBruteForceLimiter, authRouteLimiter } from "../middlewares/rateLimit.js";

const authRouter = Router();

authRouter
    .post("/authenticate", authBruteForceLimiter, validateBody(authenticateSchema), authenticate)
    .post("/register", authRouteLimiter, validateBody(registerSchema), register)
    .post("/refresh", authRouteLimiter, validateBody(refreshSchema), refresh)
    .post("/logout", authRouteLimiter, validateBody(refreshSchema), logout);

export default authRouter
