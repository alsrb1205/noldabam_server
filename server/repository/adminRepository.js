import { db } from "./db.js";

export const getAdminWithPassword = async (adminId) => {
  try {
    const [rows] = await db.query(
      "SELECT admin_id, password FROM admins WHERE admin_id = ?",
      [adminId]
    );
    return rows[0]; // 없으면 undefined 반환됨
  } catch (error) {
    throw error;
  }
};
