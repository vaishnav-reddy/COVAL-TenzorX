const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    // Applicant Information (NEW)
    applicantName: { type: String, required: true },
    applicantEmail: { type: String },
    applicantPhone: { type: String, required: true },
    applicantPAN: { type: String },
    
    // Property Information
    propertyType: { type: String, enum: ['residential', 'commercial', 'industrial', 'land'], required: true },
    propertySubType: { type: String }, // apartment, villa, plot, shop, warehouse, etc.
    city: { type: String, required: true },
    locality: { type: String, required: true },
    pincode: { type: String },
    area: { type: Number, required: true }, // sq ft
    areaType: { type: String, enum: ['carpet', 'builtup', 'superbuiltup'], default: 'builtup' },
    yearOfConstruction: { type: Number },
    floorNumber: { type: Number, default: 0 },
    totalFloors: { type: Number, default: 1 },
    amenities: [{ type: String }],
    constructionQuality: { type: String, enum: ['standard', 'good', 'premium'], default: 'good' },
    declaredValue: { type: Number, required: false }, // Made optional for backward compatibility
    purpose: { type: String, enum: ['lap', 'mortgage', 'working_capital'], default: 'lap' },
    
    // Legal & Ownership (PS requirement)
    ownershipType: { type: String, enum: ['freehold', 'leasehold'], default: 'freehold' },
    titleClarity: { type: String, enum: ['clear', 'disputed', 'litigation'], default: 'clear' },
    
    // Income & Usage (PS requirement)
    occupancyStatus: { type: String, enum: ['self_occupied', 'rented', 'vacant'], default: 'self_occupied' },
    monthlyRent: { type: Number }, // optional, only if rented
    
    // Market scenario for stress testing
    marketScenario: { type: String, enum: ['normal', 'growth', 'crash'], default: 'normal' },
    images: [{ type: String }],
    
    // Credit Information (NEW)
    cibilScore: { type: Number },
    existingLoans: { type: Number },
    existingEMIs: { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Property', propertySchema);

