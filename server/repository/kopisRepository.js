// repository/kopisRepository.js
import axios from "axios";
import { XMLParser } from "fast-xml-parser";

export const fetchKopisSearch = async ({ location, type, keyword }) => {
  console.log("[KOPIS] 리포지토리 함수 호출 파라미터:", { location, type, keyword });
  
  const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const start = today;
  const end = 20300101;

  const signgucode = location;
  const themeCode = type;
  const shprfnm = keyword;

  // 기본 URL 구성
  let baseUrl = `http://www.kopis.or.kr/openApi/restful/pblprfr?service=${process.env.KOPIS_KEY}&cpage=1&rows=100&stdate=${start}&eddate=${end}&prfstate=01&prfstate=02`;
  
  // 지역 검색과 키워드 검색은 서로 배타적
  if (signgucode) {
    // 지역 검색인 경우
    baseUrl += `&signgucode=${signgucode}`;
  } else if (shprfnm) {
    // 키워드 검색인 경우
    baseUrl += `&shprfnm=${shprfnm}`;
  }
  
  // type이 '전체'가 아닌 경우에만 shcate 파라미터 추가
  const apiUrl = type === "전체" ? baseUrl : `${baseUrl}&shcate=${themeCode}`;
  console.log("[KOPIS] 요청 URL:", apiUrl);

  try {
    console.log("[KOPIS] API 요청 시작");
    const response = await axios.get(apiUrl, { responseType: "text" });
    console.log("[KOPIS] API 응답 상태:", response.status);
    console.log("[KOPIS] API 응답 데이터:", response.data);
    
    const parser = new XMLParser();
    const result = parser.parse(response.data);
    console.log("[KOPIS] 파싱 결과:", result);

    return result;
  } catch (error) {
    console.error("[KOPIS] API 호출 실패:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    return null;
  }
};

// 공연 상세정보를 가져올 때, URL에 공연ID를 동적으로 넣어 호출
export const fetchKopisDetail = async (performanceId) => {
  const apiUrl = `http://www.kopis.or.kr/openApi/restful/pblprfr/${performanceId}?service=${process.env.KOPIS_KEY}`;
  console.log("[KOPIS] 상세 요청 URL:", apiUrl);
  
  try {
    console.log("[KOPIS] 상세 API 요청 시작");
    const response = await axios.get(apiUrl, { responseType: "text" });
    console.log("[KOPIS] 상세 API 응답 상태:", response.status);
    console.log("[KOPIS] 상세 API 응답 데이터:", response.data);
    
    const parser = new XMLParser({ ignoreAttributes: false });
    const result = parser.parse(response.data);
    console.log("[KOPIS] 상세 파싱 결과:", result);
    
    return result.dbs ? result.dbs.db : result;
  } catch (error) {
    console.error("[KOPIS] 상세 API 호출 실패:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

// 공연장 상세정보를 가져올 때, URL에 공연장ID를 동적으로 넣어 호출
export const fetchKopisVenue = async (venueId) => {
  try {
    const apiUrl = `http://www.kopis.or.kr/openApi/restful/prfplc/${venueId}?service=${process.env.KOPIS_KEY}`;
    console.log("[KOPIS] 공연장 상세 요청 URL:", apiUrl);
    
    console.log("[KOPIS] 공연장 API 요청 시작");
    const response = await axios.get(apiUrl, { responseType: "text" });
    console.log("[KOPIS] 공연장 API 응답 상태:", response.status);
    console.log("[KOPIS] 공연장 API 응답 데이터:", response.data);
    
    const parser = new XMLParser({ ignoreAttributes: false });
    const result = parser.parse(response.data);
    console.log("[KOPIS] 공연장 파싱 결과:", result);
    
    return result.dbs ? result.dbs.db : result;
  } catch (error) {
    console.error("[KOPIS] 공연장 API 호출 실패:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};