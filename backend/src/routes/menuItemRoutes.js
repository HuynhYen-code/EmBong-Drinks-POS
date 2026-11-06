const express = require('express');
const router = express.Router();
const menuItemController = require('../controllers/menuItemController');

router.get('/', menuItemController.getAll);
router.post('/', menuItemController.create);
router.post('/migrate-categories', menuItemController.migrateCategories);
router.put('/:id', menuItemController.update);
router.delete('/size/:id', menuItemController.deleteSize);
router.delete('/item/:id', menuItemController.deleteItem);

module.exports = router;
