const MarketData = require('../models/MarketData');

async function getCityData(req, res, next) {
  try {
    const data = await MarketData.find({ city: { $regex: new RegExp(`^${req.params.city}$`, 'i') } }).lean();
    if (!data.length) return res.status(404).json({ success: false, message: 'No data found for this city' });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getLocalityData(req, res, next) {
  try {
    const data = await MarketData.findOne({
      city: { $regex: new RegExp(`^${req.params.city}$`, 'i') },
      locality: { $regex: new RegExp(`^${req.params.locality}$`, 'i') },
    }).lean();
    if (!data) return res.status(404).json({ success: false, message: 'No data found for this locality' });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getAllCities(req, res, next) {
  try {
    const cities = await MarketData.distinct('city');
    res.json({ success: true, data: cities });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCityData, getLocalityData, getAllCities };
