import { Router } from "express";
import { verifyJWT, optionalVerifyJWT } from "../middlewares/auth.middlewares.js";
import {
    createTweet,
    deleteTweet,
    getUserTweets,
    updateTweet
} from "../controllers/tweet.controller.js";

const router = Router();

router.route("/create-tweet").post(verifyJWT, createTweet);
router.route("/").post(verifyJWT, createTweet);

router.route("/update-tweet/:tweetId").post(verifyJWT, updateTweet);
router.route("/delete-tweet/:tweetId").post(verifyJWT, deleteTweet);

router.route("/get-user-tweets/:userId").get(optionalVerifyJWT, getUserTweets);
router.route("/get-user-tweeits/:userId").get(optionalVerifyJWT, getUserTweets);
router.route("/user/:userId").get(optionalVerifyJWT, getUserTweets);

export default router;
