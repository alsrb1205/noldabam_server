import * as repository from "../repository/orderRepository.js";
import axios from 'axios';
import { db } from "../repository/db.js";

// 주문 ID 생성 함수
const generateOrderId = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `ORDER_${timestamp}_${random}`;
};

export const performanceOrder = async (req, res) => {
  try {
    const formData = req.body;
    
    // 데이터 유효성 검사
    if (!formData.user_id || !formData.title || !formData.date || !formData.venue || 
        !formData.seats || !formData.image_url) {
      return res.status(400).json({ 
        success: false, 
        message: "필수 데이터가 누락되었습니다" 
      });
    }

    // 결제 수단이 카카오페이인 경우
    if (formData.payment_method === 'kakaopay') {
      try {
        // 주문 ID 생성
        const order_id = generateOrderId();
        formData.order_id = order_id;

        // 카카오페이 결제 준비 요청
        const response = await axios.post(
          'https://kapi.kakao.com/v1/payment/ready',
          new URLSearchParams({
            cid: 'TC0ONETIME',
            partner_order_id: order_id,
            partner_user_id: formData.user_id,
            item_name: formData.title,
            quantity: 1,
            total_amount: formData.total_price,
            tax_free_amount: 0,
            approval_url: `http://localhost:3000/payment/success?order_id=${order_id}`,
            fail_url: 'http://localhost:3000/payment/fail',
            cancel_url: 'http://localhost:3000/payment/cancel'
          }).toString(),
          {
            headers: {
              'Authorization': `KakaoAK ${process.env.KAKAO_ADMIN_KEY}`,
              'Content-type': 'application/x-www-form-urlencoded;charset=utf-8'
            }
          }
        );


        // tid와 주문 정보를 응답에 포함
        return res.json({
          success: true,
          tid: response.data.tid,
          next_redirect_pc_url: response.data.next_redirect_pc_url,
          orderData: {
            ...formData,
            order_id,
            order_status: '결제완료',
            order_date: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error('카카오페이 결제 준비 실패:', error);
        return res.status(500).json({
          success: false,
          error: '카카오페이 결제 준비 중 오류가 발생했습니다.'
        });
      }
    } else if (formData.payment_method === 'card') {
      // 일반 카드 결제 처리
      try {
        const result = await repository.performanceOrder(formData);
        return res.json({ 
          success: true, 
          result,
          message: "결제가 완료되었습니다."
        });
      } catch (error) {
        console.error("❌ 공연 예약 처리 실패:", error);
        return res.status(500).json({ 
          success: false, 
          message: "결제 처리 중 오류가 발생했습니다."
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "지원하지 않는 결제 수단입니다."
      });
    }
  } catch (error) {
    console.error("❌ 공연 예약 처리 실패:", error);
    return res.status(500).json({ 
      success: false, 
      message: "결제 처리 중 오류가 발생했습니다."
    });
  }
};

// 카카오페이 결제 승인
export const approveKakaoPay = async (req, res) => {
  try {
    const { pg_token, tid, orderData } = req.body;

    if (!pg_token || !tid || !orderData) {
      throw new Error('결제 정보가 없습니다.');
    }

    // 카카오페이 결제 승인 요청
    const response = await axios.post(
      'https://kapi.kakao.com/v1/payment/approve',
      {
        cid: 'TC0ONETIME',
        tid,
        partner_order_id: orderData.order_id,
        partner_user_id: orderData.user_id,
        pg_token
      },
      {
        headers: {
          'Authorization': `KakaoAK ${process.env.KAKAO_ADMIN_KEY}`,
          'Content-type': 'application/x-www-form-urlencoded;charset=utf-8'
        }
      }
    );


    // 결제 성공 시 DB에 주문 정보 저장
    const result = await repository.performanceOrder({
      ...orderData,
      payment_method: 'kakaopay',
      order_status: '결제완료',
      order_date: new Date().toISOString()
    });

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('카카오페이 결제 승인 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 공연 예매 생성
export const createPerformanceOrder = async (req, res) => {
  try {
    const order = await repository.createPerformanceOrder(req.body);
    res.status(201).json({ success: true, order });
  } catch (error) {
    console.error("공연 예매 생성 실패:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// 공연 예매 목록 조회
export const getPerformanceOrders = async (req, res) => {
  try {
    const orders = await repository.getPerformanceOrders();
    res.status(200).json(orders);
  } catch (error) {
    console.error("공연 예매 목록 조회 실패:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getReservedSeats = async (req, res) => {
  try {
    const { title, date } = req.query;
    
    if (!title || !date) {
      return res.status(400).json({ 
        success: false, 
        message: "공연 제목과 날짜가 필요합니다" 
      });
    }

    const reservedSeats = await repository.getReservedSeats(title, date);
    res.status(200).json(reservedSeats);
  } catch (error) {
    console.error("예매된 좌석 조회 실패:", error);
    res.status(500).json({ 
      success: false, 
      message: "예매된 좌석 조회 중 오류 발생",
      error: error.message 
    });
  }
};


export const getThemeOrdersByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: "사용자 ID가 필요합니다" 
      });
    }

    const orders = await repository.getThemeOrdersByUserId(userId);
    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    console.error("사용자별 테마 예약 목록 조회 실패:", error);
    res.status(500).json({ 
      success: false, 
      message: "예약 목록 조회 중 오류 발생",
      error: error.message 
    });
  }
};

// 최근 공연 예매 정보 조회
export const getLatestPerformanceOrder = async (req, res) => {
  try {
    const { user_id } = req.params;
    
    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: "사용자 ID가 필요합니다"
      });
    }

    const order = await repository.getLatestPerformanceOrder(user_id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "최근 예약 정보가 없습니다"
      });
    }

    return res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error("최근 공연 예매 조회 실패:", error);
    return res.status(500).json({
      success: false,
      error: "서버 오류가 발생했습니다"
    });
  }
};

// 테마 예약 취소
export const cancelPerformanceOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: "주문 ID가 필요합니다",
      });
    }

    await repository.cancelPerformanceOrder(orderId);

    return res.status(200).json({
      success: true,
      message: "예약이 취소되었습니다",
    });
  } catch (error) {
    console.error("❌ 테마 예약 취소 실패:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};