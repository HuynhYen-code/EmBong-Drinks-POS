require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    // ĐỂ SỬA TRÊN ĐÁM MÂY (CLOUD), BẠN CẦN THAY THẾ THÔNG TIN DƯỚI ĐÂY
    // Bằng các thông tin lấy từ bảng điều khiển của TiDB Cloud hoặc Aiven mà bạn đã gắn vào Render
    const connection = await mysql.createConnection({
        host: 'ĐIỀN_HOST_CỦA_DB_CLOUD_VÀO_ĐÂY',     // ví dụ: gateway01.ap-southeast-1.prod.aws.tidbcloud.com
        user: 'ĐIỀN_USER_CỦA_DB_CLOUD_VÀO_ĐÂY',     // ví dụ: xyz123.root
        password: 'ĐIỀN_PASSWORD_CỦA_BẠN_VÀO_ĐÂY',
        database: 'pos_bom_db',
        port: 4000,                                 // Mặc định TiDB là 4000, MySQL thường là 3306
        ssl: {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: true
        }
    });

    try {
        console.log("Đã kết nối Database thành công!\n");

        // --- CÁC LỆNH BẠN CÓ THỂ SỬ DỤNG (Bỏ dấu // ở đầu để chạy) ---

        // 1. XEM DANH SÁCH 10 ĐƠN HÀNG GẦN NHẤT
        const [orders] = await connection.query('SELECT id, created_at, total_amount FROM orders ORDER BY id DESC LIMIT 10');
        console.log("Danh sách đơn hàng gần đây:");
        console.table(orders);

        // 2. XÓA MỘT ĐƠN HÀNG CỤ THỂ (Ví dụ xóa đơn số 10)
        // await connection.query('DELETE FROM orders WHERE id = 10');
        // console.log("Đã xóa đơn số 10!");

        // 3. ĐỔI NGÀY CỦA MỘT ĐƠN HÀNG CỤ THỂ
        // Lùi về 1 ngày trước
        // await connection.query('UPDATE orders SET created_at = DATE_SUB(created_at, INTERVAL 1 DAY) WHERE id = 5');
        
        // Hoặc cài đặt một ngày giờ chính xác (YYYY-MM-DD HH:mm:ss theo chuẩn UTC)
        // await connection.query('UPDATE orders SET created_at = "2026-10-06 14:30:00" WHERE id = 5');
        // console.log("Đã cập nhật lại ngày cho đơn số 5!");

    } catch (e) {
        console.error("Lỗi:", e.message);
    } finally {
        await connection.end();
        process.exit();
    }
})();
