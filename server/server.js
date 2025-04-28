import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import path from "path";
// import session from "express-session";
import memberRouter from "./router/memberRouter.js";
import kopisRouter from "./router/kopisRouter.js";
import paymentRouter from './router/paymentRouter.js';
import accommodationRouter from "./router/accommodationRouter.js";
import reviewRouter from "./router/reviewRouter.js";
import orderRouter from "./router/orderRouter.js";
import couponRouter from "./router/couponRouter.js";
import accOrderRouter from "./router/accOrderRouter.js";
import adminRouter from "./router/adminRouter.js";
import chatRouter from "./router/chatRouter.js";
import uploadRouter from "./router/uploadRouter.js";

// 서버 생성 및 포트 정의
const server = express();
const port = 9000;

/** 서버의 공통적인 작업 */
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
server.use("/upload_files", express.static(path.join(process.cwd(), "upload_files"))); //저장폴더 연결

/** 서버의 요청처리를 위한 미들웨어 정의 */
// 세션 설정
// server.use(session({
//   secret: 'your-secret-key',
//   resave: false,
//   saveUninitialized: true,
//   cookie: {
//     secure: false, // 개발 환경에서는 false, 프로덕션에서는 true
//     maxAge: 24 * 60 * 60 * 1000 // 24시간
//   }
// }));

server.use("/member", memberRouter);
server.use('/uploads', uploadRouter);
server.use("/order", orderRouter);
server.use("/kopis", kopisRouter);
server.use("/accommodation", accommodationRouter);
server.use("/accReview", reviewRouter);
server.use("/themeReview", reviewRouter);
server.use("/coupons", couponRouter);
server.use("/accorder", accOrderRouter);
server.use("/admin", adminRouter);
server.use("/payment", paymentRouter);
server.use("/api/chat", chatRouter);


server.listen(port, () => {
  console.log(`server port ===>> ${port}`);
});
