import { db } from "./db.js"; // MySQL 연결 객체

// 랜덤한 주문 ID 생성 함수 (숫자 12자리)
const generateOrderId = async () => {
  try {
    // 현재 최대 order_id 조회
    const [rows] = await db.execute(
      "SELECT MAX(CAST(SUBSTRING(order_id, 1, 5) AS UNSIGNED)) as max_id FROM accommodation_orders"
    );
    const maxId = rows[0].max_id || 0;

    // 다음 순차번호 생성 (5자리, 앞에 0 채움)
    const nextId = String(maxId + 1).padStart(5, "0");

    // 랜덤 숫자 7자리 생성
    let randomNums = "";
    for (let i = 0; i < 7; i++) {
      randomNums += Math.floor(Math.random() * 10);
    }

    return nextId + randomNums;
  } catch (error) {
    console.error("주문 ID 생성 중 오류 발생:", error);
    throw error;
  }
};

export const accommodationOrder = async (formData) => {
  try {
    const orderId = formData.order_id || await generateOrderId();

    // 1. 숙박 주문 등록
    const orderQuery = `
      INSERT INTO accommodation_orders
      (order_id, user_id, accommodation_id, accommodation_name, room_name, checkin_date, checkout_date, user_count, total_price, address, payment_method, order_status, order_date, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const orderParams = [
      orderId,
      formData.user_id,
      formData.accommodation_id,
      formData.accommodation_name,
      formData.room_name,
      formData.check_in,
      formData.check_out,
      formData.user_count,
      formData.price,
      formData.address,
      formData.payment_method,
      formData.order_status || '결제완료',
      formData.order_date || new Date().toISOString(),
      formData.image_url || formData.image || ''
    ];


    await db.execute(orderQuery, orderParams);

    // 2. 숙박 주문 상세 정보 등록
    const detailQuery = `
      INSERT INTO accommodation_order_details
      (order_id, room_id, room_capacity, room_amenities)
      VALUES (?, ?, ?, ?)
    `;

    const detailParams = [
      orderId,
      formData.room_name, // room_id로 room_name 사용
      formData.user_count,
      null // room_amenities를 null로 설정
    ];



    await db.execute(detailQuery, detailParams);

    return {
      order_id: orderId,
      status: 'success'
    };
  } catch (error) {
    console.error('❌ 데이터베이스 처리 중 오류 발생:', error);
    throw error;
  }
};

export const getAccommodationOrders = async () => {
  try {
    // 숙박 주문과 객실 상세 정보를 함께 조회
    const query = `
      SELECT 
        ao.*,
        aod.room_id,
        aod.room_capacity
      FROM accommodation_orders ao
      LEFT JOIN accommodation_order_details aod ON ao.order_id = aod.order_id
      ORDER BY CAST(SUBSTRING(ao.order_id, 1, 5) AS UNSIGNED) DESC
    `;

    const [orders] = await db.execute(query);
    return orders;
  } catch (error) {
    console.error("숙박 예약 목록 조회 실패:", error);
    throw error;
  }
};

export const getAccommodationOrdersByUserId = async (userId) => {
  try {
    const query = `
      SELECT 
        order_id,
        user_id,
        accommodation_id,
        accommodation_name as name,
        room_name,
        address,
        checkin_date as check_in,
        checkout_date as check_out,
        user_count,
        total_price,
        payment_method,
        order_status,
        order_date
      FROM accommodation_orders
      WHERE user_id = ?
      ORDER BY checkin_date DESC
    `;
    
    const [rows] = await db.execute(query, [userId]);
    return rows;
  } catch (error) {
    console.error("숙소 예약 조회 중 오류:", error);
    throw error;
  }
};

export const getLatestAccommodationOrder = async (userId) => {
  try {
    const query = `
      SELECT 
        ao.*,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'room_id', aod.room_id,
            'room_capacity', aod.room_capacity
          )
        ) as rooms
      FROM accommodation_orders ao
      LEFT JOIN accommodation_order_details aod ON ao.order_id = aod.order_id
      WHERE ao.user_id = ?
      GROUP BY ao.order_id
      ORDER BY CAST(SUBSTRING(ao.order_id, 1, 5) AS UNSIGNED) DESC
      LIMIT 1
    `;

    const [orders] = await db.execute(query, [userId]);
    
    if (orders.length === 0) {
      return null;
    }

    // rooms가 null인 경우 빈 배열로 처리
    const order = {
      ...orders[0],
      rooms: orders[0].rooms || []
    };

    return order;
  } catch (error) {
    console.error("최근 숙박 예약 조회 실패:", error);
    throw error;
  }
};
// 숙박 예약 취소
export const cancelAccommodationOrder = async (orderId) => {
  try {
    const query = `
      DELETE FROM accommodation_orders 
      WHERE order_id = ?
    `;

    await db.execute(query, [orderId]);
    return true;
  } catch (error) {
    console.error("❌ 숙박 예약 취소 실패:", error);
    throw error;
  }
};