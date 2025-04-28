import * as repository from "../repository/accOrderRepository.js";
import axios from "axios";
import { db } from "../repository/db.js";

export const accommodationOrder = async (req, res) => {
  try {
    const formData = req.body;

    // 데이터 유효성 검사
    if (
      !formData.accommodation_id ||
      !formData.user_id ||
      !formData.accommodation_name ||
      !formData.room_name ||
      !formData.check_in ||
      !formData.check_out ||
      !formData.user_count ||
      !formData.price ||
      !formData.address ||
      !formData.image
    ) {
      console.error("❌ 필수 데이터가 누락되었습니다:", formData);
      return res.status(400).json({
        success: false,
        message: "필수 데이터가 누락되었습니다",
        receivedData: formData,
      });
    }

    // 카카오페이 결제인 경우
    if (formData.payment_method === 'kakaopay') {
      try {
        // 주문 ID 생성
        const order_id = await repository.generateOrderId();
        formData.order_id = order_id;

        // 카카오페이 결제 준비 요청
        const response = await axios.post(
          'https://kapi.kakao.com/v1/payment/ready',
          new URLSearchParams({
            cid: 'TC0ONETIME',
            partner_order_id: order_id,
            partner_user_id: formData.user_id,
            item_name: formData.accommodation_name,
            quantity: 1,
            total_amount: formData.price,
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
            order_status: '결제대기',
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
        const result = await repository.accommodationOrder({
          ...formData,
          order_status: '결제완료',
          order_date: new Date().toISOString()
        });
        return res.json({ 
          success: true, 
          result,
          message: "결제가 완료되었습니다."
        });
      } catch (error) {
        console.error("❌ 숙박 예약 처리 실패:", error);
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
    console.error("❌ 숙박 예약 처리 실패:", error);
    return res.status(500).json({ 
      success: false, 
      message: "결제 처리 중 오류가 발생했습니다."
    });
  }
};

// 숙박 예약 목록 조회
export const getAccommodationOrders = async (req, res) => {
  try {
    const orders = await repository.getAccommodationOrders();
    res.status(200).json(orders);
  } catch (error) {
    console.error("❌ 숙박 예약 목록 조회 실패:", error);
    res.status(500).json({ success: false, error: error.message });
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
    const result = await repository.accommodationOrder({
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

// 최근 숙박 예약 정보 조회
export const getLatestAccommodationOrder = async (req, res) => {
  try {
    const { user_id } = req.params;
    
    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: "사용자 ID가 필요합니다"
      });
    }

    const order = await repository.getLatestAccommodationOrder(user_id);

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
    console.error("최근 숙박 예약 조회 실패:", error);
    return res.status(500).json({
      success: false,
      error: "서버 오류가 발생했습니다"
    });
  }
};

// 숙박 예약 취소
export const cancelAccommodationOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: "주문 ID가 필요합니다",
      });
    }

    await repository.cancelAccommodationOrder(orderId);

    return res.status(200).json({
      success: true,
      message: "예약이 취소되었습니다",
    });
  } catch (error) {
    console.error("❌ 숙박 예약 취소 실패:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};