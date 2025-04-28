import express from "express";
import {
  writeAccReview,
  writeThemeReview,
  getAccReviewList,
  getThemeReviewList,
  getAccReviewsByAccommodationId,
  getPerReviewsByPerformanceId,
  deleteReview,
  deleteAccReview
} from "../controller/reviewController.js";

const router = express.Router();

// 리뷰 작성
router.post("/accommodation", writeAccReview);
router.post("/theme", writeThemeReview);

// 리뷰 목록 조회
router.get("/accReviewList", getAccReviewList);
router.get("/themeReviewList", getThemeReviewList);

// 특정 숙소/공연의 리뷰 조회
router.get("/accommodation/:accommodationId", getAccReviewsByAccommodationId);
router.get("/theme/performance/:performanceId", getPerReviewsByPerformanceId);

// 리뷰 삭제
router.delete("/theme/delete/:reviewId", deleteReview);
router.delete("/accommodation/delete/:reviewId", deleteAccReview);

export default router;
