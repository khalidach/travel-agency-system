const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true
  },
  method: {
    type: String,
    enum: ['cash', 'cheque', 'transfer', 'card'],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  chequeNumber: String,
  bankName: String,
  chequeCashingDate: String
});

const bookingSchema = new mongoose.Schema({
  clientNameAr: {
    type: String,
    required: true
  },
  clientNameFr: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  passportNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tripId: {
    type: String,
    required: true
  },
  packageId: {
    type: String,
    required: true
  },
  selectedHotel: {
    cities: [String],
    hotelNames: [String],
    roomType: String
  },
  sellingPrice: {
    type: Number,
    required: true
  },
  basePrice: {
    type: Number,
    required: true
  },
  advancePayments: [paymentSchema],
  remainingBalance: {
    type: Number,
    default: 0
  },
  isFullyPaid: {
    type: Boolean,
    default: false
  },
  profit: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to calculate remaining balance and isFullyPaid
bookingSchema.pre('save', function(next) {
  const totalPaid = this.advancePayments.reduce((sum, payment) => sum + payment.amount, 0);
  this.remainingBalance = this.sellingPrice - totalPaid;
  this.isFullyPaid = this.remainingBalance <= 0;
  next();
});

module.exports = mongoose.model('Booking', bookingSchema); 