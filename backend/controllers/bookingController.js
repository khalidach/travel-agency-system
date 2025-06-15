// backend/controllers/bookingController.js
const Booking = require('../models/bookingModel');
const Program = require('../models/programModel');
const excel = require('exceljs');

// Get all bookings for the logged-in user
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new booking for the logged-in user
exports.createBooking = async (req, res) => {
  try {
    const booking = new Booking({
      ...req.body,
      user: req.user.id
    });
    const newBooking = await booking.save();
    res.status(201).json(newBooking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update a booking
exports.updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.user.toString() !== req.user.id) {
        return res.status(401).json({ message: 'User not authorized' });
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    res.json(updatedBooking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a booking
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.user.toString() !== req.user.id) {
        return res.status(401).json({ message: 'User not authorized' });
    }
    
    await booking.deleteOne();
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
    
    if (booking.user.toString() !== req.user.id) {
        return res.status(401).json({ message: 'User not authorized' });
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

    if (booking.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
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

    if (booking.user.toString() !== req.user.id) {
        return res.status(401).json({ message: 'User not authorized' });
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

    const bookings = await Booking.find({ tripId: programId, user: req.user.id });
    bookings.sort((a, b) => (a.phoneNumber || '').localeCompare(b.phoneNumber || ''));

    const program = await Program.findById(programId);

    if (!program) {
        return res.status(404).json({ message: 'Program not found.' });
    }
    
    if (bookings.length === 0) {
      return res.status(404).json({ message: 'No bookings found for this program.' });
    }

    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Bookings', {
      views: [{ rightToLeft: false }]
    });

    // Define columns with headers only (widths will be set after data is added)
    worksheet.columns = [
      { header: 'ID', key: 'id' },
      { header: 'Name (French)', key: 'clientNameFr' },
      { header: 'Name (Arabic)', key: 'clientNameAr' },
      { header: 'Passport Number', key: 'passportNumber' },
      { header: 'Phone Number', key: 'phoneNumber' },
      { header: 'Package', key: 'packageId' },
      { header: 'Hotels Chosen', key: 'hotels' },
      { header: 'Room Type', key: 'roomType' },
      { header: 'Base Price', key: 'basePrice', style: { numFmt: '#,##0.00 "MAD"' } },
      { header: 'Sell Price', key: 'sellingPrice', style: { numFmt: '#,##0.00 "MAD"' } },
      { header: 'Profit', key: 'profit', style: { numFmt: '#,##0.00 "MAD"' } },
      { header: 'Paid', key: 'paid', style: { numFmt: '#,##0.00 "MAD"' } },
      { header: 'Remaining', key: 'remaining', style: { numFmt: '#,##0.00 "MAD"' } },
    ];
    
    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 16 };
    headerRow.height = 35; // Fixed header height
    headerRow.eachCell(cell => {
        cell.alignment = { 
            vertical: 'middle', 
            horizontal: 'center'
        };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFF00' }
        };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    // Add data rows and apply styling
    bookings.forEach((booking, index) => {
        const totalPaid = booking.advancePayments.reduce((sum, p) => sum + p.amount, 0);
        const row = worksheet.addRow({
            id: index + 1,
            clientNameFr: booking.clientNameFr,
            clientNameAr: booking.clientNameAr,
            passportNumber: booking.passportNumber,
            phoneNumber: booking.phoneNumber,
            packageId: booking.packageId,
            hotels: booking.selectedHotel.hotelNames.join(', '),
            roomType: booking.selectedHotel.roomType,
            basePrice: booking.basePrice,
            sellingPrice: booking.sellingPrice,
            profit: booking.profit,
            paid: totalPaid,
            remaining: booking.remainingBalance
        });
        
        // Set font size and row height for each cell in the data row
        row.font = { size: 16 };
        row.height = 30; // Fixed row height
        row.eachCell(cell => {
            // Special alignment for different types of content
            if (typeof cell.value === 'number') {
                cell.alignment = { vertical: 'middle', horizontal: 'right' };
            } else if (cell.col === 3) { // Arabic names column
                cell.alignment = { vertical: 'middle', horizontal: 'right' };
            } else {
                cell.alignment = { vertical: 'middle', horizontal: 'left' };
            }
            // Add borders to all cells
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    });

    // Merge phone number cells
    let mergeStart = -1;
    for (let i = 2; i <= bookings.length + 1; i++) {
        const currentPhoneCell = worksheet.getCell(`E${i}`);
        const prevPhoneCell = i > 2 ? worksheet.getCell(`E${i - 1}`) : null;

        if (prevPhoneCell && currentPhoneCell.value === prevPhoneCell.value && currentPhoneCell.value) {
            if (mergeStart === -1) {
                mergeStart = i - 1;
            }
        } else {
            if (mergeStart !== -1) {
                worksheet.mergeCells(`E${mergeStart}:E${i - 1}`);
                worksheet.getCell(`E${mergeStart}`).alignment = { vertical: 'middle', horizontal: 'left' };
                mergeStart = -1;
            }
        }
    }
    if (mergeStart !== -1) {
        worksheet.mergeCells(`E${mergeStart}:E${bookings.length + 1}`);
        worksheet.getCell(`E${mergeStart}`).alignment = { vertical: 'middle', horizontal: 'left' };
    }


    // Add empty row for spacing
    const spacingRow = worksheet.addRow([]);
    spacingRow.height = 20;
    
    // Add summary row with totals
    const lastDataRow = worksheet.lastRow.number;
    const summaryRow = worksheet.addRow([
        `Total Bookings: ${bookings.length}`,
        null, null, null, null, null, null,
        'Totals:',
        { formula: `SUM(I2:I${lastDataRow-1})`, style: { numFmt: '#,##0.00 "MAD"' } },
        { formula: `SUM(J2:J${lastDataRow-1})`, style: { numFmt: '#,##0.00 "MAD"' } },
        { formula: `SUM(K2:K${lastDataRow-1})`, style: { numFmt: '#,##0.00 "MAD"' } },
        { formula: `SUM(L2:L${lastDataRow-1})`, style: { numFmt: '#,##0.00 "MAD"' } },
        { formula: `SUM(M2:M${lastDataRow-1})`, style: { numFmt: '#,##0.00 "MAD"' } }
    ]);
    
    // Style the summary row
    summaryRow.font = { bold: true, size: 16 };
    summaryRow.height = 35;
    summaryRow.eachCell(cell => {
        if (cell.value) {
            cell.alignment = { 
                vertical: 'middle',
                horizontal: cell.type === 'number' ? 'right' : 'left'
            };
            // Add borders to summary row
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        }
    });

    // Auto-fit columns based on content
    worksheet.columns.forEach((column) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
            // Get the actual length of the cell content
            let cellLength;
            if (cell.value === null || cell.value === undefined) {
                cellLength = 0;
            } else if (typeof cell.value === 'number') {
                // For numbers, convert to formatted string to get actual display length
                cellLength = cell.text.length;
            } else if (typeof cell.value === 'object' && cell.value.formula) {
                // For formulas, estimate based on typical MAD number format
                cellLength = 15; // Approximate width for currency values
            } else {
                cellLength = cell.value.toString().length;
            }
            
            // Account for font size difference
            const fontFactor = cell.font && cell.font.size ? (cell.font.size / 11) : 1;
            cellLength = cellLength * fontFactor;
            
            // Update maxLength if this cell's content is longer
            maxLength = Math.max(maxLength, cellLength);
        });
        
        // Set column width with some padding
        column.width = Math.min(Math.max(maxLength + 2, 8), 100);
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