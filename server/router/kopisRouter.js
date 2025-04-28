import express from "express";
import { getKopisSearch, getKopisDetail, getKopisVenue } from "../controller/kopisController.js";

const router = express.Router();

// 공연 검색
router.get("/search", getKopisSearch);

// 공연 상세 정보 조회
router.get("/detail/:id", getKopisDetail);

// 공연장 상세 정보 조회
router.get("/venue/:venueId", getKopisVenue);

export default router;
