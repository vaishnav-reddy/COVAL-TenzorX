const mongoose = require('mongoose');

const comparableSchema = new mongoose.Schema(
  {
    city: { type: String, required: true },
    locality: { type: String, required: true },
    propertyType: { type: String },
    area: { type: Number },
    price: { type: Number }, // INR
    pricePerSqft: { type: Number },
    floor: { type: Number },
    age: { type: Number }, // years
    quality: { type: String },
    transactionDate: { type: Date },
    description: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ComparableTransaction', comparableSchema);
