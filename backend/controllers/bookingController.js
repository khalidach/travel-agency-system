const Booking = require('../models/bookingModel');
const Program = require('../models/programModel');
const excel = require('exceljs');

// Get all bookings
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find();
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new booking
exports.createBooking = async (req, res) => {
  try {
    const booking = new Booking(req.body);
    const newBooking = await booking.save();
    res.status(201).json(newBooking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update a booking
exports.updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json(booking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a booking
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add a payment to a booking
exports.addPayment = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.advancePayments.push(req.body);
    const updatedBooking = await booking.save();
    res.json(updatedBooking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update a payment in a booking
exports.updatePayment = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const paymentIndex = booking.advancePayments.findIndex(
      payment => payment._id.toString() === req.params.paymentId
    );

    if (paymentIndex === -1) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    booking.advancePayments[paymentIndex] = {
      ...booking.advancePayments[paymentIndex].toObject(),
      ...req.body
    };

    const updatedBooking = await booking.save();
    res.json(updatedBooking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a payment from a booking
exports.deletePayment = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.advancePayments = booking.advancePayments.filter(
      payment => payment._id.toString() !== req.params.paymentId
    );

    const updatedBooking = await booking.save();
    res.json(updatedBooking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}; 

// Export bookings for a specific program to an Excel file
exports.exportBookingsToExcel = async (req, res) => {
  try {
    const { programId } = req.params;
    
    if (!programId || programId === 'all') {
      return res.status(400).json({ message: 'A specific program must be selected for export.' });
    }

    const bookings = await Booking.find({ tripId: programId });
    const program = await Program.findById(programId);

    if (!program) {
        return res.status(404).json({ message: 'Program not found.' });
    }
    
    if (bookings.length === 0) {
      return res.status(404).json({ message: 'No bookings found for this program.' });
    }

    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Bookings');

    worksheet.columns = [
      { header: 'Client Name (FR)', key: 'clientNameFr', width: 30 },
      { header: 'Client Name (AR)', key: 'clientNameAr', width: 30 },
      { header: 'Passport Number', key: 'passportNumber', width: 20 },
      { header: 'Phone Number', key: 'phoneNumber', width: 20 },
      { header: 'Room Type', key: 'roomType', width: 15 },
      { header: 'Selling Price', key: 'sellingPrice', width: 15 },
      { header: 'Base Price', key: 'basePrice', width: 15 },
      { header: 'Profit', key: 'profit', width: 15 },
      { header: 'Total Paid', key: 'totalPaid', width: 15 },
      { header: 'Remaining Balance', key: 'remainingBalance', width: 20 },
      { header: 'Payment Status', key: 'paymentStatus', width: 15 }
    ];

    bookings.forEach(booking => {
        const totalPaid = booking.advancePayments.reduce((sum, p) => sum + p.amount, 0);
        worksheet.addRow({
            clientNameFr: booking.clientNameFr,
            clientNameAr: booking.clientNameAr,
            passportNumber: booking.passportNumber,
            phoneNumber: booking.phoneNumber,
            roomType: booking.selectedHotel.roomType,
            sellingPrice: booking.sellingPrice,
            basePrice: booking.basePrice,
            profit: booking.profit,
            totalPaid: totalPaid,
            remainingBalance: booking.remainingBalance,
            paymentStatus: booking.isFullyPaid ? 'Paid' : 'Pending'
        });
    });

    const fileName = `${program.name.replace(/\s/g, '_')}_bookings.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Failed to export to Excel:', error);
    res.status(500).json({ message: 'Failed to export bookings to Excel.' });
  }
};