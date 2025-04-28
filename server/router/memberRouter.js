import express from "express";
import * as controller from "../controller/memberController.js";

const router = express.Router();

router
  .get("/list", controller.getAllMembers) // 여기서 모든 회원 정보 불러옴
  .post("/login", controller.checkLogin)
  .post("/idcheck", controller.getIdCheck)
  .post("/emailcheck", controller.getEmailCheck)
  .post("/signup", controller.registerMember)

  .post("/naver/token", controller.getNaverToken)
  .post("/naver/userinfo", controller.getNaverUserInfo)

  .post("/kakao/token", controller.getKakaoToken)
  .post("/kakao/userinfo", controller.getKakaoUserInfo)

  .post("/google/token", controller.getGoogleToken)
  .post("/google/userinfo", controller.getGoogleUserInfo)

  .post("/send-code", controller.sendEmailCode)
  .post("/verify-code", controller.verifyEmailCode)
  .post("/reset-password", controller.resetPassword)
  .post("/get-email", controller.getEmailById)
  .put("/:id", controller.updateMemberInfo)
  .delete("/:id", controller.deleteMember);

export default router;
