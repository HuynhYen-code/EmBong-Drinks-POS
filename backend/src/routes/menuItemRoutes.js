const express = require('express');
const router = express.Router();
const menuItemController = require('../controllers/menuItemController');

router.get('/', menuItemController.getAll);
router.post('/', menuItemController.create);
router.put('/:id', menuItemController.update);

module.exports = router;
