// backend/controllers/bookingController.js
const Booking = require('../models/bookingModel');
const Program = require('../models/programModel');
const ProgramPricing = require('../models/programPricingModel');
const excel = require('exceljs');

// Helper to sanitize names for Excel Named Ranges.
const sanitizeName = (name) => {
    if (!name) return '';
    // This function creates a valid name for Excel's named ranges.
    // It replaces invalid characters and ensures the name doesn't start with a number.
    let sanitized = name.toString().replace(/[^a-zA-Z0-9_.]/g, '_');
    if (/^[0-9]/.test(sanitized)) {
        sanitized = 'N_' + sanitized;
    }
    return sanitized;
};


// --- (Keep all existing functions like getAllBookings, createBooking, etc. here) ---
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
    res.status(500).json({ message: error.message });
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

    worksheet.columns = [
      { header: 'ID', key: 'id' }, { header: 'Name (French)', key: 'clientNameFr' },
      { header: 'Name (Arabic)', key: 'clientNameAr' }, { header: 'Passport Number', key: 'passportNumber' },
      { header: 'Phone Number', key: 'phoneNumber' }, { header: 'Package', key: 'packageId' },
      { header: 'Hotels Chosen', key: 'hotels' }, { header: 'Room Type', key: 'roomType' },
      { header: 'Base Price', key: 'basePrice', style: { numFmt: '#,##0.00 "MAD"' } },
      { header: 'Sell Price', key: 'sellingPrice', style: { numFmt: '#,##0.00 "MAD"' } },
      { header: 'Profit', key: 'profit', style: { numFmt: '#,##0.00 "MAD"' } },
      { header: 'Paid', key: 'paid', style: { numFmt: '#,##0.00 "MAD"' } },
      { header: 'Remaining', key: 'remaining', style: { numFmt: '#,##0.00 "MAD"' } },
    ];
    
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 16 };
    headerRow.height = 35;
    headerRow.eachCell(cell => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    bookings.forEach((booking, index) => {
        const totalPaid = booking.advancePayments.reduce((sum, p) => sum + p.amount, 0);
        const row = worksheet.addRow({
            id: index + 1, clientNameFr: booking.clientNameFr, clientNameAr: booking.clientNameAr,
            passportNumber: booking.passportNumber, phoneNumber: booking.phoneNumber, packageId: booking.packageId,
            hotels: booking.selectedHotel.hotelNames.join(', '), roomType: booking.selectedHotel.roomType,
            basePrice: booking.basePrice, sellingPrice: booking.sellingPrice, profit: booking.profit,
            paid: totalPaid, remaining: booking.remainingBalance
        });
        
        row.font = { size: 16 };
        row.height = 30;
        row.eachCell(cell => {
            cell.alignment = { vertical: 'middle', horizontal: typeof cell.value === 'number' || cell.col === 3 ? 'right' : 'left' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
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

exports.exportBookingTemplate = async (req, res) => {
  try {
      const workbook = new excel.Workbook();
      const templateSheet = workbook.addWorksheet('Booking Template');
      const validationSheet = workbook.addWorksheet('Lists');
      validationSheet.state = 'hidden';

      const programs = await Program.find({ user: req.user.id });

      const roomTypes = ['Double', 'Triple', 'Quad', 'Quintuple'];
      validationSheet.getColumn('A').values = ['RoomTypes', ...roomTypes];
      workbook.definedNames.add('Lists!$A$2:$A$6', 'RoomTypes');

      const programNames = programs.map(p => p.name);
      validationSheet.getColumn('B').values = ['Programs', ...programNames];
      if (programNames.length > 0) {
          workbook.definedNames.add(`Lists!$B$2:$B$${programNames.length + 1}`, 'Programs');
      }

      let listColumnIndex = 2; // Start from column 'C'
      programs.forEach(program => {
          const programNameSanitized = sanitizeName(program.name);
          const packageNames = program.packages.map(p => p.name);
          if (packageNames.length > 0) {
              listColumnIndex++;
              const col = validationSheet.getColumn(listColumnIndex);
              const rangeName = `${programNameSanitized}_Packages`;
              col.values = [rangeName, ...packageNames];
              try {
                  workbook.definedNames.add(`Lists!$${col.letter}$2:$${col.letter}$${packageNames.length + 1}`, rangeName);
              } catch (e) {
                  console.warn(`Could not create named range for Package: ${rangeName}. Skipping. Error: ${e.message}`);
              }
          }

          program.packages.forEach(pkg => {
              const packageNameSanitized = sanitizeName(pkg.name);
              // *** SIMPLIFIED LOGIC FOR HOTELS ***
              program.cities.forEach(city => {
                  const hotels = pkg.hotels.get(city.name) || [];
                  if (hotels.length > 0) {
                      listColumnIndex++;
                      const col = validationSheet.getColumn(listColumnIndex);
                      // ** CHANGED: Hotel list name now only depends on Package and City **
                      const rangeName = `${packageNameSanitized}_${sanitizeName(city.name)}_Hotels`;
                      col.values = [rangeName, ...hotels];
                      try {
                          workbook.definedNames.add(`Lists!$${col.letter}$2:$${col.letter}$${hotels.length + 1}`, rangeName);
                      } catch(e) {
                          console.warn(`Could not create named range for Hotel: ${rangeName}. Skipping. Error: ${e.message}`);
                      }
                  }
              });
          });
      });

      const headers = [
          { header: 'Client Name (French)', key: 'clientNameFr', width: 25 }, { header: 'Client Name (Arabic)', key: 'clientNameAr', width: 25 },
          { header: 'Passport Number', key: 'passportNumber', width: 20 }, { header: 'Phone Number', key: 'phoneNumber', width: 20 },
          { header: 'Program', key: 'program', width: 30 }, { header: 'Package', key: 'package', width: 20 },
          { header: 'Room Type', key: 'roomType', width: 15 },
      ];
      const hotelHeaders = [...new Set(programs.flatMap(p => p.cities.map(c => c.name)))].map(name => ({
          header: `${name} Hotel`, key: `hotel_${sanitizeName(name)}`, width: 25
      }));
      
      templateSheet.columns = [...headers, ...hotelHeaders, { header: 'Selling Price', key: 'sellingPrice', width: 15 }];
      templateSheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      templateSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D3748' } };
      templateSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

      for (let i = 2; i <= 101; i++) {
          templateSheet.getCell(`E${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['=Programs'] };
          templateSheet.getCell(`F${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`=INDIRECT(SUBSTITUTE(E${i}," ","_")&"_Packages")`] };
          templateSheet.getCell(`G${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['=RoomTypes'] };
          
          hotelHeaders.forEach(h => {
              const cityNameSanitized = sanitizeName(h.key.split('_')[1]);
              const columnLetter = h.letter || templateSheet.getColumn(h.key).letter;
              if (columnLetter) {
                  // ** CHANGED: Hotel formula now only depends on Package (F column) and City **
                  const hotelFormula = `=INDIRECT(SUBSTITUTE(F${i}," ","_")&"_${cityNameSanitized}_Hotels")`;
                  templateSheet.getCell(`${columnLetter}${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [hotelFormula] };
              }
          });
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=Booking_Template.xlsx');
      await workbook.xlsx.write(res);
      res.end();

  } catch (error) {
      console.error('Failed to export template:', error);
      res.status(500).json({ message: 'Failed to export booking template.' });
  }
};

exports.importBookingsFromExcel = async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
  
    try {
      const workbook = new excel.Workbook();
      await workbook.xlsx.readFile(req.file.path);
      const worksheet = workbook.getWorksheet(1);
      
      const bookingsToCreate = [];
      let skippedCount = 0;
  
      const allPrograms = await Program.find({ user: req.user.id });
      const allPricings = await ProgramPricing.find({ user: req.user.id });
      const existingPassportNumbers = new Set((await Booking.find({ user: req.user.id }).select('passportNumber')).map(b => b.passportNumber));

      const getGuestsPerRoom = (roomType) => {
        const type = (roomType || '').toString().toLowerCase();
        switch (type) {
            case "double": return 2; case "triple": return 3;
            case "quad": return 4; case "quintuple": return 5;
            default: return 2;
        }
      };
      
      const headerRow = worksheet.getRow(1).values;
  
      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        const rowData = {};
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const header = headerRow[colNumber];
            if(header) rowData[header] = cell.value;
        });

        const passportNumber = rowData['Passport Number'];
        if (!passportNumber || existingPassportNumbers.has(passportNumber)) {
            if(passportNumber) skippedCount++;
            continue;
        }

        const programName = rowData['Program'];
        const program = allPrograms.find(p => p.name === programName);
        if (!program) continue;
  
        const programPricing = allPricings.find(p => p.programId.toString() === program._id.toString());
        if (!programPricing) continue;
  
        const selectedHotel = {
            cities: [], hotelNames: [], roomType: rowData['Room Type'],
        };

        program.cities.forEach(city => {
            const hotelHeader = `${city.name} Hotel`;
            const hotelName = rowData[hotelHeader];
            if (hotelName) {
                selectedHotel.cities.push(city.name);
                selectedHotel.hotelNames.push(hotelName);
            }
        });
  
        const hotelCosts = selectedHotel.cities.reduce((total, city, index) => {
            const hotelName = selectedHotel.hotelNames[index];
            const hotelInfo = programPricing.allHotels.find(h => h.name === hotelName && h.city === city);
            if (hotelInfo && selectedHotel.roomType) {
                const roomTypeKey = selectedHotel.roomType.toString().toLowerCase();
                const pricePerNight = hotelInfo.PricePerNights[roomTypeKey];
                const guests = getGuestsPerRoom(selectedHotel.roomType);
                if (pricePerNight != null && hotelInfo.nights && guests) {
                    return total + (pricePerNight * hotelInfo.nights) / guests;
                }
            }
            return total;
        }, 0);
  
        const basePrice = Math.round(programPricing.ticketAirline + programPricing.visaFees + programPricing.guideFees + hotelCosts);
        const sellingPrice = Number(rowData['Selling Price']) || 0;
        const remainingBalance = sellingPrice;
        
        const bookingData = {
          clientNameFr: rowData['Client Name (French)'], clientNameAr: rowData['Client Name (Arabic)'],
          passportNumber: passportNumber, phoneNumber: rowData['Phone Number'],
          tripId: program._id, packageId: rowData['Package'],
          selectedHotel, sellingPrice, basePrice, profit: sellingPrice - basePrice,
          user: req.user.id, advancePayments: [], remainingBalance,
          isFullyPaid: remainingBalance <= 0,
        };
  
        bookingsToCreate.push(bookingData);
        existingPassportNumbers.add(passportNumber); 
      }
  
      let createdCount = 0;
      if (bookingsToCreate.length > 0) {
        const createdBookings = await Booking.insertMany(bookingsToCreate);
        createdCount = createdBookings.length;
      }
  
      res.status(201).json({
        message: `Import complete. ${createdCount} new bookings added, ${skippedCount} duplicates skipped.`,
      });
  
    } catch (error) {
      console.error('Excel import error:', error);
      res.status(500).json({ message: 'Error importing Excel file. Check data format.' });
    }
};