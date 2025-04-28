import jwt from "jsonwebtoken";

//인증 미들웨어 (관리자)
const JWT_SECRET = process.env.ADMIN_JWT_TOKEN;

export const verifyAdminToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "인증 토큰이 없습니다." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET); // 토큰 유효성 검증
    req.admin = decoded; // 이후 미들웨어/라우터에서 사용 가능
    next(); // 통과 시 다음으로 진행
  } catch (err) {
    return res.status(401).json({ success: false, message: "유효하지 않은 토큰입니다." });
  }
};
