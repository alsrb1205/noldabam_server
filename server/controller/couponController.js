// controller/couponController.js
import { saveCoupon as saveCouponToDB } from "../repository/couponRepository.js";
import { db as firestoreDb } from "../firebase/firebaseAdmin.js";

// 추가
export const saveCoupon = async (req, res) => {
  try {
    const couponData = req.body;

    // 유효성 검사 (선택)
    if (
      !couponData.id ||
      !couponData.grade ||
      typeof couponData.amount !== "number"
    ) {
      return res
        .status(400)
        .json({ error: "필수 쿠폰 정보가 누락되었습니다." });
    }

    // Firestore 저장 함수 호출
    await saveCouponToDB(couponData);

    res.status(200).json({ message: "쿠폰 저장 완료", data: couponData });
  } catch (err) {
    console.error("🔥 쿠폰 저장 오류:", err);
    res.status(500).json({ error: "서버 내부 오류" });
  }
};

// 요청
export const getCoupon = async (req, res) => {
  try {
    
    const snapshot = await firestoreDb.collection("coupons").get();

    const couponList = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(couponList);
  } catch (err) {
    console.error("🔥 쿠폰 호출 오류:", err);
    res.status(500).json({ error: "서버 내부 오류" });
  }
};

export const getUserCoupon = async (req, res) => {
  const { userId } = req.query;
  try {
    const userCouponSnapshot = await firestoreDb
      .collection("coupons")
      .where("id", "==", userId) // 🔥 조건 필터링
      .get();

    const couponList = userCouponSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(couponList);
  } catch (err) {
    console.error("🔥 쿠폰 호출 오류:", err);
    res.status(500).json({ error: "서버 내부 오류" });
  }
};

// 삭제
// 삭제
export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "삭제할 쿠폰 ID가 없습니다." });
    }

    // id 필드가 userId와 일치하는 문서 찾기
    const couponSnapshot = await firestoreDb
      .collection("coupons")
      .where("id", "==", id)
      .get();

    if (couponSnapshot.empty) {
      return res.status(404).json({ error: "해당 ID에 해당하는 쿠폰이 없습니다." });
    }

    // 해당하는 모든 쿠폰 문서 삭제
    const batch = firestoreDb.batch();
    couponSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    res.status(200).json({ message: `${id}의 쿠폰 삭제 완료` });
  } catch (err) {
    console.error("🔥 쿠폰 삭제 실패:", err);
    res
      .status(500)
      .json({ error: "서버 내부 오류로 쿠폰 삭제에 실패했습니다." });
  }
};

