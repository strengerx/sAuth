import app from "./src/app.js";
import { SERVER_PORT } from "./src/configs/env.config.js";
import connectMongoDB from "./src/configs/mongoose.config.js";
import { logError, logInfo } from "./src/utils/logger.js";

const handleStartupError = (error) => {
    logError("startup_failed", { message: error.message });
    process.exitCode = 1;
};

const startServer = async () => {
    try {
        await connectMongoDB();
        const server = app.listen(SERVER_PORT,
            () => {
                logInfo("server_started", {
                    port: SERVER_PORT,
                    url: `http://localhost:${SERVER_PORT}`,
                });
            }
        );

        server.on("error", handleStartupError);
    } catch (err) {
        handleStartupError(err);
    }
}

startServer();
