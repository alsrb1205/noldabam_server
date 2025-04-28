import express from "express";
import { saveCoupon, getCoupon, deleteCoupon, getUserCoupon } from "../controller/couponController.js";

const router = express.Router();

router.post("/save", saveCoupon);
router.get("/get", getCoupon); // 쿠폰 발급 받은 전체 인원
router.get("/getId", getUserCoupon); // 해당 아이디의 쿠폰 리스트
router.delete("/delete/:id", deleteCoupon); // ✅ 수정된 부분

export default router;
