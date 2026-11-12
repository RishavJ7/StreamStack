import { Router } from "express";
import { verifyJWT, optionalVerifyJWT } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";
import {
    deleteVideo,
    getAllVideos,
    getVideoById,
    publishAVideo,
    togglePublishStatus,
    updateVideo,
    updateVideoThumbnail
} from "../controllers/video.controller.js";

const router = Router();

// Video listing routes (public)
router.route("/").get(getAllVideos);
router.route("/get-all-videos").get(getAllVideos);

// Video upload routes (authenticated)
router.route("/upload-video").post(
    verifyJWT,
    upload.fields([
        { name: "videoFile", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 }
    ]),
    publishAVideo
);
router.route("/").post(
    verifyJWT,
    upload.fields([
        { name: "videoFile", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 }
    ]),
    publishAVideo
);

// Video detail routes (public with optional auth for like status)
router.route("/get-video/:videoId").get(optionalVerifyJWT, getVideoById);
router.route("/:videoId").get(optionalVerifyJWT, getVideoById);

// Protected video management routes
router.route("/update-videoDetails/:videoId").patch(verifyJWT, updateVideo);
router.route("/update-video-thumbnail/:videoId").patch(
    verifyJWT,
    upload.single("thumbnail"),
    updateVideoThumbnail
);
router.route("/delete-video/:videoId").delete(verifyJWT, deleteVideo);
router.route("/toggle-published-status/:videoId").get(verifyJWT, togglePublishStatus);

export default router;
