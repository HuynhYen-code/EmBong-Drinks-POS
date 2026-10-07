const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materialController');

router.get('/', materialController.getAll);
router.post('/', materialController.create);
router.put('/:id', materialController.update);

module.exports = router;
