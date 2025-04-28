import { db } from "./db.js";

/**
 * 로그인 - select
 */
export const checkLogin = async ({ id, pwd }) => {
  // {id:'test', pwd:'1234'}
  const sql = `
        select count(*) as result_rows from member 
        where id = ? and pwd = ?
    `;
  const [result] = await db.execute(sql, [id, pwd]); // [[], []]
  // [{result_rows : 1}]
  return result[0];
};

/**
 * 아이디 중복체크 - select
 */
export const getIdCheck = async ({ id }) => {
  // {id: 'test'}
  const sql = `
        select count(id) as result from member where id = ?
    `;
  const [result, fields] = await db.execute(sql, [id]);

  return result[0];
};

/**
 * 이메일 중복체크 - select
 */
export const getEmailCheck = async (email) => {
  const [emailname, emaildomain] = email.split("@");
  const sql = `
        select count(*) as result from member 
        where emailname = ? and emaildomain = ?
    `;
  const [result] = await db.execute(sql, [emailname, emaildomain]);
  return result[0];
};

/**
 * 회원가입 - insert
 */
export const registerMember = async (formData) => {
  //1. SQL 생성
  const sql = `
    INSERT INTO member(
      ID, PWD, NAME, PHONE, EMAILNAME, EMAILDOMAIN,
      GRADE, PROVIDER, MDATE
    ) VALUES (?, ?, ?, ?, ?, ?, 'BRONZE', 'local', NOW())
  `;

  const values = [
    formData.id,
    formData.pwd,
    formData.name,
    formData.phone,
    formData.emailname,
    formData.emaildomain,
  ];

  //2. db객체를 이용하여 SQL 실행 후 결과 가져오기
  const [result] = await db.execute(sql, values);

  //3. 결과값 리턴
  return { result_rows: result.affectedRows };
};

/**
 * SNS ID로 회원 조회
 */
export const getMemberBySnsId = async (snsId) => {
  const sql = `SELECT * FROM member WHERE ID = ?`;
  const [rows] = await db.execute(sql, [snsId]);
  return rows[0];
};

/**
 * 네이버 회원 등록
 */
export const registerNaverMember = async ({ snsId, name, phone, email }) => {
  const [emailname, emaildomain] = email.split('@');
  
  const sql = `
    INSERT INTO member(
      ID, NAME, PHONE, EMAILNAME, EMAILDOMAIN,
      GRADE, PROVIDER, MDATE
    ) VALUES (?, ?, ?, ?, ?, 'BRONZE', 'naver', NOW())
  `;

  const values = [
    snsId,
    name,
    phone || null,
    emailname,
    emaildomain
  ];

  const [result] = await db.execute(sql, values);
  return result;
};

/**
 * 카카오 회원 등록
 */
export const registerKakaoMember = async ({ snsId, name, phone, email }) => {
  let finalEmail = email;
  if (!email || !email.includes("@")) {
    finalEmail = `user${snsId}@kakao.local`;
  }
  
  const [emailname, emaildomain] = finalEmail.split('@');
  
  const sql = `
    INSERT INTO member(
      ID, NAME, PHONE, EMAILNAME, EMAILDOMAIN,
      GRADE, PROVIDER, MDATE
    ) VALUES (?, ?, ?, ?, ?, 'BRONZE', 'kakao', NOW())
  `;

  const values = [
    snsId,
    name,
    phone || "010-0000-0000",
    emailname,
    emaildomain
  ];

  const [result] = await db.execute(sql, values);
  return result;
};

/**
 * 구글 회원 등록
 */
export const registerGoogleMember = async ({ snsId, name, phone, email }) => {
  const [emailname, emaildomain] = email.split('@');
  
  const sql = `
    INSERT INTO member(
      ID, NAME, PHONE, EMAILNAME, EMAILDOMAIN,
      GRADE, PROVIDER, MDATE
    ) VALUES (?, ?, ?, ?, ?, 'BRONZE', 'google', NOW())
  `;

  const values = [
    snsId,
    name,
    phone || "010-0000-0000",
    emailname,
    emaildomain
  ];

  const [result] = await db.execute(sql, values);
  return result;
};

/**
 * 아이디 찾기 이메일 인증
 */
// 인증번호 저장
export const saveEmailCode = async (email, code, expiresAt) => {
  const sql = `INSERT INTO auth_code (email, code, expires_at) VALUES (?, ?, ?)`;
  await db.execute(sql, [email, code, expiresAt]);
};

// 인증번호 유효성 확인
export const checkEmailCode = async (email, code) => {
  const sql = `SELECT * FROM auth_code WHERE email = ? AND code = ? AND expires_at > NOW() ORDER BY expires_at DESC LIMIT 1`;
  const [result] = await db.execute(sql, [email, code]);
  return result.length > 0;
};

// 이메일로 유저 조회
export const getUserByEmail = async (email) => {
  const sql = `SELECT id FROM member WHERE CONCAT(emailname, '@', emaildomain) = ?`;
  const [result] = await db.execute(sql, [email]);
  return result[0];
};

// 아이디와 이메일로 사용자 조회
export const getUserByIdAndEmail = async (id, email) => {
  const query = `
    SELECT * FROM member 
    WHERE id = ? AND CONCAT(emailname, '@', emaildomain) = ?
  `;
  const [rows] = await db.execute(query, [id, email]);
  return rows[0];
};

// 비밀번호 업데이트
export const updatePassword = async (id, newPassword) => {
  const query = `
    UPDATE member 
    SET pwd = ? 
    WHERE id = ?
  `;
  await db.execute(query, [newPassword, id]);
};

// 아이디로 이메일 조회
export const getEmailById = async (id) => {
  const sql = `SELECT emailname, emaildomain FROM member WHERE id = ?`;
  const [result] = await db.execute(sql, [id]);
  return result[0];
};

// 비밀번호 체크
export const checkPassword = async (id, password) => {
  const [rows] = await db.execute(
    "SELECT COUNT(*) as count FROM member WHERE id = ? AND pwd = ?",
    [id, password]
  );
  return rows[0].count > 0;
};

/**
 * 모든 회원 정보 조회
 */
export const getAllMembers = async () => {
  const sql = `
    SELECT 
      ID,
      NAME,
      PHONE,
      EMAILNAME,
      EMAILDOMAIN,
      GRADE,
      MDATE,
      PROVIDER
    FROM member
    ORDER BY MDATE DESC
  `;

  try {
    const [rows] = await db.execute(sql);
    return rows;
  } catch (error) {
    console.error("회원 목록 조회 실패:", error);
    throw error;
  }
};

/**
 * 회원 정보 수정
 */
export const updateMemberInfo = async (id, { name, phone }) => {
  const sql = `
    UPDATE member 
    SET NAME = ?, PHONE = ?
    WHERE ID = ?
  `;
  
  const [result] = await db.execute(sql, [name, phone, id]);
  return result;
};

/**
 * 회원 탈퇴
 */
export const deleteMember = async (id) => {
  try {
    const sql = "DELETE FROM member WHERE id = ?";
    const [result] = await db.execute(sql, [id]);
    return result;
  } catch (error) {
    console.error("회원 탈퇴 중 오류 발생:", error);
    throw error;
  }
};
