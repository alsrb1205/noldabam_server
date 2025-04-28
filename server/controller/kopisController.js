import { fetchKopisSearch, fetchKopisDetail, fetchKopisVenue } from "../repository/kopisRepository.js";

export const getKopisSearch = async (req, res) => {
  try {
    
    const result = await fetchKopisSearch(req.query);
    if (!result) {
      return res.status(404).json({ error: "검색 결과가 없습니다." });
    }
    res.json(result);
    
  } catch (error) {
    console.error("[KOPIS] 검색 API 오류:", error);
    res.status(500).json({ error: "KOPIS 검색 API 호출 중 오류가 발생했습니다." });
  }
};

export const getKopisDetail = async (req, res) => {
  try {
    const performanceId = req.params.id;
    
    if (!performanceId) {
      return res.status(400).json({ error: "공연 ID가 필요합니다." });
    }
    
    const result = await fetchKopisDetail(performanceId);
    if (!result) {
      return res.status(404).json({ error: "공연 상세 정보를 찾을 수 없습니다." });
    }
    
    res.json(result);
  } catch (error) {
    console.error("[KOPIS] 상세 API 오류:", error);
    res.status(500).json({ error: "공연 상세 정보를 가져오는데 실패했습니다." });
  }
};

// 공연장 상세정보를 가져오는 컨트롤러
export const getKopisVenue = async (req, res) => {
  try {
    const { venueId } = req.params;
    
    if (!venueId) {
      return res.status(400).json({ error: "공연장 ID가 필요합니다." });
    }
    
    const venueData = await fetchKopisVenue(venueId);
    if (!venueData) {
      return res.status(404).json({ error: "공연장 정보를 찾을 수 없습니다." });
    }
    
    
    const venueInfo = {
      mt10id: venueData.mt10id,
      fcltynm: venueData.fcltynm,
      adres: venueData.adres,
      genrenm: venueData.genrenm
    };
    
    res.json(venueInfo);
  } catch (error) {
    console.error("[KOPIS] 공연장 API 오류:", error);
    res.status(500).json({ error: "공연장 정보를 가져오는데 실패했습니다." });
  }
};
