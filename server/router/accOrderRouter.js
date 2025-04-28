import express from "express";
import * as controller from "../controller/accOrderController.js";
import { cancelAccommodationOrder } from "../repository/accOrderRepository.js";

const router = express.Router();

// 숙박 예약 생성
router.post("/create", controller.accommodationOrder);

// 숙박 예약 목록 조회
router.get("/list", controller.getAccommodationOrders);

// 카카오페이 결제 승인
router.post("/kakao/approve", controller.approveKakaoPay);

// 최근 숙박 예약 정보 조회
router.get('/accommodation/latest/:user_id', controller.getLatestAccommodationOrder);

// 숙박 예약 취소
router.delete("/cancel/:orderId", controller.cancelAccommodationOrder);

export default router; 