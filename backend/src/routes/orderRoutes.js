const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Nghiệp vụ: Hóa đơn đã thanh toán là bất biến (chỉ thêm mới & xem/xuất thống kê, tuyệt đối KHÔNG xóa/sửa)
router.post('/checkout', orderController.create);
router.get('/stats', orderController.getStats);
router.get('/history', orderController.getDailyHistory);
router.get('/export-monthly', orderController.exportMonthlyExcel);

module.exports = router;
