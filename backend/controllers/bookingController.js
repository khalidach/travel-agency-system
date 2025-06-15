// backend/controllers/bookingController.js
const excel = require('exceljs');

exports.getAllBookings = async (req, res) => {
  try {
    const { rows } = await req.db.query('SELECT * FROM bookings WHERE "userId" = $1', [req.user.id]);
    res.json(rows);
  } catch (error) {
    console.error('Get All Bookings Error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.createBooking = async (req, res) => {
  const { clientNameAr, clientNameFr, phoneNumber, passportNumber, tripId, packageId, selectedHotel, sellingPrice, basePrice, profit, advancePayments } = req.body;
  try {
    const totalPaid = (advancePayments || []).reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = sellingPrice - totalPaid;
    const isFullyPaid = remainingBalance <= 0;

    const { rows } = await req.db.query(
      'INSERT INTO bookings ("userId", "clientNameAr", "clientNameFr", "phoneNumber", "passportNumber", "tripId", "packageId", "selectedHotel", "sellingPrice", "basePrice", profit, "advancePayments", "remainingBalance", "isFullyPaid") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *',
      [req.user.id, clientNameAr, clientNameFr, phoneNumber, passportNumber, tripId, packageId, JSON.stringify(selectedHotel), sellingPrice, basePrice, profit, JSON.stringify(advancePayments || []), remainingBalance, isFullyPaid]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Create Booking Error:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.updateBooking = async (req, res) => {
  const { id } = req.params;
  const { clientNameAr, clientNameFr, phoneNumber, passportNumber, tripId, packageId, selectedHotel, sellingPrice, basePrice, profit, advancePayments } = req.body;
  try {
    const totalPaid = (advancePayments || []).reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = sellingPrice - totalPaid;
    const isFullyPaid = remainingBalance <= 0;

    const { rows } = await req.db.query(
      'UPDATE bookings SET "clientNameAr" = $1, "clientNameFr" = $2, "phoneNumber" = $3, "passportNumber" = $4, "tripId" = $5, "packageId" = $6, "selectedHotel" = $7, "sellingPrice" = $8, "basePrice" = $9, profit = $10, "advancePayments" = $11, "remainingBalance" = $12, "isFullyPaid" = $13 WHERE id = $14 AND "userId" = $15 RETURNING *',
      [clientNameAr, clientNameFr, phoneNumber, passportNumber, tripId, packageId, JSON.stringify(selectedHotel), sellingPrice, basePrice, profit, JSON.stringify(advancePayments || []), remainingBalance, isFullyPaid, id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found or user not authorized' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Update Booking Error:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.deleteBooking = async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await req.db.query('DELETE FROM bookings WHERE id = $1 AND "userId" = $2', [id, req.user.id]);
    if (rowCount === 0) {
      return res.status(404).json({ message: 'Booking not found or user not authorized' });
    }
    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Delete Booking Error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.addPayment = async (req, res) => {
  try {
    const { rows } = await req.db.query('SELECT * FROM bookings WHERE id = $1 AND "userId" = $2', [req.params.bookingId, req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found or user not authorized' });
    }
    
    const booking = rows[0];
    const newPayment = { ...req.body, _id: new Date().getTime().toString() };
    const advancePayments = [...(booking.advancePayments || []), newPayment];
    
    const totalPaid = advancePayments.reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = booking.sellingPrice - totalPaid;
    const isFullyPaid = remainingBalance <= 0;

    const { rows: updatedRows } = await req.db.query(
        'UPDATE bookings SET "advancePayments" = $1, "remainingBalance" = $2, "isFullyPaid" = $3 WHERE id = $4 RETURNING *',
        [JSON.stringify(advancePayments), remainingBalance, isFullyPaid, req.params.bookingId]
    );
    res.json(updatedRows[0]);
  } catch (error) {
    console.error('Add Payment Error:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.updatePayment = async (req, res) => {
    try {
        const { rows } = await req.db.query('SELECT * FROM bookings WHERE id = $1 AND "userId" = $2', [req.params.bookingId, req.user.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Booking not found or user not authorized' });
        }
    
        const booking = rows[0];
        const advancePayments = (booking.advancePayments || []).map(p => p._id === req.params.paymentId ? { ...p, ...req.body, _id: p._id } : p);
        const totalPaid = advancePayments.reduce((sum, p) => sum + p.amount, 0);
        const remainingBalance = booking.sellingPrice - totalPaid;
        const isFullyPaid = remainingBalance <= 0;

        const { rows: updatedRows } = await req.db.query(
            'UPDATE bookings SET "advancePayments" = $1, "remainingBalance" = $2, "isFullyPaid" = $3 WHERE id = $4 RETURNING *',
            [JSON.stringify(advancePayments), remainingBalance, isFullyPaid, req.params.bookingId]
        );
        res.json(updatedRows[0]);
    } catch (error) {
        console.error('Update Payment Error:', error);
        res.status(400).json({ message: error.message });
    }
};

exports.deletePayment = async (req, res) => {
    try {
        const { rows } = await req.db.query('SELECT * FROM bookings WHERE id = $1 AND "userId" = $2', [req.params.bookingId, req.user.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Booking not found or user not authorized' });
        }
    
        const booking = rows[0];
        const advancePayments = (booking.advancePayments || []).filter(p => p._id !== req.params.paymentId);
        const totalPaid = advancePayments.reduce((sum, p) => sum + p.amount, 0);
        const remainingBalance = booking.sellingPrice - totalPaid;
        const isFullyPaid = remainingBalance <= 0;

        const { rows: updatedRows } = await req.db.query(
            'UPDATE bookings SET "advancePayments" = $1, "remainingBalance" = $2, "isFullyPaid" = $3 WHERE id = $4 RETURNING *',
            [JSON.stringify(advancePayments), remainingBalance, isFullyPaid, req.params.bookingId]
        );
        res.json(updatedRows[0]);
    } catch (error) {
        console.error('Delete Payment Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Excel-related functions are complex and their logic is heavily tied to the original structure.
// They are provided here but may need further testing and adaptation.
exports.exportBookingsToExcel = async (req, res) => {
    try {
        const { programId } = req.params;
        if (!programId || programId === 'all') {
            return res.status(400).json({ message: 'A specific program must be selected for export.' });
        }

        const { rows: bookings } = await req.db.query('SELECT * FROM bookings WHERE "tripId" = $1 AND "userId" = $2 ORDER BY "phoneNumber"', [programId, req.user.id]);
        const { rows: programs } = await req.db.query('SELECT * FROM programs WHERE id = $1', [programId]);

        if (programs.length === 0) return res.status(404).json({ message: 'Program not found.' });
        const program = programs[0];
        
        const workbook = new excel.Workbook();
        // ... (rest of Excel generation logic from your file) ...
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=bookings.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Failed to export to Excel:', error);
        res.status(500).json({ message: 'Failed to export bookings to Excel.' });
    }
};

exports.exportBookingTemplate = async (req, res) => {
    res.status(501).json({ message: "Template export needs to be re-implemented for PostgreSQL." });
};

exports.importBookingsFromExcel = async (req, res) => {
    res.status(501).json({ message: "Booking import needs to be re-implemented for PostgreSQL." });
};
