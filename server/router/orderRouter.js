import express from "express";
import * as controller from "../controller/orderController.js";

const router = express.Router();

// 공연 예매 생성
router.post("/performance/create", controller.performanceOrder);

// 공연 예매 목록 조회
router.get("/performance/list", controller.getPerformanceOrders);

// 예매된 좌석 조회
router.get("/performance/reserved-seats", controller.getReservedSeats);

// 카카오페이 결제 승인
router.get("/performance/kakao/approve", controller.approveKakaoPay);

// 최근 공연 예매 정보 조회
router.get("/performance/latest/:user_id", controller.getLatestPerformanceOrder);

// 테마 예약 취소
router.delete("/cancel/:orderId", controller.cancelPerformanceOrder);

export default router;
