const express = require('express');
const controller = require('../controllers/meditationsController');

const router = express.Router();

router.get('/', controller.listMeditations);
router.get('/:id', controller.getMeditation);
router.post('/', controller.createMeditation);
router.put('/:id', controller.updateMeditation);
router.delete('/:id', controller.deleteMeditation);

module.exports = router;