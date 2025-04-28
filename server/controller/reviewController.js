import { getAccOrderUserId, getThemeOrderUserId } from "../repository/orderRepository.js";
import { 
  saveAccReviewToFirebase, 
  saveThemeReviewToFirebase,
  deleteThemeReview,
  deleteAccReview as deleteAccReviewFromRepo 
} from "../repository/reviewRepository.js";
import { db as firestoreDb } from "../firebase/firebaseAdmin.js";

// 숙박 리뷰 쓰기
export const writeAccReview = async (req, res) => {
  try {


    const { orderId, reviewContent, rating, type, imageUrls, roomName } = req.body;

    const orderInfo = await getAccOrderUserId(orderId);
    
    if (!orderInfo) {
      return res.status(404).json({ message: "주문 정보를 찾을 수 없습니다." });
    }
    const { userId, accommodationId } = orderInfo;
    
    await saveAccReviewToFirebase({
      type,
      userId,
      orderId,
      accommodationId, // 필요한 경우 포함
      reviewContent,
      rating,
      imageUrls,
      roomName
    });

    res.status(200).json({ message: "리뷰가 성공적으로 등록되었습니다." });
  } catch (err) {
    console.error("❌ 리뷰 저장 실패:", err);
    res.status(500).json({ message: "리뷰 저장 실패", error: err.message });
  }
};

// 테마 리뷰 쓰기 공간
export const writeThemeReview = async (req, res) => {
  try {


    const { orderId, reviewContent, rating, type, imageUrls } = req.body;

    const orderInfo = await getThemeOrderUserId(orderId);
    
    if (!orderInfo) {
      return res.status(404).json({ message: "주문 정보를 찾을 수 없습니다." });
    }

    const { userId, performanceId } = orderInfo; // ✅ 수정

    await saveThemeReviewToFirebase({
      type,
      userId,
      orderId,
      performanceId,  // ✅ 수정
      reviewContent,
      rating,
      imageUrls
    });

    res.status(200).json({ message: "리뷰가 성공적으로 등록되었습니다." });
  } catch (err) {
    console.error("❌ 리뷰 저장 실패:", err);
    res.status(500).json({ message: "리뷰 저장 실패", error: err.message });
  }
};

// 숙박 리뷰 리스트 가져오기
export const getAccReviewList = async (req, res) => {
  try {
    const snapshot = await firestoreDb
      .collection("accommodation_reviews")
      .orderBy("createdAt", "desc") // 최신 순 정렬
      .get();

    const reviews = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(reviews);
  } catch (err) {
    console.error("❌ Firestore에서 리뷰 조회 실패:", err);
    res.status(500).json({ message: "리뷰 불러오기 실패" });
  }
};

// 테마 리뷰 리스트 가져오기
export const getThemeReviewList = async (req, res) => {
  try {
    const snapshot = await firestoreDb
      .collection("theme_reviews")
      .orderBy("createdAt", "desc") // 최신 순 정렬
      .get();

    const reviews = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(reviews);
  } catch (err) {
    console.error("❌ Firestore에서 리뷰 조회 실패:", err);
    res.status(500).json({ message: "리뷰 불러오기 실패" });
  }
};

// 특정 숙소의 리뷰만 가져오기
export const getAccReviewsByAccommodationId = async (req, res) => {
  try {
    const { accommodationId } = req.params;

    if (!accommodationId) {
      return res.status(400).json({ message: "숙소 ID가 필요합니다" });
    }

    // 복합 인덱스를 사용하여 쿼리
    const snapshot = await firestoreDb
      .collection("accommodation_reviews")
      .where("accommodationId", "==", accommodationId)
      .orderBy("createdAt", "desc")
      .get();

    const reviews = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(reviews);
  } catch (err) {
    console.error("❌ Firestore에서 리뷰 조회 실패:", err);
    res.status(500).json({ message: "리뷰 불러오기 실패", error: err.message });
  }
};

// 특정 공연의 리뷰만 가져오기
export const getPerReviewsByPerformanceId = async (req, res) => {
  try {
    const { performanceId } = req.params;

    if (!performanceId) {
      return res.status(400).json({ message: "공연 ID가 필요합니다" });
    }

    // 복합 인덱스를 사용하여 쿼리
    const snapshot = await firestoreDb
      .collection("theme_reviews")
      .where("performanceId", "==", performanceId)
      .orderBy("createdAt", "desc")
      .get();

    const reviews = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(reviews);
  } catch (err) {
    console.error("❌ Firestore에서 리뷰 조회 실패:", err);
    res.status(500).json({ message: "리뷰 불러오기 실패", error: err.message });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const result = await deleteThemeReview(reviewId);
    res.json(result);
  } catch (error) {
    console.error("리뷰 삭제 실패:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "리뷰 삭제에 실패했습니다." 
    });
  }
};

export const deleteAccReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const result = await deleteAccReviewFromRepo(reviewId);
    res.json(result);
  } catch (error) {
    console.error("숙박 리뷰 삭제 실패:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "리뷰 삭제에 실패했습니다." 
    });
  }
};
