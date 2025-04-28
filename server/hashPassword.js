import bcrypt from "bcrypt";

const hashPassword = async () => {
  const plainPassword = "admin123";
  const hash = await bcrypt.hash(plainPassword, 10);
  // console.log("해시된 비밀번호:", hash);
};

hashPassword();
// 터미널에서 server폴더 이동 후 node hashPassword.js 실행하면 해시된 비밀번호가 나옴 이걸 mysql에 insert
