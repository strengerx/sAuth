import express from "express";
import authRouter from "./routes/auth.routes.js";
import morgan from "morgan";
import { notFound } from "./errors/httpErrors.js";
import { globalErrorHandler } from "./errors/errorHandler.js";
import { success } from "./responses/apiResponse.js";
import { authorize } from "./middlewares/authorize.js";
import userRouter from "./routes/user.routes.js";
const app = express();

app.use(morgan("dev"));

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.get("/", (req, res) => { return success(res, null, "application is running!"); });

app.use("/auth", authRouter);

app.get("/protected", authorize(), (req, res) => { return success(res, req.user, "authorized") });
app.use("/users", authorize(), userRouter);

app.use((req, res, next) => { next(notFound(`Cannot ${req.method} ${req.originalUrl}`)) });
app.use(globalErrorHandler);

export default app
