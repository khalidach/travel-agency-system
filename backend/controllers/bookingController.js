const excel = require('exceljs');

// Helper to sanitize names for Excel Named Ranges.
const sanitizeName = (name) => {
    if (!name) return '';
    // Replace common special characters with underscores.
    // This pattern is replicated in the Excel SUBSTITUTE formula.
    let sanitized = name.toString()
      .replace(/\s/g, '_')
      .replace(/\//g, '_')
      .replace(/-/g, '_')
      .replace(/&/g, '_')
      .replace(/\(/g, '_')
      .replace(/\)/g, '_');
      
    // Ensure it does not start with a number or invalid character.
    if (!/^[a-zA-Z_]/.test(sanitized)) {
        sanitized = 'N_' + sanitized;
    }
    // Excel has a limit on name length, truncate if necessary.
    return sanitized.substring(0, 250);
};


// --- Booking CRUD Operations ---

exports.getAllBookings = async (req, res) => {
  try {
    const { rows } = await req.db.query('SELECT * FROM bookings WHERE "userId" = $1 ORDER BY "createdAt" DESC', [req.user.id]);
    res.json(rows);
  } catch (error) {
    console.error('Get All Bookings Error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.createBooking = async (req, res) => {
  const { clientNameAr, clientNameFr, phoneNumber, passportNumber, tripId, packageId, selectedHotel, sellingPrice, basePrice, profit, advancePayments, relatedPersons } = req.body;
  try {
    const totalPaid = (advancePayments || []).reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = sellingPrice - totalPaid;
    const isFullyPaid = remainingBalance <= 0;

    const { rows } = await req.db.query(
      'INSERT INTO bookings ("userId", "clientNameAr", "clientNameFr", "phoneNumber", "passportNumber", "tripId", "packageId", "selectedHotel", "sellingPrice", "basePrice", profit, "advancePayments", "remainingBalance", "isFullyPaid", "relatedPersons", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW()) RETURNING *',
      [req.user.id, clientNameAr, clientNameFr, phoneNumber, passportNumber, tripId, packageId, JSON.stringify(selectedHotel), sellingPrice, basePrice, profit, JSON.stringify(advancePayments || []), remainingBalance, isFullyPaid, JSON.stringify(relatedPersons || [])]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Create Booking Error:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.updateBooking = async (req, res) => {
  const { id } = req.params;
  const { clientNameAr, clientNameFr, phoneNumber, passportNumber, tripId, packageId, selectedHotel, sellingPrice, basePrice, profit, advancePayments, relatedPersons } = req.body;
  try {
    const totalPaid = (advancePayments || []).reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = sellingPrice - totalPaid;
    const isFullyPaid = remainingBalance <= 0;

    const { rows } = await req.db.query(
      'UPDATE bookings SET "clientNameAr" = $1, "clientNameFr" = $2, "phoneNumber" = $3, "passportNumber" = $4, "tripId" = $5, "packageId" = $6, "selectedHotel" = $7, "sellingPrice" = $8, "basePrice" = $9, profit = $10, "advancePayments" = $11, "remainingBalance" = $12, "isFullyPaid" = $13, "relatedPersons" = $14, "updatedAt" = NOW() WHERE id = $15 AND "userId" = $16 RETURNING *',
      [clientNameAr, clientNameFr, phoneNumber, passportNumber, tripId, packageId, JSON.stringify(selectedHotel), sellingPrice, basePrice, profit, JSON.stringify(advancePayments || []), remainingBalance, isFullyPaid, JSON.stringify(relatedPersons || []), id, req.user.id]
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


// --- Payment CRUD Operations ---

exports.addPayment = async (req, res) => {
  try {
    const { rows } = await req.db.query('SELECT * FROM bookings WHERE id = $1 AND "userId" = $2', [req.params.bookingId, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Booking not found' });
    
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
    res.status(400).json({ message: error.message });
  }
};

exports.updatePayment = async (req, res) => {
    try {
        const { rows } = await req.db.query('SELECT * FROM bookings WHERE id = $1 AND "userId" = $2', [req.params.bookingId, req.user.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Booking not found' });
    
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
        res.status(400).json({ message: error.message });
    }
};

exports.deletePayment = async (req, res) => {
    try {
        const { rows } = await req.db.query('SELECT * FROM bookings WHERE id = $1 AND "userId" = $2', [req.params.bookingId, req.user.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Booking not found' });
    
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
        res.status(500).json({ message: error.message });
    }
};

// --- Excel Operations ---
exports.exportBookingsToExcel = async (req, res) => {
    try {
      const { programId } = req.params;
      
      if (!programId || programId === 'all') {
        return res.status(400).json({ message: 'A specific program must be selected for export.' });
      }
  
      const { rows: bookings } = await req.db.query('SELECT * FROM bookings WHERE "tripId" = $1 AND "userId" = $2 ORDER BY "phoneNumber", "clientNameFr"', [programId, req.user.id]);
      
      if (bookings.length === 0) {
          return res.status(404).json({ message: 'No bookings found for this program.' });
      }
  
      const { rows: programs } = await req.db.query('SELECT * FROM programs WHERE id = $1', [programId]);
      const program = programs[0];
  
      if (!program) {
          return res.status(404).json({ message: 'Program not found.' });
      }
      
      const workbook = new excel.Workbook();
      const worksheet = workbook.addWorksheet('Bookings', {
        views: [{ rightToLeft: false }]
      });
  
      // Define columns without width
      worksheet.columns = [
        { header: 'ID', key: 'id' },
        { header: 'Prenom/Nom', key: 'clientNameFr' },
        { header: 'الاسم/النسب', key: 'clientNameAr' },
        { header: 'Passport Number', key: 'passportNumber' },
        { header: 'Phone Number', key: 'phoneNumber' },
        { header: 'الباقة', key: 'packageId' },
        { header: 'الفندق المختار', key: 'hotels' },
        { header: 'نوع الغرفة', key: 'roomType' },
        { header: 'Prix Cost', key: 'basePrice' },
        { header: 'Prix Vente', key: 'sellingPrice' },
        { header: 'Bénéfice', key: 'profit' },
        { header: 'Payé', key: 'paid' },
        { header: 'Reste', key: 'remaining' },
      ];
      
      // Style the header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF'} };
      headerRow.height = 35;
      headerRow.eachCell(cell => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF007BFF' } };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
  
      let lastPhoneNumber = null;
      let mergeStartRow = 2;
  
      // Add data rows and apply styles
      bookings.forEach((booking, index) => {
          const totalPaid = (booking.advancePayments || []).reduce((sum, p) => sum + p.amount, 0);
          const currentRowNum = index + 2;
  
          if (lastPhoneNumber !== null && booking.phoneNumber !== lastPhoneNumber) {
              if (currentRowNum - 1 > mergeStartRow) {
                  worksheet.mergeCells(`E${mergeStartRow}:E${currentRowNum - 1}`);
                  const cell = worksheet.getCell(`E${mergeStartRow}`);
                  cell.alignment = { ...cell.alignment, vertical: 'middle' };
              }
              mergeStartRow = currentRowNum;
          }
  
          const row = worksheet.addRow({
              id: index + 1,
              clientNameFr: booking.clientNameFr,
              clientNameAr: booking.clientNameAr,
              passportNumber: booking.passportNumber,
              phoneNumber: booking.phoneNumber,
              packageId: booking.packageId,
              hotels: (booking.selectedHotel.hotelNames || []).join(', '),
              roomType: (booking.selectedHotel.roomTypes || []).join(', '),
              basePrice: Number(booking.basePrice),
              sellingPrice: Number(booking.sellingPrice),
              profit: Number(booking.profit),
              paid: totalPaid,
              remaining: Number(booking.remainingBalance)
          });
          
          row.font = { size: 12 };
          row.height = 25;
          
          row.eachCell({ includeEmpty: true }, (cell) => {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
              cell.border = { top: { style: 'thin', color: { argb: 'FFDDDDDD'} }, left: { style: 'thin', color: { argb: 'FFDDDDDD'} }, bottom: { style: 'thin', color: { argb: 'FFDDDDDD'} }, right: { style: 'thin', color: { argb: 'FFDDDDDD'} } };
              const columnKey = worksheet.getColumn(cell.col).key;
              if (['basePrice', 'sellingPrice', 'profit', 'paid', 'remaining'].includes(columnKey)) {
                  cell.numFmt = '#,##0.00 "MAD"';
              }
          });
  
          lastPhoneNumber = booking.phoneNumber;
      });
  
      if (bookings.length > 0 && bookings.length + 1 > mergeStartRow) {
          worksheet.mergeCells(`E${mergeStartRow}:E${bookings.length + 1}`);
          const cell = worksheet.getCell(`E${mergeStartRow}`);
          cell.alignment = { ...cell.alignment, vertical: 'middle' };
      }
  
      // Add a blank row for spacing
      worksheet.addRow([]);
  
      const lastDataRowNumber = bookings.length + 1;
      
      // Add the totals row
      const totalsRow = worksheet.addRow({});
      const totalRowNumber = totalsRow.number;
      worksheet.mergeCells(`A${totalRowNumber}:H${totalRowNumber}`);
      const totalLabelCell = worksheet.getCell(`A${totalRowNumber}`);
      totalLabelCell.value = 'Total';
      totalLabelCell.font = { bold: true, size: 14 };
      totalLabelCell.alignment = { vertical: 'middle', horizontal: 'center' };
  
      worksheet.getCell(`I${totalRowNumber}`).value = { formula: `SUM(I2:I${lastDataRowNumber})` };
      worksheet.getCell(`J${totalRowNumber}`).value = { formula: `SUM(J2:J${lastDataRowNumber})` };
      worksheet.getCell(`K${totalRowNumber}`).value = { formula: `SUM(K2:K${lastDataRowNumber})` };
      worksheet.getCell(`L${totalRowNumber}`).value = { formula: `SUM(L2:L${lastDataRowNumber})` };
      worksheet.getCell(`M${totalRowNumber}`).value = { formula: `SUM(M2:M${lastDataRowNumber})` };
  
      // Style the totals row
      totalsRow.font = { bold: true, size: 14 };
      totalsRow.height = 30;
      ['I', 'J', 'K', 'L', 'M'].forEach(col => {
          const cell = worksheet.getCell(`${col}${totalRowNumber}`);
          cell.numFmt = '#,##0.00 "MAD"';
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } }; // Light gray fill
      });
  
      // --- Auto-fit column widths (Hybrid Approach) ---
      const MIN_WIDTH = 18; // Increased minimum width
      const PADDING = 5;    // Increased padding
  
      worksheet.columns.forEach(column => {
          const priceColumns = ['basePrice', 'sellingPrice', 'profit', 'paid', 'remaining'];
          if (priceColumns.includes(column.key)) {
              // For price columns, set a fixed generous width to handle large totals
              column.width = 22;
          } else {
              // For other columns, calculate width based on content
              let maxColumnLength = 0;
              column.eachCell({ includeEmpty: true }, cell => {
                  const cellLength = cell.value ? cell.value.toString().length : 0;
                  if (cellLength > maxColumnLength) {
                      maxColumnLength = cellLength;
                  }
              });
              column.width = Math.max(MIN_WIDTH, maxColumnLength + PADDING);
          }
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
        validationSheet.state = 'veryHidden';

        const { rows: programs } = await req.db.query('SELECT * FROM programs WHERE "userId" = $1', [req.user.id]);
        
        // This is a fixed list now, as room types are defined per hotel combination
        const defaultRoomTypes = ['Double', 'Triple', 'Quad', 'Quintuple'];
        validationSheet.getColumn('A').values = ['DefaultRoomTypes', ...defaultRoomTypes];
        workbook.definedNames.add('Lists!$A$2:$A$6', 'DefaultRoomTypes');


        // --- Create all necessary named ranges for dependent dropdowns ---
        let listColumnIndex = 1; 

        // 1. Programs List
        const programNames = programs.map(p => p.name);
        validationSheet.getColumn(++listColumnIndex).values = ['Programs', ...programNames];
        if (programNames.length > 0) {
            workbook.definedNames.add('Lists!$B$2:$B$' + (programNames.length + 1), 'Programs');
        }

        programs.forEach(program => {
            const programSanitized = sanitizeName(program.name);
            
            // 2. Packages List (for each program)
            const packageNames = (program.packages || []).map(p => p.name);
            if (packageNames.length > 0) {
                const col = validationSheet.getColumn(++listColumnIndex);
                const rangeName = `${programSanitized}_Packages`;
                col.values = [rangeName, ...packageNames];
                workbook.definedNames.add(`Lists!$${col.letter}$2:$${col.letter}$${packageNames.length + 1}`, rangeName);
            }
            
            // 3. Hotel & Room Type Lists
            (program.packages || []).forEach(pkg => {
                const packageSanitized = sanitizeName(pkg.name);
                // Hotels per city
                (program.cities || []).forEach(city => {
                    const hotels = pkg.hotels[city.name] || [];
                    if (hotels.length > 0) {
                        const col = validationSheet.getColumn(++listColumnIndex);
                        const rangeName = `${packageSanitized}_${sanitizeName(city.name)}_Hotels`;
                        col.values = [rangeName, ...hotels];
                        workbook.definedNames.add(`Lists!$${col.letter}$2:$${col.letter}$${hotels.length + 1}`, rangeName);
                    }
                });
                // Room types per hotel combination
                (pkg.prices || []).forEach(price => {
                    const roomTypesForCombo = (price.roomTypes || []).map(rt => rt.type);
                    if (roomTypesForCombo.length > 0) {
                        const col = validationSheet.getColumn(++listColumnIndex);
                        const rangeName = `${sanitizeName(price.hotelCombination)}_Rooms`;
                        col.values = [rangeName, ...roomTypesForCombo];
                        workbook.definedNames.add(`Lists!$${col.letter}$2:$${col.letter}$${roomTypesForCombo.length + 1}`, rangeName);
                    }
                });
            });
        });

        // --- Setup the template sheet ---
        const allCityNames = [...new Set(programs.flatMap(p => (p.cities || []).map(c => c.name)))];
        const headers = [
            { header: 'Client Name (French)', key: 'clientNameFr', width: 25 }, { header: 'Client Name (Arabic)', key: 'clientNameAr', width: 25 },
            { header: 'Passport Number', key: 'passportNumber', width: 20 }, { header: 'Phone Number', key: 'phoneNumber', width: 20 },
            { header: 'Program', key: 'program', width: 30 }, { header: 'Package', key: 'package', width: 20 },
        ];
        
        const hotelHeaders = allCityNames.map((name, index) => ({ header: `${name} Hotel`, key: `hotel_${index}`, width: 25 }));
        const roomTypeHeaders = allCityNames.map((name, index) => ({ header: `${name} Room Type`, key: `roomType_${index}`, width: 20 }));

        templateSheet.columns = [...headers, ...hotelHeaders, ...roomTypeHeaders, { header: 'Selling Price', key: 'sellingPrice', width: 15 }];
        
        const headerRow = templateSheet.getRow(1);
        headerRow.font = { bold: true };

        // Apply data validation formulas
        for (let i = 2; i <= 101; i++) {
            templateSheet.getCell(`E${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['=Programs'] };
            templateSheet.getCell(`F${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`=INDIRECT(SUBSTITUTE(E${i}," ","_")&"_Packages")`] };
            
            let hotelFormulaParts = [];
            hotelHeaders.forEach((h, index) => {
                const citySanitized = sanitizeName(allCityNames[index]);
                const columnLetter = templateSheet.getColumn(h.key).letter;
                const formula = `=INDIRECT(SUBSTITUTE($F${i}," ","_")&"_${citySanitized}_Hotels")`;
                templateSheet.getCell(`${columnLetter}${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [formula] };
                hotelFormulaParts.push(`SUBSTITUTE(${columnLetter}${i}," ","_")`);
            });
            
            // This formula now correctly builds the hotel combination string to find the room types
            const hotelCombinationFormula = hotelFormulaParts.join('&"_"&');

            roomTypeHeaders.forEach((h, index) => {
                const columnLetter = templateSheet.getColumn(h.key).letter;
                const formula = `=INDIRECT(${hotelCombinationFormula}&"_Rooms")`;
                templateSheet.getCell(`${columnLetter}${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [formula] };
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
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    
    const client = await req.db.connect();
    try {
        await client.query('BEGIN');
        const workbook = new excel.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.getWorksheet(1);
        
        const { rows: allPrograms } = await client.query('SELECT * FROM programs WHERE "userId" = $1', [req.user.id]);
        const { rows: allPricings } = await client.query('SELECT * FROM program_pricing WHERE "userId" = $1', [req.user.id]);
        const { rows: existingBookings } = await client.query('SELECT "passportNumber" FROM bookings WHERE "userId" = $1', [req.user.id]);
        const existingPassportNumbers = new Set(existingBookings.map(b => b.passportNumber));

        const headerRowValues = worksheet.getRow(1).values;
        const headerMap = {};
        if (Array.isArray(headerRowValues)) {
            headerRowValues.forEach((header, index) => {
                if (header) headerMap[header.toString()] = index;
            });
        }
    
        const bookingsToCreate = [];
        for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            const rowData = {};
            Object.keys(headerMap).forEach(header => {
                rowData[header] = row.getCell(headerMap[header]).value;
            });
            
            const passportNumber = rowData['Passport Number'];
            if (!passportNumber || existingPassportNumbers.has(passportNumber)) continue;

            const program = allPrograms.find(p => p.name === rowData['Program']);
            if (!program) continue;
            
            const programPricing = allPricings.find(p => p.programId == program.id);
            if (!programPricing) continue;

            const bookingPackage = (program.packages || []).find(p => p.name === rowData['Package']);
            if (!bookingPackage) continue;

            const selectedHotel = { cities: [], hotelNames: [], roomTypes: [] };
            (program.cities || []).forEach(city => {
                const hotelName = rowData[`${city.name} Hotel`];
                const roomType = rowData[`${city.name} Room Type`];
                if (hotelName && roomType) {
                    selectedHotel.cities.push(city.name);
                    selectedHotel.hotelNames.push(hotelName);
                    selectedHotel.roomTypes.push(roomType);
                }
            });

            const hotelCombination = selectedHotel.hotelNames.join('_');
            const priceStructure = (bookingPackage.prices || []).find(p => p.hotelCombination === hotelCombination);
            if (!priceStructure) continue;

            const guestMap = new Map(priceStructure.roomTypes.map(rt => [rt.type, rt.guests]));

            const hotelCosts = selectedHotel.cities.reduce((total, city, index) => {
                const hotelName = selectedHotel.hotelNames[index];
                const roomTypeName = selectedHotel.roomTypes[index];
                const hotelInfo = (programPricing.allHotels || []).find(h => h.name === hotelName && h.city === city);
                const cityInfo = program.cities.find(c => c.name === city);
                const guests = guestMap.get(roomTypeName) || 1;
                if (hotelInfo && cityInfo) {
                    const pricePerNight = Number(hotelInfo.PricePerNights?.[roomTypeName] || 0);
                    const nights = Number(cityInfo.nights || 0);
                    if (guests > 0) return total + (pricePerNight * nights) / guests;
                }
                return total;
            }, 0);

            const basePrice = Math.round(Number(programPricing.ticketAirline || 0) + Number(programPricing.visaFees || 0) + Number(programPricing.guideFees || 0) + hotelCosts);
            const sellingPrice = Number(rowData['Selling Price']) || 0;
            
            bookingsToCreate.push({
              userId: req.user.id, clientNameAr: rowData['Client Name (Arabic)'], clientNameFr: rowData['Client Name (French)'], phoneNumber: rowData['Phone Number'],
              passportNumber, tripId: program.id, packageId: rowData['Package'], selectedHotel, sellingPrice, basePrice, profit: sellingPrice - basePrice,
              advancePayments: [], remainingBalance: sellingPrice, isFullyPaid: sellingPrice <= 0,
            });
            existingPassportNumbers.add(passportNumber);
        }
    
        for (const booking of bookingsToCreate) {
            await client.query(
                'INSERT INTO bookings ("userId", "clientNameAr", "clientNameFr", "phoneNumber", "passportNumber", "tripId", "packageId", "selectedHotel", "sellingPrice", "basePrice", profit, "advancePayments", "remainingBalance", "isFullyPaid") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)',
                [booking.userId, booking.clientNameAr, booking.clientNameFr, booking.phoneNumber, booking.passportNumber, booking.tripId, booking.packageId, JSON.stringify(booking.selectedHotel), booking.sellingPrice, booking.basePrice, booking.profit, '[]', booking.remainingBalance, booking.isFullyPaid]
            );
        }
        
        await client.query('COMMIT');
        res.status(201).json({ message: `Import complete. ${bookingsToCreate.length} new bookings added.` });
    
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Excel import error:', error);
        res.status(500).json({ message: 'Error importing Excel file.' });
    } finally {
        client.release();
    }
};