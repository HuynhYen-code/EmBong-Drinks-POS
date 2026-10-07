require('dotenv').config();
const mysql = require('mysql2/promise');

// Cấu hình kết nối DB
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    decimalNumbers: true
});

// THAY ĐỔI NGÀY HÔM QUA Ở ĐÂY
const YESTERDAY_DATE = '2026-10-06';

// DANH SÁCH CÁC ĐƠN HÀNG CẦN NHẬP BÙ
// - Tên món, kích thước (size) phải khớp chính xác với bảng menu_items và menu_item_sizes
// - quantity: số lượng
const manualOrders = [
    {
        time: '14:30:00', // Giờ bán
        items: [
            { menu_item_id: 1, size_name: 'M', quantity: 2 }, // Ví dụ: Rau má latte M (id = 1)
            { menu_item_id: 2, size_name: 'L', quantity: 1 }  // Ví dụ: Olong lài sữa L (id = 2)
        ]
    },
    {
        time: '15:45:00',
        items: [
            { menu_item_id: 4, size_name: '700ml', quantity: 1 } // Rau Má Dừa
        ]
    }
];

async function runImport() {
    const connection = await pool.getConnection();
    try {
        console.log(`Bắt đầu nhập dữ liệu bù cho ngày ${YESTERDAY_DATE}...`);
        await connection.beginTransaction();

        for (let order of manualOrders) {
            const createdAt = `${YESTERDAY_DATE} ${order.time}`;
            let totalAmount = 0;
            let totalCogs = 0;
            const detailsToInsert = [];

            // 1. Tính toán tiền và giá vốn cho từng món
            for (let item of order.items) {
                const [sizeData] = await connection.query(
                    'SELECT price, current_cogs FROM menu_item_sizes WHERE menu_item_id = ? AND size_name = ?',
                    [item.menu_item_id, item.size_name]
                );

                if (sizeData.length === 0) {
                    throw new Error(`Không tìm thấy giá cho món ID ${item.menu_item_id} size ${item.size_name}`);
                }

                const price = sizeData[0].price;
                const cogs = sizeData[0].current_cogs;

                totalAmount += (price * item.quantity);
                totalCogs += (cogs * item.quantity);

                detailsToInsert.push({
                    menu_item_id: item.menu_item_id,
                    size_name: item.size_name,
                    quantity: item.quantity,
                    unit_price: price,
                    unit_cogs: cogs
                });
            }

            // 2. Chèn vào bảng orders, truyền thẳng trường created_at
            const [orderRes] = await connection.query(
                'INSERT INTO orders (total_amount, total_cogs, created_at) VALUES (?, ?, ?)',
                [totalAmount, totalCogs, createdAt]
            );
            const orderId = orderRes.insertId;

            // 3. Chèn vào bảng order_details
            for (let det of detailsToInsert) {
                await connection.query(
                    'INSERT INTO order_details (order_id, menu_item_id, size_name, quantity, unit_price, unit_cogs) VALUES (?, ?, ?, ?, ?, ?)',
                    [orderId, det.menu_item_id, det.size_name, det.quantity, det.unit_price, det.unit_cogs]
                );
            }
            
            console.log(`Đã nhập thành công 1 đơn lúc ${createdAt} - Tổng tiền: ${totalAmount}`);
        }

        await connection.commit();
        console.log("XONG! Đã lưu toàn bộ đơn vào CSDL.");
    } catch (error) {
        await connection.rollback();
        console.error("CÓ LỖI XẢY RA, ĐÃ HỦY TOÀN BỘ:", error.message);
    } finally {
        connection.release();
        process.exit();
    }
}

runImport();
