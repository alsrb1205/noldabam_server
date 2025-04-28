// repository/couponRepository.js
import { db as firestoreDb } from "../firebase/firebaseAdmin.js";

export const saveCoupon = async ({ id, name, grade, amount }) => {
    const couponRef = firestoreDb.collection("coupons").doc(id);

    // 기존 데이터 병합 방식 (기존 내용 유지하면서 갱신)
    await couponRef.set(
        {
            id,
            name,
            grade,
            amount,
            updatedAt: new Date().toISOString()
        },
        { merge: true }
    );
};
