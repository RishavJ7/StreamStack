import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration with flexible environment variable names
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_CLOUD_API_KEY || process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_CLOUD_API_SECRET || process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET_KEY
});

const uploadCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        // Upload the file to Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });
        // Remove local temporary file once uploaded
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return response;
    } catch (error) {
        // Remove the locally saved temporary file on failure
        if (localFilePath && fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return null;
    }
};

const deleteFromCloudinary = async (publicId, resourceType = "image") => {
    try {
        if (!publicId) return null;
        const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        console.log("Cloudinary delete result:", result);
        return result;
    } catch (error) {
        console.error("Error deleting from Cloudinary:", error);
        throw error;
    }
};

export { uploadCloudinary, deleteFromCloudinary };
