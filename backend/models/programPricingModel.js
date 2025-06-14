// backend/models/programPricingModel.js
const mongoose = require('mongoose');

const programPricingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  programId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program',
    required: true,
    index: true
  },
  selectProgram: {
    type: String,
    required: true
  },
  ticketAirline: {
    type: Number,
    required: true
  },
  visaFees: {
    type: Number,
    required: true
  },
  guideFees: {
    type: Number,
    required: true
  },
  allHotels: [{
    name: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    nights: {
      type: Number,
      required: true
    },
    PricePerNights: {
      double: Number,
      triple: Number,
      quad: Number,
      quintuple: Number
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('ProgramPricing', programPricingSchema);