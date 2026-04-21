import { Router } from "express";
import * as userController from "../controllers/user.controller.js";
import { requireSameUser } from "../middlewares/authorize.js";

const userRouter = Router();

userRouter
    .get("/me", userController.getCurrentUser)
    .get("/:id", requireSameUser(), userController.getUserById);

export default userRouter;
