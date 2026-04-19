const mongoose = require('mongoose');

const redFlagSchema = new mongoose.Schema({
  code: String,
  message: String,
  severity: { type: String, enum: ['low', 'medium', 'critical'] },
});

const valuationSchema = new mongoose.Schema(
  {
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    propertySnapshot: { type: Object }, // copy of property at valuation time

    // Valuation Engine
    marketValue: { type: Number },
    valueRangeLow: { type: Number },
    valueRangeHigh: { type: Number },
    pricePerSqft: { type: Number },
    valueDrivers: { type: Object },

    // Distress Engine
    distressValue: { type: Number },
    distressMultiplier: { type: Number },
    rbiErosionFlag: { type: Boolean, default: false },
    liquidationTimeline: { type: String },
    resaleRisk: { type: String, enum: ['low', 'medium', 'high'] },

    // Liquidity Engine
    liquidityScore: { type: Number },
    timeToSell: { type: String },
    exitCertainty: { type: String, enum: ['high', 'medium', 'low'] },

    // Risk & Fraud
    riskScore: { type: Number },
    redFlags: [redFlagSchema],
    overallRiskLabel: { type: String, enum: ['safe', 'caution', 'high_risk'] },

    // Confidence
    confidenceScore: { type: Number },
    confidenceBreakdown: { type: Object },

    // Comparables
    comparables: [{ type: Object }],

    // Audit Trail
    auditTrail: [
      {
        engine: String,
        timestamp: Date,
        duration: Number, // ms
        output: Object,
      },
    ],

    processingTime: { type: Number }, // ms
    status: { type: String, enum: ['processing', 'completed', 'failed'], default: 'completed' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Valuation', valuationSchema);
