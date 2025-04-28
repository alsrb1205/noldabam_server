// server/router/uploadRouter.js

import express from "express";
// uploadController.js 파일의 경로가 정확한지 확인하세요.
// 보통 controller 폴더 안에 있으므로 '../controller/uploadController.js'가 맞을 것입니다.
import * as Controller from "../controller/uploadController.js";

const router = express.Router();

// POST 요청을 /uploads/ 경로로 받아서 Controller.fileUpload 함수를 실행합니다.
// 클라이언트에서는 `http://localhost:9000/uploads/?maxFiles=...` 형태로 요청해야 합니다.
router.post("/", Controller.fileUpload);

export default router;