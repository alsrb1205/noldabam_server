import axios from 'axios';
import * as repository from '../repository/orderRepository.js';
import * as accRepository from '../repository/accOrderRepository.js';

export const paymentKakaopay = async (req, res) => {
    try {
        const { id, item_name, total_amount, orderDataList } = req.body;
        const KAKAO_ADMIN_KEY = "78c49f9015d292e7ab212a55094e122b";
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const partner_order_id = `order_${uniqueSuffix}`;

        const response = await axios.post(
            "https://kapi.kakao.com/v1/payment/ready",
            {
                cid: "TC0ONETIME",
                partner_order_id,
                partner_user_id: id,
                item_name,
                quantity: 1,
                total_amount,
                tax_free_amount: 0,
                approval_url: "http://localhost:3000/payment/complete",
                cancel_url: "http://localhost:3000/payment/cancel",
                fail_url: "http://localhost:3000/payment/fail",
            },
            {
                headers: {
                    Authorization: `KakaoAK ${KAKAO_ADMIN_KEY}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        
        // partner_order_id를 응답에 포함
        res.json({
            ...response.data,
            partner_order_id
        });
    } catch (error) {
        console.error("QR 결제 요청 실패:", error);
        console.error("에러 상세 정보:", {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.response?.data
        });
    }
};

// 카카오페이 결제 승인
export const approveKakaoPay = async (req, res) => {
    try {
        const { pg_token, tid, orderData } = req.body;
        const KAKAO_ADMIN_KEY = "78c49f9015d292e7ab212a55094e122b";



        if (!pg_token || !tid || !orderData) {
            throw new Error('결제 정보가 없습니다.');
        }

        // 이미 결제가 완료된 경우 처리
        if (orderData.order_status === '결제완료') {
            return res.status(200).json({
                success: true,
                result: {
                    ...orderData,
                    payment_info: { msg: 'payment is already done!', code: -702 }
                }
            });
        }

        // 카카오페이 결제 승인 요청
        const response = await axios.post(
            "https://kapi.kakao.com/v1/payment/approve",
            {
                cid: "TC0ONETIME",
                tid,
                partner_order_id: orderData.partner_order_id,
                partner_user_id: orderData.user_id || orderData.id,
                pg_token
            },
            {
                headers: {
                    Authorization: `KakaoAK ${KAKAO_ADMIN_KEY}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );


        // DB에 저장할 데이터 구성
        let dbData;
        if (orderData.accommodation_id) {
            // 숙박 예약인 경우
            dbData = {
                user_id: orderData.user_id || orderData.id,
                accommodation_id: orderData.accommodation_id,
                accommodation_name: orderData.accommodation_name,
                room_name: orderData.room_name,
                check_in: orderData.check_in,
                check_out: orderData.check_out,
                user_count: orderData.user_count,
                price: orderData.price,
                address: orderData.address,
                type: orderData.type,
                payment_method: 'kakaopay',
                image_url: orderData.image,
                order_status: '결제완료',
                order_date: new Date().toISOString()
            };

            // DB에 숙박 주문 정보 저장
            const result = await accRepository.accommodationOrder(dbData);

            // 성공 응답 전송
            return res.status(200).json({
                success: true,
                result: {
                    ...dbData,
                    order_id: result.order_id,
                    checkin_date: orderData.check_in,
                    checkout_date: orderData.check_out,
                    payment_info: response.data
                }
            });
        } else {
            // 공연 예약인 경우
            dbData = {
                user_id: orderData.user_id || orderData.id,
                performance_id: orderData.performance_id,
                title: orderData.title,
                date: orderData.date,
                venue: orderData.venue,
                venue_address: orderData.venue_address,
                genre: orderData.genre,
                total_price: orderData.total_price,
                payment_method: 'kakaopay',
                seats: orderData.seats,
                image_url: orderData.image_url,
                order_status: '결제완료',
                order_date: new Date().toISOString()
            };

            // DB에 공연 주문 정보 저장
            const result = await repository.performanceOrder(dbData);

            // 성공 응답 전송
            return res.status(200).json({
                success: true,
                result: {
                    ...dbData,
                    order_id: result.order_id,
                    payment_info: response.data
                }
            });
        }
    } catch (error) {
        console.error('결제 승인 실패:', error);
        console.error('에러 상세 정보:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });

        // 이미 결제가 완료된 경우(-702 에러) 처리
        if (error.response?.data?.code === -702) {
            const { pg_token, tid, orderData } = req.body;
            return res.status(200).json({
                success: true,
                result: {
                    ...orderData,
                    order_status: '결제완료',
                    payment_info: error.response.data
                }
            });
        }

        res.status(500).json({
            success: false,
            error: error.message,
            details: error.response?.data
        });
    }
};
