const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.post('/checkout', orderController.create);
router.get('/stats', orderController.getStats);
router.get('/history', orderController.getDailyHistory);

module.exports = router;
