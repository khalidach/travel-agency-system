// backend/controllers/bookingController.js
const excel = require('exceljs');

// Helper to sanitize names for Excel Named Ranges.
const sanitizeName = (name) => {
    if (!name) return '';
    // Replace spaces with underscores, as spaces are not allowed in Excel named ranges.
    // This version preserves unicode characters like Arabic.
    let sanitized = name.toString().replace(/\s/g, '_');
    if (/^[0-9]/.test(sanitized)) {
        sanitized = 'N_' + sanitized;
    }
    return sanitized;
};


// --- Booking CRUD Operations ---

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
  const { clientNameAr, clientNameFr, phoneNumber, passportNumber, tripId, packageId, selectedHotel, sellingPrice, basePrice, profit, advancePayments, relatedPersons } = req.body;
  try {
    const totalPaid = (advancePayments || []).reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = sellingPrice - totalPaid;
    const isFullyPaid = remainingBalance <= 0;

    const { rows } = await req.db.query(
      'INSERT INTO bookings ("userId", "clientNameAr", "clientNameFr", "phoneNumber", "passportNumber", "tripId", "packageId", "selectedHotel", "sellingPrice", "basePrice", profit, "advancePayments", "remainingBalance", "isFullyPaid", "relatedPersons") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *',
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
      'UPDATE bookings SET "clientNameAr" = $1, "clientNameFr" = $2, "phoneNumber" = $3, "passportNumber" = $4, "tripId" = $5, "packageId" = $6, "selectedHotel" = $7, "sellingPrice" = $8, "basePrice" = $9, profit = $10, "advancePayments" = $11, "remainingBalance" = $12, "isFullyPaid" = $13, "relatedPersons" = $14 WHERE id = $15 AND "userId" = $16 RETURNING *',
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
        validationSheet.state = 'hidden';

        const { rows: programs } = await req.db.query('SELECT * FROM programs WHERE "userId" = $1', [req.user.id]);

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
            const packageNames = (program.packages || []).map(p => p.name);
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

            (program.packages || []).forEach(pkg => {
                const packageNameSanitized = sanitizeName(pkg.name);
                (program.cities || []).forEach(city => {
                    const hotels = pkg.hotels[city.name] || [];
                    if (hotels.length > 0) {
                        listColumnIndex++;
                        const col = validationSheet.getColumn(listColumnIndex);
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
        ];
        
        const allCityNames = [...new Set(programs.flatMap(p => (p.cities || []).map(c => c.name)))];
        const hotelHeaders = allCityNames.map(name => ({
            header: `${name} Hotel`, key: `hotel_${sanitizeName(name)}`, width: 25
        }));
        
        const roomTypeHeaders = allCityNames.map(name => ({
            header: `${name} Room Type`, key: `roomType_${sanitizeName(name)}`, width: 20
        }));

        templateSheet.columns = [...headers, ...hotelHeaders, ...roomTypeHeaders, { header: 'Selling Price', key: 'sellingPrice', width: 15 }];
        
        const headerRow = templateSheet.getRow(1);
        headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D3748' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

        for (let i = 2; i <= 101; i++) {
            templateSheet.getCell(`E${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['=Programs'] };
            templateSheet.getCell(`F${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`=INDIRECT(SUBSTITUTE(E${i}," ","_")&"_Packages")`] };
            
            hotelHeaders.forEach(h => {
                const cityNameSanitized = sanitizeName(h.header.replace(' Hotel', ''));
                const columnLetter = templateSheet.getColumn(h.key).letter;
                if (columnLetter) {
                    const hotelFormula = `=INDIRECT(SUBSTITUTE(F${i}," ","_")&"_${cityNameSanitized}_Hotels")`;
                    templateSheet.getCell(`${columnLetter}${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [hotelFormula] };
                }
            });
            roomTypeHeaders.forEach(h => {
                const columnLetter = templateSheet.getColumn(h.key).letter;
                if (columnLetter) {
                    templateSheet.getCell(`${columnLetter}${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['=RoomTypes'] };
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
    
    const client = await req.db.connect();
    try {
        await client.query('BEGIN');

        const workbook = new excel.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.getWorksheet(1);
        
        const bookingsToCreate = [];
        let skippedCount = 0;
    
        const { rows: allPrograms } = await client.query('SELECT * FROM programs WHERE "userId" = $1', [req.user.id]);
        const { rows: allPricings } = await client.query('SELECT * FROM program_pricing WHERE "userId" = $1', [req.user.id]);
        const { rows: existingBookings } = await client.query('SELECT "passportNumber" FROM bookings WHERE "userId" = $1', [req.user.id]);
        const existingPassportNumbers = new Set(existingBookings.map(b => b.passportNumber));

        const getGuestsPerRoom = (roomType) => {
            const type = (roomType || '').toString().toLowerCase();
            switch (type) {
                case "double": return 2; case "triple": return 3;
                case "quad": return 4; case "quintuple": return 5;
                default: return 2;
            }
        };
        
        const headerRow = worksheet.getRow(1).values;
        const headerMap = {};
        headerRow.forEach((header, index) => {
            if (header) headerMap[header] = index;
        });
    
        for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            const rowData = {};
            Object.keys(headerMap).forEach(header => {
                rowData[header] = row.getCell(headerMap[header]).value;
            });

            const passportNumber = rowData['Passport Number'];
            if (!passportNumber || existingPassportNumbers.has(passportNumber)) {
                if(passportNumber) skippedCount++;
                continue;
            }

            const programName = rowData['Program'];
            const program = allPrograms.find(p => p.name === programName);
            if (!program) continue;
    
            const programPricing = allPricings.find(p => p.programId == program.id);
            if (!programPricing) continue;
    
            const selectedHotel = {
                cities: [], hotelNames: [], roomTypes: [],
            };

            (program.cities || []).forEach(city => {
                const hotelHeader = `${city.name} Hotel`;
                const roomTypeHeader = `${city.name} Room Type`;
                const hotelName = rowData[hotelHeader];
                const roomType = rowData[roomTypeHeader];
                if (hotelName && roomType) {
                    selectedHotel.cities.push(city.name);
                    selectedHotel.hotelNames.push(hotelName);
                    selectedHotel.roomTypes.push(roomType);
                }
            });
    
            const hotelCosts = selectedHotel.cities.reduce((total, city, index) => {
                const hotelName = selectedHotel.hotelNames[index];
                const roomType = selectedHotel.roomTypes[index];
                const hotelInfo = (programPricing.allHotels || []).find(h => h.name === hotelName && h.city === city);
                if (hotelInfo && roomType) {
                    const roomTypeKey = roomType.toString().toLowerCase();
                    const pricePerNight = hotelInfo.PricePerNights[roomTypeKey];
                    const guests = getGuestsPerRoom(roomType);
                    if (pricePerNight != null && hotelInfo.nights && guests > 0) {
                        return total + (pricePerNight * hotelInfo.nights) / guests;
                    }
                }
                return total;
            }, 0);
    
            const basePrice = Math.round(Number(programPricing.ticketAirline || 0) + Number(programPricing.visaFees || 0) + Number(programPricing.guideFees || 0) + hotelCosts);
            const sellingPrice = Number(rowData['Selling Price']) || 0;
            const remainingBalance = sellingPrice;
            
            const bookingData = {
              clientNameFr: rowData['Client Name (French)'], clientNameAr: rowData['Client Name (Arabic)'],
              passportNumber: passportNumber, phoneNumber: rowData['Phone Number'],
              tripId: program.id, packageId: rowData['Package'],
              selectedHotel, sellingPrice, basePrice, profit: sellingPrice - basePrice,
              user: req.user.id, advancePayments: [], remainingBalance,
              isFullyPaid: remainingBalance <= 0,
            };
    
            bookingsToCreate.push(bookingData);
            existingPassportNumbers.add(passportNumber);
        }
    
        if (bookingsToCreate.length > 0) {
            for (const booking of bookingsToCreate) {
                await client.query(
                    'INSERT INTO bookings ("userId", "clientNameAr", "clientNameFr", "phoneNumber", "passportNumber", "tripId", "packageId", "selectedHotel", "sellingPrice", "basePrice", profit, "advancePayments", "remainingBalance", "isFullyPaid") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)',
                    [booking.user, booking.clientNameAr, booking.clientNameFr, booking.phoneNumber, booking.passportNumber, booking.tripId, booking.packageId, JSON.stringify(booking.selectedHotel), booking.sellingPrice, booking.basePrice, booking.profit, JSON.stringify(booking.advancePayments), booking.remainingBalance, booking.isFullyPaid]
                );
            }
        }
        
        await client.query('COMMIT');

        res.status(201).json({
          message: `Import complete. ${bookingsToCreate.length} new bookings added, ${skippedCount} duplicates skipped.`,
        });
    
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Excel import error:', error);
        res.status(500).json({ message: 'Error importing Excel file. Check data format and integrity.' });
    } finally {
        client.release();
    }
};