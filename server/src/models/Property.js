const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    propertyType: { type: String, enum: ['residential', 'commercial', 'industrial', 'land'], required: true },
    city: { type: String, required: true },
    locality: { type: String, required: true },
    pincode: { type: String },
    area: { type: Number, required: true }, // sq ft
    yearOfConstruction: { type: Number },
    floorNumber: { type: Number, default: 0 },
    totalFloors: { type: Number, default: 1 },
    amenities: [{ type: String }],
    constructionQuality: { type: String, enum: ['standard', 'good', 'premium'], default: 'good' },
    declaredValue: { type: Number, required: true }, // in INR
    purpose: { type: String, enum: ['lap', 'mortgage', 'working_capital'], default: 'lap' },
    images: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Property', propertySchema);
