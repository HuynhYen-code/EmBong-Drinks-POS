const express = require('express');
const router = express.Router();
const prepController = require('../controllers/prepController');

router.get('/', prepController.getAll);
router.post('/', prepController.create);
router.put('/:id', prepController.update);
router.delete('/:id', prepController.delete);

module.exports = router;
