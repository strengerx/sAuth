import app from "./src/app.js";
import { SERVER_PORT } from "./src/configs/env.config.js";
import connectMongoDB from "./src/configs/mongoose.config.js";

const handleStartupError = (error) => {
    console.error("Failed to start server:", error);
    process.exitCode = 1;
};

const startServer = async () => {
    try {
        await connectMongoDB();
        const server = app.listen(SERVER_PORT,
            () => { console.log(`server is running on: http://localhost:${SERVER_PORT}`); }
        );

        server.on("error", handleStartupError);
    } catch (err) {
        handleStartupError(err);
    }
}

startServer();
