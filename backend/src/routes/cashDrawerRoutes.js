const express = require('express');
const router = express.Router();
const cashDrawerController = require('../controllers/cashDrawerController');

router.get('/', cashDrawerController.getSummary);
router.post('/initial', cashDrawerController.setInitialCash);
router.post('/close', cashDrawerController.closeShift);

module.exports = router;
