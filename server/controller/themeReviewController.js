import { deleteThemeReview } from "../repository/reviewRepository.js";

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