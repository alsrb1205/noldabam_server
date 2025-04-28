import axios from "axios";
import { areaCodeMap, sigunguCodeMap, accommodationTypeMap } from "../../client/src/filtersData.js";


const API_KEY = 'C2+Cvn1jcs6wPY5EXyqceu3WXDRT6iw/MiF1tmdof4869K0FRiH58/LPkqMRyZm2l4Gb/sJqE8CoeMLYQ2vgNg==';

export const accommodationSearch = async ({ location, subLocation, type }) => {
  const areaCode = areaCodeMap[location];
  const isAllSubLocation = subLocation === "전체"; // ✅ 전체인지 확인
  const sigunguCode = isAllSubLocation ? undefined : sigunguCodeMap[location]?.[subLocation];
  const cat3 = accommodationTypeMap[type];
  const isAllType = type === "전체";

  if (!areaCode || (!isAllType && !cat3)) {
    console.warn("❗ 지역 또는 cat3가 유효하지 않음:", location, subLocation, type);
    return { response: { body: { items: [] } } };
  }

  const url = `https://apis.data.go.kr/B551011/KorService1/areaBasedList1`;

  const baseParams = {
    serviceKey: decodeURIComponent(API_KEY),
    MobileApp: "AppTest",
    MobileOS: "ETC",
    areaCode,
    contentTypeId: 32,
    pageNo: 1,
    numOfRows: 1,
    _type: "json",
  };

  // ✅ 세부 지역이 전체가 아닐 때만 sigunguCode 추가
  if (sigunguCode) baseParams.sigunguCode = sigunguCode;

  if (!isAllType) {
    baseParams.cat1 = "B02";
    baseParams.cat2 = "B0201";
    baseParams.cat3 = cat3;
  }

  try {
    // 1차 요청으로 totalCount 파악
    const res1 = await axios.get(url, { params: baseParams });
    const totalCount = res1.data?.response?.body?.totalCount || 0;
    if (totalCount === 0) return { response: { body: { items: [] } } };

    const fullParams = { ...baseParams, numOfRows: totalCount };
    const res2 = await axios.get(url, { params: fullParams });

    return res2.data;
  } catch (error) {
    console.error("❌ 숙박 검색 실패:", error.message);
    return { response: { body: { items: [] } } };
  }
};

export const keywordSearch = async ({ keyword }) => {
  const url = `https://apis.data.go.kr/B551011/KorService1/searchKeyword1`;

  const baseParams = {
    serviceKey: decodeURIComponent(API_KEY),
    MobileApp: "AppTest",
    MobileOS: "ETC",
    keyword,
    contentTypeId: 32,
    pageNo: 1,
    numOfRows: 1,
    _type: "json",
  };

  try {
    // 1차 요청으로 totalCount 파악
    const res1 = await axios.get(url, { params: baseParams });
    const totalCount = res1.data?.response?.body?.totalCount || 0;
    if (totalCount === 0) return { response: { body: { items: [] } } };

    const fullParams = { ...baseParams, numOfRows: totalCount };
    const res2 = await axios.get(url, { params: fullParams });

    return res2.data;
  } catch (error) {
    console.error("❌ [keywordSearch] 숙박 검색 실패:", error.message);
    return { response: { body: { items: [] } } };
  }
}
