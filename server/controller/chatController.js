import { getChatResponse, fetchThemeOrdersByUserId } from "../repository/chatRepository.js";
import { getAccommodationOrdersByUserId } from "../repository/accOrderRepository.js";

export const handleChatMessage = async (req, res) => {
  try {
    const { message, userId } = req.body;

    
    if (!userId) {
      return res.status(400).json({ 
        error: '사용자 ID가 필요합니다.',
        message: '로그인이 필요합니다.'
      });
    }
    
    const response = await getChatResponse(message);
    
    try {
      // JSON 응답 파싱
      const parsedResponse = JSON.parse(response);
      
      // func에 따른 처리
      if (parsedResponse.func === 'getThemeOrdersByUserId' || 
          parsedResponse.func === 'getRecentOrders' || 
          parsedResponse.func === 'getOrdersByDate') {
        
        // 공연 예약 조회
        const themeOrders = await fetchThemeOrdersByUserId(userId);
        // 숙소 예약 조회
        const accOrders = await getAccommodationOrdersByUserId(userId);
        
        let allOrders = [];
        // 예약 타입에 따라 필터링
        if (parsedResponse.type === 'performance') {
          if (themeOrders) allOrders = themeOrders;
        } else if (parsedResponse.type === 'accommodation') {
          if (accOrders) allOrders = accOrders;
        } else {
          // 타입이 지정되지 않은 경우 모든 예약 표시
          if (themeOrders) allOrders = allOrders.concat(themeOrders);
          if (accOrders) allOrders = allOrders.concat(accOrders);
        }
        
        if (allOrders.length === 0) {
          const message = parsedResponse.type === 'performance'
            ? "공연 예약 내역이 없습니다."
            : parsedResponse.type === 'accommodation'
              ? "숙소 예약 내역이 없습니다."
              : "예약 내역이 없습니다.";
              
          res.json({ 
            message: message,
            orders: []
          });
        } else {
          // 날짜별 필터링
          if (parsedResponse.func === 'getOrdersByDate') {
            const targetDate = new Date(parsedResponse.date);
            allOrders = allOrders.filter(order => {
              // 공연 예약인 경우 date 필드 사용
              if (order.hasOwnProperty('date')) {
                const orderDate = new Date(order.date);
                // 월만 지정된 경우 해당 월의 모든 예약을 반환
                if (parsedResponse.date.endsWith('-01')) {
                  return orderDate.getMonth() === targetDate.getMonth() && 
                         orderDate.getFullYear() === targetDate.getFullYear();
                }
                return orderDate.toDateString() === targetDate.toDateString();
              }
              // 숙소 예약인 경우 check_in 필드 사용
              else if (order.hasOwnProperty('check_in')) {
                const orderDate = new Date(order.check_in);
                // 월만 지정된 경우 해당 월의 모든 예약을 반환
                if (parsedResponse.date.endsWith('-01')) {
                  return orderDate.getMonth() === targetDate.getMonth() && 
                         orderDate.getFullYear() === targetDate.getFullYear();
                }
                return orderDate.toDateString() === targetDate.toDateString();
              }
              return false;
            });
          } else if (parsedResponse.func === 'getRecentOrders') {
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            allOrders = allOrders.filter(order => {
              const orderDate = new Date(order.date || order.check_in);
              return orderDate >= threeMonthsAgo;
            });
          }
          
          if (allOrders.length === 0) {
            const message = parsedResponse.func === 'getOrdersByDate' 
              ? `${new Date(parsedResponse.date).toLocaleDateString('ko-KR')}의 예약 내역이 없습니다.`
              : parsedResponse.func === 'getRecentOrders'
                ? "최근 3개월 이내 예약 내역이 없습니다."
                : "예약 내역이 없습니다.";
                
            res.json({ 
              message: message,
              orders: []
            });
          } else {
            // 예약 내역을 보기 좋게 포맷팅
            let formattedMessage = '';
            if (parsedResponse.func === 'getRecentOrders') {
              formattedMessage = "🎭 최근 예약 내역입니다 🎭\n\n\n";
            } else if (parsedResponse.func === 'getOrdersByDate') {
              formattedMessage = `🎭 ${new Date(parsedResponse.date).toLocaleDateString('ko-KR')} 예약 내역입니다 🎭\n\n\n`;
            } else {
              formattedMessage = parsedResponse.type === 'performance'
                ? "🎭 공연 예약 내역입니다 🎭\n\n\n"
                : parsedResponse.type === 'accommodation'
                  ? "🏨 숙소 예약 내역입니다 🏨\n\n\n"
                  : "🎭 전체 예약 내역입니다 🎭\n\n\n";
            }
            
            // 최대 5개까지만 표시
            const displayOrders = allOrders.slice(0, 5);
            const hasMoreOrders = allOrders.length > 5;
            
            displayOrders.forEach((order, index) => {
              const isAccommodation = order.hasOwnProperty('check_in');
              const formattedDate = new Date(order.date || order.check_in).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              });
              
              formattedMessage += `📌 예약 ${index + 1}\n`;
              formattedMessage += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
              
              if (isAccommodation) {
                formattedMessage += `🏨 숙소: ${order.name}\n`;
                formattedMessage += `📅 체크인: ${formattedDate}\n`;
                formattedMessage += `📅 체크아웃: ${new Date(order.check_out).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })}\n`;
                formattedMessage += `📍 주소: ${order.address}\n`;
                formattedMessage += `💰 총 금액: ${order.total_price.toLocaleString()}원\n`;
              } else {
                formattedMessage += `🎪 공연: ${order.title}\n`;
                formattedMessage += `📅 날짜: ${formattedDate}\n`;
                formattedMessage += `📍 장소: ${order.venue}\n`;
                formattedMessage += `💺 좌석: ${order.seats.map(seat => 
                  `${seat.seat_grade}(${seat.seat_id})`
                ).join(', ')}\n`;
                formattedMessage += `💰 총 금액: ${order.total_price.toLocaleString()}원\n`;
              }
              
              formattedMessage += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            });

            // 더 많은 예약이 있는 경우 메시지 추가
            if (hasMoreOrders) {
              formattedMessage += `\n📝 더 많은 예약 내역은 마이페이지에서 확인해주세요.\n`;
              formattedMessage += `👉 마이페이지 > 예약 내역\n\n`;
            }
            
            res.json({ 
              message: formattedMessage,
              orders: allOrders 
            });
          }
        }
      } else {
        res.json({ message: response });
      }
    } catch (parseError) {
      // JSON 파싱 실패 시 원본 메시지 반환
      res.json({ message: response });
    }
  } catch (error) {
    console.error('Error in handleChatMessage:', error);
    res.status(500).json({ 
      error: '서버 오류가 발생했습니다.',
      message: '예약 조회 중 오류가 발생했습니다.'
    });
  }
};