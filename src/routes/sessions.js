const express = require('express');
const controller = require('../controllers/sessionsController');

const router = express.Router();

router.get('/', controller.listSessions);
router.get('/:id', controller.getSession);
router.post('/', controller.createSession);
router.put('/:id', controller.updateSession);
router.delete('/:id', controller.deleteSession);

module.exports = router;