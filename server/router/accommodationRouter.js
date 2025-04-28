import express from "express";
import { accommodationData, keywordSearch } from "../controller/accommodationController.js";

const router = express.Router();
router.get("/search", accommodationData);
router.get("/searchKeyword", keywordSearch);

export default router;
