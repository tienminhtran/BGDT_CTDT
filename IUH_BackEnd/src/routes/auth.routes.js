const express = require('express');
const controller = require('../controllers/auth.controller');

const router = express.Router();

router.get('/captcha', controller.captcha);
router.get('/login-status', controller.loginStatus);
router.post('/login', controller.login);
router.get('/me', controller.me);
router.post('/logout', controller.logout);

module.exports = router;
