import OpenAI from "openai";
import { getThemeOrdersByUserId } from "./orderRepository.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `당신은 숙박 공연 예약 시스템의 AI 도우미입니다. 
사용자의 예약 조회 요청에 따라 다음과 같은 JSON 형식으로 응답해야 합니다:

1. 전체 예약 조회 (공연 + 숙소):
{
  "func": "getThemeOrdersByUserId"
}

2. 공연 예약만 조회:
{
  "func": "getThemeOrdersByUserId",
  "type": "performance"
}

3. 숙소 예약만 조회:
{
  "func": "getThemeOrdersByUserId",
  "type": "accommodation"
}

4. 최근 예약 조회 (3개월 이내):
{
  "func": "getRecentOrders"
}

5. 특정 날짜 예약 조회:
{
  "func": "getOrdersByDate",
  "date": "2025-MM-DD"  // 항상 2025년을 포함한 완전한 날짜 형식 사용
}

날짜 파싱 규칙:
- 모든 날짜는 항상 "2025-MM-DD" 형식으로 반환
- 월과 일은 항상 2자리 숫자로 표시 (예: 04, 05)
- 연도는 항상 2025년으로 설정
- 월만 지정된 경우 해당 월의 1일로 설정 (예: "4월" -> "2025-04-01")

예시:
사용자: "내 예약 좀 볼 수 있을까?"
응답: {"func": "getThemeOrdersByUserId"}

사용자: "공연 예약 보여줘"
응답: {"func": "getThemeOrdersByUserId", "type": "performance"}

사용자: "숙소 예약 보여줘"
응답: {"func": "getThemeOrdersByUserId", "type": "accommodation"}

사용자: "최근 예약 보여줘"
응답: {"func": "getRecentOrders"}

사용자: "3월 15일 예약 보여줘"
응답: {"func": "getOrdersByDate", "date": "2025-03-15"}

사용자: "4/26 예약 보여줘"
응답: {"func": "getOrdersByDate", "date": "2025-04-26"}

사용자: "4월 26일 예약 보여줘"
응답: {"func": "getOrdersByDate", "date": "2025-04-26"}

사용자: "4월에 예약한 내역 보여줘"
응답: {"func": "getOrdersByDate", "date": "2025-04-01"}

사용자: "2025년 4월 26일 예약 보여줘"
응답: {"func": "getOrdersByDate", "date": "2025-04-26"}

그 외의 모든 일반 문의(예: 관광지 추천, 날씨, 기타 문의)는 일반 텍스트로 친절하게 응답해주세요.`;

export const getChatResponse = async (message) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT
      },
      {
        role: "user",
        content: message
      }
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  return completion.choices[0].message.content;
};

export const fetchThemeOrdersByUserId = async (userId) => {
  try {
    const orders = await getThemeOrdersByUserId(userId);
    return orders;
  } catch (error) {
    console.error("테마 예약 조회 중 오류:", error);
    throw error;
  }
}; 