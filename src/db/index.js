import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const formatMongoUri = (rawUri, dbName) => {
    if (!rawUri) return "";
    let uri = rawUri.trim();

    let query = "";
    if (uri.includes("?")) {
        const parts = uri.split("?");
        uri = parts[0];
        query = `?${parts.slice(1).join("?")}`;
    }

    uri = uri.replace(/\/+$/, "");

    // If the URI already specifies a database name, don't append DB_NAME again
    const lastSlashIndex = uri.lastIndexOf("/");
    const afterProtocol = uri.indexOf("://") !== -1 ? uri.indexOf("://") + 3 : 0;
    const pathPart = uri.substring(afterProtocol);

    if (pathPart.includes("/")) {
        // A database name is already present
        return `${uri}${query}`;
    }

    return `${uri}/${dbName}${query}`;
};

const connectDB = async () => {
    try {
        const connectionString = formatMongoUri(process.env.MONGODB_URI, DB_NAME);
        const connectionInstance = await mongoose.connect(connectionString);
        console.log(`\n MongoDB connected! DB HOST : ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MONGODB connection error: ", error);
        process.exit(1);
    }
};

export default connectDB;
