const express = require('express');
const router = express.Router();
const { getCityData, getLocalityData, getAllCities } = require('../controllers/marketDataController');

router.get('/cities', getAllCities);
router.get('/:city', getCityData);
router.get('/:city/:locality', getLocalityData);

module.exports = router;
