const express = require('express');
const controller = require('../controllers/lms.controller');

const router = express.Router();

router.get('/sesskey', controller.sesskey);
router.post('/ajax', controller.ajax);
router.get('/change-password/status', controller.changePasswordStatus);
router.post('/change-password', controller.changePassword);

module.exports = router;
