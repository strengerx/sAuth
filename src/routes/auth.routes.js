import { Router } from "express";
import { authenticate, register } from "../controllers/auth.controller.js";
import { validateBody } from "../middlewares/validateBody.js";
import { authenticateSchema, registerSchema } from "../validations/auth.validation.js";

const authRouter = Router();

authRouter
    .post("/authenticate", validateBody(authenticateSchema), authenticate)
    .post("/register", validateBody(registerSchema), register);

export default authRouter
