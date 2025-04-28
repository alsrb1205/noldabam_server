import * as repository from "../repository/memberRepository.js";
import jwt from "jsonwebtoken";
import axios from "axios";
import nodemailer from "nodemailer";
import { db as firestoreDb } from "../firebase/firebaseAdmin.js";

/**
 * 로그인 : checkLogin
 */
export const checkLogin = async (req, res) => {
  const { id, pwd, recaptchaToken } = req.body;

  // ✅ reCAPTCHA 검증
  try {
    if (!recaptchaToken) {
      return res.status(400).json({ error: "reCAPTCHA 검증이 필요합니다." });
    }

    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify`;
    const verifyRes = await axios.post(
      verifyUrl,
      {},
      {
        params: {
          secret: process.env.RECAPTCHA_CLIENT_SECRET,
          response: recaptchaToken,
        },
        timeout: 5000, // 5초로 타임아웃 감소
        retry: 3, // 재시도 횟수 증가
        retryDelay: 500, // 재시도 간격 감소
      }
    );

    const { success } = verifyRes.data;

    if (!success) {
      return res.status(400).json({ error: "reCAPTCHA 검증에 실패했습니다." });
    }

    // 로그인 로직
    let result = await repository.checkLogin({ id, pwd });

    if (result.result_rows === 1) {
      const token = jwt.sign({ userId: id }, "moJQzU5U3I");
      result = { ...result, token: token };
    }

    res.json(result);
  } catch (err) {
    console.error("reCAPTCHA 오류:", err.message);
    if (err.code === "ECONNABORTED") {
      return res.status(408).json({
        error: "reCAPTCHA 서버 응답 시간이 초과되었습니다. 다시 시도해주세요.",
      });
    }
    res
      .status(500)
      .json({ error: "인증 처리 중 오류가 발생했습니다. 다시 시도해주세요." });
  }
};

/**
 * 아이디 중복체크 : getIdCheck
 */
export const getIdCheck = async (req, res) => {
  const result = await repository.getIdCheck(req.body);
  res.json(result);
  res.end();
};

/**
 * 회원가입 : registerMember
 */
export const registerMember = async (req, res) => {
  const formData = req.body;
  
  const result = await repository.registerMember(formData);

  // 회원가입 성공 시 신규가입 쿠폰 발급
  if (result.result_rows === 1) {
    try {
      const couponData = {
        id: formData.id,
        name: formData.name,
        grade: "BRONZE",
        amount: 3000,
        text: "신규가입 쿠폰",
        updatedAt: new Date().toISOString(),
      };

      // Firestore에 쿠폰 저장
      const couponRef = firestoreDb
        .collection("coupons")
        .doc(`${formData.id}_welcome`);
      await couponRef.set(couponData);

    } catch (err) {
      console.error("🔥 신규가입 쿠폰 발급 실패:", err);
      // 쿠폰 발급 실패는 회원가입 성공에 영향을 주지 않도록 함
    }
  }

  res.json(result);
  res.end();
};

// 네이버 토큰 발급
export const getNaverToken = async (req, res) => {
  const { code, state } = req.body;

  try {
    const response = await axios.get("https://nid.naver.com/oauth2.0/token", {
      params: {
        grant_type: "authorization_code",
        client_id: process.env.NAVER_CLIENT_ID,
        client_secret: process.env.NAVER_CLIENT_SECRET,
        code,
        state,
      },
    });

    res.json(response.data); // access_token 등
  } catch (error) {
    console.error("네이버 토큰 발급 실패:", error.message);
    res.status(500).json({ error: "네이버 토큰 발급 실패" });
  }
};

// 네이버 유저 정보 가져오기 수정본
export const getNaverUserInfo = async (req, res) => {
  const { token } = req.body;

  try {
    const response = await axios.get("https://openapi.naver.com/v1/nid/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const user = response.data.response;
    const snsId = user.id;

    if (!snsId) {
      return res.status(400).json({ error: "네이버 사용자 ID가 없습니다." });
    }

    // ✅ 존재 여부 먼저 체크
    const existUser = await repository.getMemberBySnsId(snsId);

    if (existUser) {
      const jwtToken = jwt.sign({ userId: snsId }, "moJQzU5U3I");
      return res.json({ user: existUser, token: jwtToken });
    }

    // ✅ insert 전에도 한번 더 존재 확인하고, 없으면 insert
    const phone = user.mobile || null;
    await repository.registerNaverMember({
      snsId: user.id,
      name: user.name,
      phone,
      email: user.email,
    });

    // 신규 가입 시 쿠폰 발급
    try {
      const couponData = {
        id: user.id,  // sns_id 사용
        name: user.name,
        grade: "BRONZE",
        amount: 3000,
        text: "신규가입 쿠폰",
        updatedAt: new Date().toISOString(),
      };

      const couponRef = firestoreDb
        .collection("coupons")
        .doc(`${user.id}_welcome`);  // sns_id 사용
      await couponRef.set(couponData);

    } catch (err) {
      console.error("🔥 신규가입 쿠폰 발급 실패:", err);
    }

    const newUser = await repository.getMemberBySnsId(snsId);
    const jwtToken = jwt.sign({ userId: snsId }, "moJQzU5U3I");

    res.json({ user: newUser, token: jwtToken });
  } catch (error) {
    console.error(
      "🔥 네이버 유저 정보 요청 실패:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "네이버 유저 정보 요청 실패" });
  }
};

// ✅ 카카오 토큰 발급
export const getKakaoToken = async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "인가 코드(code)가 없습니다." });
  }

  try {
    const response = await axios.post(
      `https://kauth.kakao.com/oauth/token`,
      null,
      {
        params: {
          grant_type: "authorization_code",
          client_id: process.env.KAKAO_CLIENT_ID,
          client_secret: process.env.KAKAO_CLIENT_SECRET,
          redirect_uri: process.env.KAKAO_REDIRECT_URI,
          code,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const access_token = response.data.access_token;
    if (!access_token) {
      return res.status(400).json({ error: "토큰 발급 실패" });
    }

    res.json({ access_token });
  } catch (error) {
    console.error(
      "카카오 토큰 발급 실패:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "카카오 토큰 발급 실패" });
  }
};

// ✅ 카카오 유저 정보
export const getKakaoUserInfo = async (req, res) => {
  const { token } = req.body;

  if (!token || token === "undefined") {
    return res.status(400).json({ error: "유효하지 않은 토큰" });
  }

  try {
    const response = await axios.get("https://kapi.kakao.com/v2/user/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const kakaoUser = response.data;

    if (!kakaoUser || !kakaoUser.id) {
      return res.status(400).json({ error: "카카오 유저 정보 없음" });
    }

    const snsId = kakaoUser.id.toString();
    const name = kakaoUser.properties?.nickname || "이름없음";
    const email = kakaoUser.kakao_account?.email;

    const existUser = await repository.getMemberBySnsId(snsId);

    if (existUser) {
      const jwtToken = jwt.sign({ userId: snsId }, "moJQzU5U3I");
      res.json({ user: { ...existUser, sns_id: snsId }, token: jwtToken });
    } else {
      const phone = kakaoUser.kakao_account?.phone_number || null;
      await repository.registerKakaoMember({ snsId, name, email, phone });

      // 신규 가입 시 쿠폰 발급
      try {
        const couponData = {
          id: snsId,  // sns_id 사용
          name: name,
          grade: "BRONZE",
          amount: 3000,
          text: "신규가입 쿠폰",
          updatedAt: new Date().toISOString(),
        };

        const couponRef = firestoreDb
          .collection("coupons")
          .doc(`${snsId}_welcome`);  // sns_id 사용
        await couponRef.set(couponData);

      } catch (err) {
        console.error("🔥 신규가입 쿠폰 발급 실패:", err);
      }

      const jwtToken = jwt.sign({ userId: snsId }, "moJQzU5U3I");
      res.json({
        user: {
          sns_id: snsId,
          name,
          phone,
          email: email || `user${snsId}@kakao.local`,
          provider: "kakao",
        },
        token: jwtToken,
      });
    }
  } catch (error) {
    console.error(
      "카카오 유저 정보 요청 실패:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "카카오 유저 정보 요청 실패" });
  }
};

// 구글 토큰 정보
export const getGoogleToken = async (req, res) => {
  const { code } = req.body;

  try {
    const response = await axios.post(
      "https://oauth2.googleapis.com/token",
      null,
      {
        params: {
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: process.env.GOOGLE_REDIRECT_URI,
          grant_type: "authorization_code",
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    res.json({ access_token: response.data.access_token });
  } catch (error) {
    console.error(
      "구글 토큰 발급 실패:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "구글 토큰 발급 실패" });
  }
};

export const getGoogleUserInfo = async (req, res) => {
  const { token } = req.body;

  try {
    const response = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const { id, name, email } = response.data;

    const snsId = id.toString();
    const phone = null;

    const existUser = await repository.getMemberBySnsId(snsId);

    if (existUser) {
      const jwtToken = jwt.sign({ userId: snsId }, "moJQzU5U3I");
      res.json({ user: { ...existUser, sns_id: snsId }, token: jwtToken });
    } else {
      await repository.registerGoogleMember({
        snsId,
        name,
        email,
        phone,
      });

      // 신규 가입 시 쿠폰 발급
      try {
        const couponData = {
          id: snsId,  // sns_id 사용
          name: name,
          grade: "BRONZE",
          amount: 3000,
          text: "신규가입 쿠폰",
          updatedAt: new Date().toISOString(),
        };

        const couponRef = firestoreDb
          .collection("coupons")
          .doc(`${snsId}_welcome`);  // sns_id 사용
        await couponRef.set(couponData);

      } catch (err) {
        console.error("🔥 신규가입 쿠폰 발급 실패:", err);
      }

      const jwtToken = jwt.sign({ userId: snsId }, "moJQzU5U3I");
      res.json({
        user: { sns_id: snsId, name, phone, email, provider: "google" },
        token: jwtToken,
      });
    }
  } catch (error) {
    console.error(
      "구글 유저 정보 요청 실패:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "구글 유저 정보 요청 실패" });
  }
};

// 인증번호 전송
export const sendEmailCode = async (req, res) => {
  try {
    const { email, id } = req.body;

    // 비밀번호 찾기의 경우 (id가 있는 경우)
    if (id) {
      // 아이디와 이메일이 일치하는지 확인
      const user = await repository.getUserByIdAndEmail(id, email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "아이디와 이메일이 일치하지 않습니다.",
        });
      }
    } else {
      // 아이디 찾기의 경우 (이메일만 있는 경우)
      const user = await repository.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "등록되지 않은 이메일 주소입니다.",
        });
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3분 후 만료

    // 이메일이 존재하는 경우에만 인증 코드 저장 및 이메일 전송
    await repository.saveEmailCode(email, code, expiresAt);
    await sendEmail(
      email,
      id ? "Airlime 비밀번호 재설정 인증번호" : "Airlime 아이디 찾기 인증번호",
      `인증번호는 ${code} 입니다. 3분 안에 입력해주세요.`
    );

    res.json({ success: true });
  } catch (error) {
    console.error("이메일 전송 오류:", error);
    res.status(500).json({
      success: false,
      message: "이메일 전송 중 오류가 발생했습니다.",
    });
  }
};

// 인증번호 검증 + 아이디 찾기
export const verifyEmailCode = async (req, res) => {
  const { email, code } = req.body;

  const isValid = await repository.checkEmailCode(email, code);
  if (!isValid)
    return res
      .status(400)
      .json({ success: false, message: "인증번호 오류 또는 만료" });

  const user = await repository.getUserByEmail(email);
  if (!user)
    return res
      .status(404)
      .json({ success: false, message: "등록된 아이디가 없습니다." });

  res.json({ success: true, userId: user.id });
};

export const sendEmail = async (to, subject, content) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail", // 또는 'Gmail', 'Naver', 'Daum', 'Yahoo' 등
    auth: {
      user: process.env.MAIL_ID,
      pass: process.env.MAIL_PW,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const info = await transporter.sendMail({
    from: `"Airlime 인증메일" <${process.env.MAIL_ID}>`,
    to,
    subject,
    text: content,
  });

};

/**
 * 이메일 중복체크 : getEmailCheck
 */
export const getEmailCheck = async (req, res) => {
  const { email } = req.body;
  const result = await repository.getEmailCheck(email);
  res.json(result);
  res.end();
};

// 비밀번호 재설정
export const resetPassword = async (req, res) => {
  try {
    const { id, email, newPassword } = req.body;

    // 아이디와 이메일이 일치하는지 확인
    const user = await repository.getUserByIdAndEmail(id, email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "아이디와 이메일이 일치하지 않습니다.",
      });
    }

    // 기존 비밀번호와 동일한지 확인
    const currentPasswordCheck = await repository.checkPassword(
      id,
      newPassword
    );
    if (currentPasswordCheck) {
      return res.status(400).json({
        success: false,
        message: "현재 사용 중인 비밀번호는 사용할 수 없습니다.",
      });
    }

    // 비밀번호 업데이트
    await repository.updatePassword(id, newPassword);

    res.json({
      success: true,
      message: "비밀번호가 성공적으로 변경되었습니다.",
    });
  } catch (error) {
    console.error("비밀번호 재설정 오류:", error);
    res.status(500).json({
      success: false,
      message: "비밀번호 재설정 중 오류가 발생했습니다.",
    });
  }
};

// 아이디로 이메일 조회
export const getEmailById = async (req, res) => {
  try {
    const { id } = req.body;

    const emailData = await repository.getEmailById(id);
    if (!emailData) {
      return res.status(404).json({
        success: false,
        message: "존재하지 않는 아이디입니다.",
      });
    }

    // 이메일 중간 부분을 *로 가리기
    const emailname = emailData.emailname;
    let maskedEmailname;

    if (emailname.length <= 3) {
      // 3자 이하인 경우 첫 글자만 보이고 나머지는 *
      maskedEmailname = emailname.charAt(0) + "*".repeat(emailname.length - 1);
    } else {
      // 3자 초과인 경우 첫 2자와 마지막 1자만 보이고 나머지는 *
      maskedEmailname =
        emailname.substring(0, 2) +
        "*".repeat(emailname.length - 3) +
        emailname.charAt(emailname.length - 1);
    }

    const maskedEmail = `${maskedEmailname}@${emailData.emaildomain}`;

    res.json({
      success: true,
      maskedEmail,
      fullEmail: `${emailData.emailname}@${emailData.emaildomain}`,
    });
  } catch (error) {
    console.error("이메일 조회 오류:", error);
    res.status(500).json({
      success: false,
      message: "이메일 조회 중 오류가 발생했습니다.",
    });
  }
};

/**
 * 모든 회원 정보 조회 : getAllMembers
 */
export const getAllMembers = async (req, res) => {
  try {
    const members = await repository.getAllMembers();
    res.json(members);
  } catch (error) {
    console.error("회원 목록 조회 실패:", error);
    res.status(500).json({ error: "회원 목록을 가져오는데 실패했습니다." });
  }
};

/**
 * 회원 정보 수정
 */
export const updateMemberInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone } = req.body;
    
    const result = await repository.updateMemberInfo(id, { name, phone });
    
    if (result.affectedRows === 1) {
      res.json({ success: true, message: "회원 정보가 수정되었습니다." });
    } else {
      res.status(404).json({ success: false, message: "회원 정보를 찾을 수 없습니다." });
    }
  } catch (error) {
    console.error("회원 정보 수정 실패:", error);
    res.status(500).json({ success: false, message: "회원 정보 수정 중 오류가 발생했습니다." });
  }
};

/**
 * 회원 탈퇴
 */
export const deleteMember = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: "회원 ID가 필요합니다." 
      });
    }
    
    const result = await repository.deleteMember(id);
    
    if (result.affectedRows === 1) {
      res.json({ 
        success: true, 
        message: "회원 탈퇴가 완료되었습니다." 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: "회원 정보를 찾을 수 없습니다." 
      });
    }
  } catch (error) {
    console.error("회원 탈퇴 실패:", error);
    res.status(500).json({ 
      success: false, 
      message: "회원 탈퇴 중 오류가 발생했습니다.",
      error: error.message 
    });
  }
};