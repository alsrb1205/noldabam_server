import express from "express";
import { handleChatMessage } from "../controller/chatController.js";

const router = express.Router();

router.post("/", handleChatMessage);

export default router; 