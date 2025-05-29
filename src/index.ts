
import app from "./app.js";
import connectToDb from "./db/index.js";
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectToDb();
        app.listen(PORT, () => {
         console.log(`✅ Server listening on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error(`Failed to connect to MongoDB: ${(error as Error).message}`);
        process.exit(1); // Exit the worker if DB connection fails
    }
};

startServer();
