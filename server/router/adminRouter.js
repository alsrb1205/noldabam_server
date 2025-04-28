import express from "express";
import { getAdminAuth } from "../controller/adminController.js";
import { verifyAdminToken } from "../middleWare/verifyAdminToken.js"; // 🔐 토큰 인증 미들웨어

const router = express.Router();

// ✅ 로그인 요청 (비밀번호 bcrypt 비교 후 토큰 발급)
router.post("/getAuth", getAdminAuth);

// ✅ 보호된 관리자 페이지 접근 (JWT 인증 필요)
router.get("/active", verifyAdminToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: "토큰 인증 완료. 관리자 페이지 접근 허용.",
    admin: req.admin // 토큰에서 추출된 adminId 정보 등
  });
});

export default router;
