const mongoose = require('mongoose');

const marketDataSchema = new mongoose.Schema(
  {
    city: { type: String, required: true },
    locality: { type: String, required: true },
    avgPricePerSqft: { type: Number, required: true }, // INR
    circleRate: { type: Number, required: true }, // INR/sqft (govt rate)
    demandIndex: { type: Number, min: 1, max: 10 }, // 1–10
    liquidityScoreBase: { type: Number }, // base for liquidity calc
    propertyCount: { type: Number },
    marketAbsorptionRate: { type: Number }, // % units sold per month
    connectivity: { type: Number, min: 1, max: 10 },
    infrastructureScore: { type: Number, min: 1, max: 10 },
    yoyAppreciation: { type: Number }, // % year-over-year
  },
  { timestamps: true }
);

marketDataSchema.index({ city: 1, locality: 1 }, { unique: true });

module.exports = mongoose.model('MarketData', marketDataSchema);
