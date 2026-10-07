const express = require('express');
const router = express.Router();
const toppingController = require('../controllers/toppingController');

router.get('/', toppingController.getAll);
router.post('/', toppingController.create);
router.put('/:id', toppingController.update);

module.exports = router;
