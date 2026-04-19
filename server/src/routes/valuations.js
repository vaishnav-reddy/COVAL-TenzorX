const express = require('express');
const router = express.Router();
const { createValuation, getValuation, getHistory, generateReport } = require('../controllers/valuationController');

router.post('/create', createValuation);
router.get('/history', getHistory);
router.get('/:id', getValuation);
router.post('/:id/report', generateReport);

module.exports = router;
