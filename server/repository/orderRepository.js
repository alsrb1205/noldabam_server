import { db } from "./db.js"; // MySQL 연결 객체

// 랜덤한 주문 ID 생성 함수
const generateOrderId = async () => {
  try {
    // 현재 최대 order_id 조회
    const [rows] = await db.execute("SELECT MAX(CAST(SUBSTRING(order_id, 1, 5) AS UNSIGNED)) as max_id FROM performance_orders");
    const maxId = rows[0].max_id || 0;

    // 다음 순차번호 생성 (5자리, 앞에 0 채움)
    const nextId = String(maxId + 1).padStart(5, '0');

    // 랜덤 알파벳 7자리 생성
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let randomChars = '';
    for (let i = 0; i < 7; i++) {
      randomChars += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return nextId + randomChars;
  } catch (error) {
    console.error("주문 ID 생성 중 오류 발생:", error);
    throw error;
  }
};


export const getAccOrderUserId = async (orderId) => {
  try {
    const [rows] = await db.query(
      "SELECT user_id, accommodation_id FROM accommodation_orders WHERE order_id = ?",
      [orderId]
    );

    if (rows.length > 0) {
      const result = {
        userId: rows[0].user_id,
        accommodationId: rows[0].accommodation_id,
      };
      return result;
    } else {
      console.log("❌ 해당 orderId에 대한 정보 없음");
      return null;
    }
  } catch (err) {
    console.error("❌ MySQL 조회 오류:", err);
    throw err;
  }
};
export const getThemeOrderUserId = async (orderId) => {
  try {
    console.log("📌 DB에서 user_id 조회 시도 - orderId:", orderId);
    const [rows] = await db.query(
      "SELECT user_id, performance_id FROM performance_orders WHERE order_id = ?",
      [orderId]
    );

    if (rows.length > 0) {
      const result = {
        userId: rows[0].user_id,
        performanceId: rows[0].performance_id,
      };
      return result;
    } else {
      console.log("❌ 해당 orderId에 대한 정보 없음");
      return null;
    }
  } catch (err) {
    console.error("❌ MySQL 조회 오류:", err);
    throw err;
  }
};
  export const performanceOrder = async (formData) => {
    try {
      const {
        user_id,
        performance_id,
        title,
        date,
        venue,
        venue_address,
        genre,
        total_price,
        payment_method,
        seats,
        image_url,
        order_status,
        order_date
      } = formData;
  
      
  
      // 주문 ID 생성
      const order_id = formData.order_id || await generateOrderId();
  
      // 1. 공연 주문 등록
      const orderQuery = `

        INSERT INTO performance_orders 
        (order_id, user_id, performance_id, title, date, venue, venue_address, genre, total_price, payment_method, order_status, order_date, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const orderParams = [
        order_id, 
        user_id, 
        performance_id,
        title, 
        date, 
        venue, 
        venue_address, 
        genre, 
        total_price, 
        payment_method,
        order_status || '결제완료',
        order_date || new Date().toISOString(),
        image_url
      ];
      
      
      const [result] = await db.execute(orderQuery, orderParams);
  
      // 2. 좌석 정보 등록 (좌석 정보가 있는 경우에만)
      if (seats && seats.length > 0) {
        for (const seat of seats) {
          // seat_price가 문자열이면 replace를 사용하고, 숫자면 그대로 사용
          const seatPrice = typeof seat.seat_price === 'string' 
            ? parseInt(seat.seat_price.replace(/[₩,]/g, ''))
            : seat.seat_price;
          
          const seatQuery = `
            INSERT INTO performance_order_details 
            (order_id, seat_id, seat_grade, seat_price)
            VALUES (?, ?, ?, ?)
          `;
          const seatParams = [order_id, seat.seat_id, seat.seat_grade, seatPrice];

  
          const [seatResult] = await db.execute(seatQuery, seatParams);
          console.log("✅ 좌석 등록 성공, 결과:", seatResult);
        }
        console.log("✅ 모든 좌석 등록 완료");
      }
  
      return { 
        orderId: order_id, 
        seatCount: seats ? seats.length : 0,
        order_status: order_status || '결제완료',
        order_date: order_date || new Date().toISOString()
      };
    } catch (error) {
      console.error("❌ 데이터베이스 처리 중 오류 발생:", error);
      throw error;

    }
};

export const getPerformanceOrders = async () => {
  try {
    const query = `
      SELECT 
        po.*,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'seat_id', pod.seat_id,
            'seat_grade', pod.seat_grade,
            'seat_price', pod.seat_price
          )
        ) as seats
      FROM performance_orders po
      LEFT JOIN performance_order_details pod ON po.order_id = pod.order_id
      GROUP BY po.order_id
      ORDER BY CAST(SUBSTRING(po.order_id, 1, 5) AS UNSIGNED) DESC
    `;

    const [orders] = await db.execute(query);
    // seats가 null인 경우 빈 배열로 처리
    const parsedOrders = orders.map(order => ({
      ...order,
      seats: order.seats || []
    }));
    return parsedOrders;
  } catch (error) {
    console.error("공연 예약 목록 조회 실패:", error);
    throw error;
  }
};

export const getReservedSeats = async (title, date) => {
  try {
    const query = `
      SELECT pod.seat_id
      FROM performance_orders po
      JOIN performance_order_details pod ON po.order_id = pod.order_id
      WHERE po.title = ? AND po.date = ?
    `;

    const [rows] = await db.execute(query, [title, date]);
    return rows.map(row => row.seat_id);
  } catch (error) {
    console.error("예매된 좌석 조회 실패:", error);
    throw error;
  }
};


export const getThemeOrdersByUserId = async (userId) => {
  try {
    if (!userId) {
      throw new Error('사용자 ID가 필요합니다.');
    }
    const query = `
      SELECT 
        po.*,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'seat_id', pod.seat_id,
            'seat_grade', pod.seat_grade,
            'seat_price', pod.seat_price
          )
        ) as seats,
        DATE_FORMAT(po.date, '%Y-%m-%d') as formatted_date
      FROM performance_orders po
      LEFT JOIN performance_order_details pod ON po.order_id = pod.order_id
      WHERE po.user_id = ?
      GROUP BY po.order_id
      ORDER BY po.date DESC
    `;

    const [orders] = await db.execute(query, [userId]);
    // seats가 null이거나 빈 문자열인 경우 빈 배열로 처리
    const parsedOrders = orders.map(order => {
      try {
        return {
          ...order,
          date: order.formatted_date, // 포맷된 날짜 사용
          seats: order.seats && order.seats !== 'null' && order.seats !== '[]' 
            ? (typeof order.seats === 'string' ? JSON.parse(order.seats) : order.seats)
            : []
        };
      } catch (parseError) {
        console.error('좌석 정보 파싱 오류:', parseError);
        return {
          ...order,
          date: order.formatted_date, // 포맷된 날짜 사용
          seats: []
        };
      }
    });
    return parsedOrders;
  } catch (error) {
    console.error("사용자별 테마 예약 목록 조회 실패:", error);
    throw error;
  }
};

export const getAccommodationOrdersByUserId = async (userId) => {
  try {
    const query = `
      SELECT 
        ao.*,
        a.name,
        a.address
      FROM accommodation_orders ao
      JOIN accommodations a ON ao.accommodation_id = a.id
      WHERE ao.user_id = ?
      ORDER BY ao.check_in DESC
    `;
    
    const [rows] = await db.execute(query, [userId]);
    return rows;
  } catch (error) {
    console.error("숙소 예약 조회 중 오류:", error);

    throw error;
  }
};

// 최근 공연 예매 정보 조회
export const getLatestPerformanceOrder = async (user_id) => {
  try {
    const query = `
      SELECT 
        po.*,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'seat_id', pod.seat_id,
            'seat_grade', pod.seat_grade,
            'seat_price', pod.seat_price
          )
        ) as seats
      FROM performance_orders po
      LEFT JOIN performance_order_details pod ON po.order_id = pod.order_id
      WHERE po.user_id = ?
      GROUP BY po.order_id
      ORDER BY po.order_date DESC
      LIMIT 1
    `;

    const [rows] = await db.execute(query, [user_id]);
    
    if (rows.length === 0) {
      return null;
    }

    const order = rows[0];
    // seats가 null이거나 빈 문자열인 경우 빈 배열로 처리
    order.seats = order.seats && order.seats !== 'null' && order.seats !== '[]' 
      ? (typeof order.seats === 'string' ? JSON.parse(order.seats) : order.seats)
      : [];

    return order;
  } catch (error) {
    console.error("최근 공연 예매 정보 조회 실패:", error);
    throw error;
  }
};

// 테마 예약 취소
export const cancelPerformanceOrder = async (orderId) => {
  try {
    const query = `
      DELETE FROM performance_orders 
      WHERE order_id = ?
    `;

    await db.execute(query, [orderId]);
    return true;
  } catch (error) {
    console.error("❌ 테마 예약 취소 실패:", error);
    throw error;
  }
};