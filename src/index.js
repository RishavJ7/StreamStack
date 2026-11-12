import dotenv from "dotenv";
import { DB_NAME } from "./constants.js";
import { app } from "./app.js";
import connectDB from "./db/index.js";

dotenv.config({
    path: "./.env"
});

const PORT = process.env.PORT || 8000;

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running at port: ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("MONGODB connection failed!", error);
    });
