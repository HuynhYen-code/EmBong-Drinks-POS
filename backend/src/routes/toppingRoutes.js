const express = require('express');
const router = express.Router();
const toppingController = require('../controllers/toppingController');

router.get('/', toppingController.getAll);
router.post('/', toppingController.create);
router.put('/:id', toppingController.update);
router.delete('/:id', toppingController.delete);

module.exports = router;
