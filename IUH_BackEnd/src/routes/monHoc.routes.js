const express = require('express');
const controller = require('../controllers/monHoc.controller');

const router = express.Router();

// GET /api/subjects
router.get('/', controller.list);

module.exports = router;
