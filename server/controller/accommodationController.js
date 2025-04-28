import { accommodationSearch, keywordSearch as keywordSearchRepo } from "../repository/accommodationRepository.js";

export const accommodationData = async (req, res) => {
  try {
    const { type = "전체" } = req.query;
    
    const result = await accommodationSearch({ ...req.query, type });
    
    res.json(result);
  } catch (error) {
    console.error("[KOPIS] 검색 API 오류:", error);
    res.status(500).json({ error: "KOPIS 검색 API 호출 중 오류가 발생했습니다." });
  }
};

export const keywordSearch = async (req, res) => {
  try {
    const { keyword } = req.query;
    
    if (!keyword) {
      return res.status(400).json({ error: "키워드가 필요합니다." });
    }

    const result = await keywordSearchRepo({ keyword });
    res.json(result);
  } catch (error) {
    console.error("❌ [keywordSearch] 검색 API 오류:", error);
    res.status(500).json({ error: "KOPIS 검색 API 호출 중 오류가 발생했습니다." });
  }
};
