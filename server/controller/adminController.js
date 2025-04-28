import bcrypt from "bcryptjs"; // 비밀번호 비교를 위한 bcrypt 모듈
import jwt from "jsonwebtoken"; // JWT 토큰 발급을 위한 모듈
import { getAdminWithPassword } from "../repository/adminRepository.js"; // DB에서 관리자 정보 조회 함수

const JWT_SECRET = process.env.ADMIN_JWT_TOKEN; // JWT 서명을 위한 시크릿 키 (환경변수로 관리)

export const getAdminAuth = async (req, res) => {
  const { adminId, adminPassword } = req.body; // 클라이언트에서 전달한 아이디와 비밀번호 추출

  // 🔐 1. 입력값 검증
  if (!adminId || !adminPassword) {
    return res.status(400).json({
      success: false,
      message: "아이디와 비밀번호를 입력해주세요.",
    });
  }

  try {
    // 🔍 2. 아이디에 해당하는 관리자 정보(아이디, 해시된 비밀번호)를 DB에서 가져옴
    const admin = await getAdminWithPassword(adminId);

    // ❌ 아이디가 존재하지 않는 경우
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "존재하지 않는 아이디입니다.",
      });
    }

    // 🔐 3. 입력된 비밀번호와 DB에 저장된 해시된 비밀번호를 bcrypt로 비교
    const isMatch = await bcrypt.compare(adminPassword, admin.password);

    // ❌ 비밀번호가 일치하지 않을 경우
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "비밀번호가 일치하지 않습니다.",
      });
    }

    // ✅ 4. 아이디와 비밀번호가 모두 맞는 경우, JWT 토큰 발급
    const token = jwt.sign({ adminId }, JWT_SECRET, {
      expiresIn: "1h", // 토큰 유효기간 1시간
    });

    // 🧾 5. 발급된 토큰을 서버 로그에 출력 (테스트/확인용)

    // 🔁 6. 클라이언트에 성공 응답과 함께 토큰 반환
    return res.status(200).json({
      success: true,
      message: "로그인 성공",
      token,
    });
  } catch (error) {
    // ⚠️ 7. 서버 오류 처리
    console.error("❌ 로그인 오류:", error);
    return res.status(500).json({
      success: false,
      message: "서버 오류",
    });
  }
};
