const mongoose = require('mongoose');

const programSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Hajj', 'Umrah', 'Tourism'],
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  cities: [{
    name: {
      type: String,
      required: true
    },
    nights: {
      type: Number,
      required: true
    }
  }],
  packages: [{
    name: {
      type: String,
      required: true
    },
    hotels: {
      type: Map,
      of: [String],
      required: true
    },
    prices: [{
      hotelCombination: {
        type: String,
        required: true
      },
      roomTypes: [{
        type: {
          type: String,
          required: true
        },
        sellingPrice: {
          type: Number,
          required: true
        }
      }]
    }]
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Program', programSchema); 