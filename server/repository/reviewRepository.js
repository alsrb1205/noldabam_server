import { db as firestoreDb } from "../firebase/firebaseAdmin.js";

// 파이어베이스에 숙박 리뷰 저장
export const saveAccReviewToFirebase = async ({
  type,
  userId,
  orderId,
  accommodationId,
  reviewContent,
  rating,
  imageUrls,
  roomName
}) => {

  if (type === "accommodation") {
    const docRef = await firestoreDb
      .collection("accommodation_reviews")
      .add({ // 🔁 랜덤 ID 문서 생성
        type,
        userId,
        orderId,
        accommodationId,
        imageUrls,
        reviewContent,
        rating,
        roomName,
        createdAt: new Date(),
      });

    console.log("✅ Firestore 저장 완료 - 문서 ID:", docRef.id);
  }
};


// 파이어베이스에 테마 리뷰 저장
export const saveThemeReviewToFirebase = async ({
  type,
  userId,
  orderId,
  performanceId,
  reviewContent,
  rating,
  imageUrls
}) => {


  if (type === "theme") {
    const docRef = await firestoreDb
      .collection("theme_reviews")
      .add({ // ✅ 자동 문서 ID 생성
        type,
        userId,
        orderId,
        performanceId,
        imageUrls,
        reviewContent,
        rating,
        createdAt: new Date(),
      });

    console.log("✅ Firestore 저장 완료 - 문서 ID:", docRef.id);
  }
};

// 테마 리뷰 삭제
export const deleteThemeReview = async (reviewId) => {
  try {
    
    const docRef = firestoreDb.collection("theme_reviews").doc(reviewId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      throw new Error("리뷰를 찾을 수 없습니다.");
    }
    
    await docRef.delete();
    console.log("✅ Firestore에서 테마 리뷰 삭제 완료");
    return { success: true };
  } catch (error) {
    console.error("❌ Firestore에서 테마 리뷰 삭제 실패:", error);
    throw error;
  }
};

// 숙박 리뷰 삭제
export const deleteAccReview = async (reviewId) => {
  try {
    
    const docRef = firestoreDb.collection("accommodation_reviews").doc(reviewId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      throw new Error("리뷰를 찾을 수 없습니다.");
    }
    
    await docRef.delete();
    console.log("✅ Firestore에서 숙박 리뷰 삭제 완료");
    return { success: true };
  } catch (error) {
    console.error("❌ Firestore에서 숙박 리뷰 삭제 실패:", error);
    throw error;
  }
};
