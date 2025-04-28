import express from 'express';
import * as controller from '../controller/paymentController.js';

const router = express.Router();

// 카카오페이 QR 결제
router.post('/qr', controller.paymentKakaopay);

// 카카오페이 결제 승인
router.post('/approve', controller.approveKakaoPay);

export default router; 