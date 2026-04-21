import express from "express";
import authRouter from "./routes/auth.routes.js";
import { notFound } from "./errors/httpErrors.js";
import { globalErrorHandler } from "./errors/errorHandler.js";
import { success } from "./responses/apiResponse.js";
import { authorize } from "./middlewares/authorize.js";
import userRouter from "./routes/user.routes.js";
import { getMongoReadiness } from "./configs/mongoose.config.js";
import { requestContext } from "./middlewares/requestContext.js";
import { isReady as isSessionStoreReady } from "./services/tokenSession.service.js";

const app = express();

app.use(requestContext);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.get("/", (req, res) => { return success(res, null, "application is running!"); });

app.get("/health/live", (req, res) => {
    return success(res, { live: true }, "service is live");
});

app.get("/health/ready", (req, res) => {
    const mongo = getMongoReadiness();
    const sessions = isSessionStoreReady();
    const ready = mongo.ready && sessions;

    return success(
        res,
        { ready, dependencies: { mongo, sessionStore: { ready: sessions } } },
        ready ? "service is ready" : "service is not ready",
        ready ? 200 : 503
    );
});

app.use("/auth", authRouter);

app.get("/protected", authorize(), (req, res) => { return success(res, req.user, "authorized") });
app.use("/users", authorize(), userRouter);

app.use((req, res, next) => { next(notFound(`Cannot ${req.method} ${req.originalUrl}`)) });
app.use(globalErrorHandler);

export default app
