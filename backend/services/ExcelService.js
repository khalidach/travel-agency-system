// backend/services/ExcelService.js
const excel = require("exceljs");

/**
 * Sanitizes a string to be used as a valid Excel named range.
 * @param {string} name - The string to sanitize.
 * @returns {string} The sanitized string.
 */
const sanitizeName = (name) => {
  if (!name) return "";
  let sanitized = name.toString().replace(/\s/g, "_");
  if (/^[0-9]/.test(sanitized)) {
    sanitized = "N_" + sanitized;
  }
  return sanitized;
};

/**
 * Generates an Excel workbook with booking data based on user role.
 * @param {Array<object>} bookings - The list of bookings.
 * @param {object} program - The program associated with the bookings.
 * @param {string} userRole - The role of the user requesting the export ('admin', 'manager', 'employee').
 * @returns {Promise<object>} A promise that resolves to an exceljs Workbook object.
 */
exports.generateBookingsExcel = async (bookings, program, userRole) => {
  const workbook = new excel.Workbook();
  const worksheet = workbook.addWorksheet("Bookings", {
    views: [{ rightToLeft: false }],
  });

  const allColumns = [
    { header: "ID", key: "id" },
    { header: "Prenom/Nom", key: "clientNameFr" },
    { header: "الاسم/النسب", key: "clientNameAr" },
    { header: "Passport Number", key: "passportNumber" },
    { header: "Phone Number", key: "phoneNumber" },
    { header: "الباقة", key: "packageId" },
    { header: "الفندق المختار", key: "hotels" },
    { header: "نوع الغرفة", key: "roomType" },
    { header: "Prix Cost", key: "basePrice" },
    { header: "Prix Vente", key: "sellingPrice" },
    { header: "Bénéfice", key: "profit" },
    { header: "Payé", key: "paid" },
    { header: "Reste", key: "remaining" },
  ];

  // Filter columns based on the user's role
  worksheet.columns = allColumns.filter((col) => {
    if (userRole === "admin") {
      return true; // Admin sees all columns
    }
    // Non-admins do not see 'basePrice' or 'profit'
    return col.key !== "basePrice" && col.key !== "profit";
  });

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  headerRow.height = 35;
  headerRow.eachCell((cell) => {
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF007BFF" },
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  let lastPhoneNumber = null;
  let mergeStartRow = 2;

  bookings.forEach((booking, index) => {
    const totalPaid = (booking.advancePayments || []).reduce(
      (sum, p) => sum + p.amount,
      0
    );
    const currentRowNum = index + 2;

    if (lastPhoneNumber !== null && booking.phoneNumber !== lastPhoneNumber) {
      if (currentRowNum - 1 > mergeStartRow) {
        worksheet.mergeCells(`E${mergeStartRow}:E${currentRowNum - 1}`);
        const cell = worksheet.getCell(`E${mergeStartRow}`);
        cell.alignment = { ...cell.alignment, vertical: "middle" };
      }
      mergeStartRow = currentRowNum;
    }

    const rowData = {
      id: index + 1,
      clientNameFr: booking.clientNameFr,
      clientNameAr: booking.clientNameAr,
      passportNumber: booking.passportNumber,
      phoneNumber: booking.phoneNumber,
      packageId: booking.packageId,
      hotels: (booking.selectedHotel.hotelNames || []).join(", "),
      roomType: (booking.selectedHotel.roomTypes || []).join(", "),
      sellingPrice: Number(booking.sellingPrice),
      paid: totalPaid,
      remaining: Number(booking.remainingBalance),
    };

    // Only add cost and profit for admins
    if (userRole === "admin") {
      rowData.basePrice = Number(booking.basePrice);
      rowData.profit = Number(booking.profit);
    }

    const row = worksheet.addRow(rowData);

    row.font = { size: 12 };
    row.height = 25;

    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFDDDDDD" } },
        left: { style: "thin", color: { argb: "FFDDDDDD" } },
        bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
        right: { style: "thin", color: { argb: "FFDDDDDD" } },
      };
      const columnKey = worksheet.getColumn(cell.col).key;
      const priceColumns = ["sellingPrice", "paid", "remaining"];
      if (userRole === "admin") {
        priceColumns.push("basePrice", "profit");
      }

      if (priceColumns.includes(columnKey)) {
        cell.numFmt = '#,##0.00 "MAD"';
      }
    });

    lastPhoneNumber = booking.phoneNumber;
  });

  if (bookings.length > 0 && bookings.length + 1 > mergeStartRow) {
    worksheet.mergeCells(`E${mergeStartRow}:E${bookings.length + 1}`);
    const cell = worksheet.getCell(`E${mergeStartRow}`);
    cell.alignment = { ...cell.alignment, vertical: "middle" };
  }

  worksheet.addRow([]);

  const lastDataRowNumber = bookings.length + 1;

  const totalsRow = worksheet.addRow({});
  const totalRowNumber = totalsRow.number;

  const totalColumnsKeys = ["sellingPrice", "paid", "remaining"];
  if (userRole === "admin") {
    totalColumnsKeys.push("basePrice", "profit");
  }

  // Find the column letter of the first column that gets a total
  const firstTotalCol = worksheet.columns.find((c) =>
    totalColumnsKeys.includes(c.key)
  );
  if (firstTotalCol) {
    const firstTotalColLetter = firstTotalCol.letter;

    // Merge cells up to the one before the first total column
    worksheet.mergeCells(
      `A${totalRowNumber}:${String.fromCharCode(
        firstTotalColLetter.charCodeAt(0) - 1
      )}${totalRowNumber}`
    );

    const totalLabelCell = worksheet.getCell(`A${totalRowNumber}`);
    totalLabelCell.value = "Total";
    totalLabelCell.font = { bold: true, size: 14 };
    totalLabelCell.alignment = { vertical: "middle", horizontal: "center" };
  }

  totalColumnsKeys.forEach((key) => {
    const col = worksheet.getColumn(key);
    if (col) {
      const colLetter = col.letter;
      const cell = worksheet.getCell(`${colLetter}${totalRowNumber}`);
      cell.value = {
        formula: `SUM(${colLetter}2:${colLetter}${lastDataRowNumber})`,
      };
      cell.numFmt = '#,##0.00 "MAD"';
      cell.font = { bold: true, size: 14 };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD3D3D3" },
      };
    }
  });

  totalsRow.height = 30;

  const MIN_WIDTH = 18;
  const PADDING = 5;

  worksheet.columns.forEach((column) => {
    const priceColumns = ["sellingPrice", "paid", "remaining"];
    if (userRole === "admin") {
      priceColumns.push("basePrice", "profit");
    }

    if (priceColumns.includes(column.key)) {
      column.width = 22;
    } else {
      let maxColumnLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellLength = cell.value ? cell.value.toString().length : 0;
        if (cellLength > maxColumnLength) {
          maxColumnLength = cellLength;
        }
      });
      column.width = Math.max(MIN_WIDTH, maxColumnLength + PADDING);
    }
  });

  return workbook;
};

/**
 * Generates an Excel template for a single program.
 * @param {object} program - The program object.
 * @returns {Promise<object>} A promise that resolves to an exceljs Workbook object.
 */
exports.generateBookingTemplateForProgramExcel = async (program) => {
  const workbook = new excel.Workbook();
  const templateSheet = workbook.addWorksheet("Booking Template");
  const validationSheet = workbook.addWorksheet("Lists");
  validationSheet.state = "hidden";

  const packageNames = (program.packages || []).map((p) => p.name);
  validationSheet.getColumn("A").values = ["Packages", ...packageNames];
  if (packageNames.length > 0) {
    workbook.definedNames.add(
      "Lists!$A$2:$A$" + (packageNames.length + 1),
      "Packages"
    );
  }

  let listColumnIndex = 1;
  const hotelRoomTypesMap = new Map();

  (program.packages || []).forEach((pkg) => {
    const packageNameSanitized = sanitizeName(pkg.name);
    (program.cities || []).forEach((city) => {
      const hotels = pkg.hotels[city.name] || [];
      if (hotels.length > 0) {
        listColumnIndex++;
        const col = validationSheet.getColumn(listColumnIndex);
        const rangeName = `${packageNameSanitized}_${sanitizeName(
          city.name
        )}_Hotels`;
        col.values = [rangeName, ...hotels];
        try {
          workbook.definedNames.add(
            `Lists!$${col.letter}$2:$${col.letter}$${hotels.length + 1}`,
            rangeName
          );
        } catch (e) {
          console.warn(`Could not create named range for Hotel: ${rangeName}.`);
        }
      }
    });

    (pkg.prices || []).forEach((price) => {
      const roomTypesForCombo = (price.roomTypes || []).map((rt) => rt.type);
      if (roomTypesForCombo.length > 0) {
        const individualHotels = price.hotelCombination.split("_");
        individualHotels.forEach((hotelName) => {
          if (!hotelRoomTypesMap.has(hotelName)) {
            hotelRoomTypesMap.set(hotelName, new Set());
          }
          roomTypesForCombo.forEach((rt) =>
            hotelRoomTypesMap.get(hotelName).add(rt)
          );
        });
      }
    });
  });

  for (const [hotelName, roomTypesSet] of hotelRoomTypesMap.entries()) {
    const roomTypes = Array.from(roomTypesSet);
    if (roomTypes.length > 0) {
      listColumnIndex++;
      const col = validationSheet.getColumn(listColumnIndex);
      const rangeName = `${sanitizeName(hotelName)}_Rooms`;
      col.values = [rangeName, ...roomTypes];
      try {
        workbook.definedNames.add(
          `Lists!$${col.letter}$2:$${col.letter}$${roomTypes.length + 1}`,
          rangeName
        );
      } catch (e) {
        console.warn(
          `Could not create named range for RoomType: ${rangeName}.`
        );
      }
    }
  }

  const headers = [
    { header: "Client Name (French)", key: "clientNameFr", width: 25 },
    { header: "Client Name (Arabic)", key: "clientNameAr", width: 25 },
    { header: "Passport Number", key: "passportNumber", width: 20 },
    { header: "Phone Number", key: "phoneNumber", width: 20 },
    { header: "Package", key: "package", width: 20 },
  ];

  const hotelHeaders = (program.cities || []).map((city) => ({
    header: `${city.name} Hotel`,
    key: `hotel_${sanitizeName(city.name)}`,
    width: 25,
  }));
  const roomTypeHeaders = (program.cities || []).map((city) => ({
    header: `${city.name} Room Type`,
    key: `roomType_${sanitizeName(city.name)}`,
    width: 20,
  }));

  templateSheet.columns = [
    ...headers,
    ...hotelHeaders,
    ...roomTypeHeaders,
    { header: "Selling Price", key: "sellingPrice", width: 15 },
  ];

  const headerRow = templateSheet.getRow(1);
  headerRow.font = { bold: true };

  for (let i = 2; i <= 101; i++) {
    templateSheet.getCell(`E${i}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ["=Packages"],
    };

    hotelHeaders.forEach((h) => {
      const cityNameSanitized = sanitizeName(h.header.replace(" Hotel", ""));
      const columnLetter = templateSheet.getColumn(h.key).letter;
      if (columnLetter) {
        const hotelFormula = `=INDIRECT(SUBSTITUTE(E${i}," ","_")&"_${cityNameSanitized}_Hotels")`;
        templateSheet.getCell(`${columnLetter}${i}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [hotelFormula],
        };
      }
    });

    roomTypeHeaders.forEach((h, index) => {
      const hotelColumnKey = hotelHeaders[index].key;
      const hotelColumn = templateSheet.getColumn(hotelColumnKey);
      if (hotelColumn) {
        const hotelColumnLetter = hotelColumn.letter;
        const roomTypeColumnLetter = templateSheet.getColumn(h.key).letter;
        const roomFormula = `=INDIRECT(SUBSTITUTE(${hotelColumnLetter}${i}," ","_")&"_Rooms")`;
        templateSheet.getCell(`${roomTypeColumnLetter}${i}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [roomFormula],
        };
      }
    });
  }

  return workbook;
};

/**
 * Parses an Excel file to bulk import bookings for a specific program.
 * @param {object} file - The uploaded file object (from multer).
 * @param {object} user - The user object from the request.
 * @param {object} db - The database connection pool.
 * @param {string} programId - The ID of the program to import bookings for.
 * @returns {Promise<object>} A promise that resolves to a success message.
 */
exports.parseBookingsFromExcel = async (file, user, db, programId) => {
  const client = await db.connect();
  const userId = user.adminId;
  try {
    await client.query("BEGIN");
    const workbook = new excel.Workbook();
    await workbook.xlsx.readFile(file.path);
    const worksheet = workbook.getWorksheet(1);

    const { rows: programs } = await client.query(
      'SELECT * FROM programs WHERE "userId" = $1 AND id = $2',
      [userId, programId]
    );

    if (programs.length === 0) {
      throw new Error(
        "Program not found or you are not authorized to access it."
      );
    }
    const program = programs[0];

    const { rows: allPricings } = await client.query(
      'SELECT * FROM program_pricing WHERE "userId" = $1 AND "programId" = $2',
      [userId, programId]
    );
    const { rows: existingBookings } = await client.query(
      'SELECT "passportNumber" FROM bookings WHERE "userId" = $1 AND "tripId" = $2',
      [userId, programId]
    );
    const existingPassportNumbers = new Set(
      existingBookings.map((b) => b.passportNumber)
    );

    const headerRowValues = worksheet.getRow(1).values;
    const headerMap = {};
    if (Array.isArray(headerRowValues)) {
      headerRowValues.forEach((header, index) => {
        if (header) headerMap[header.toString()] = index;
      });
    }

    const bookingsToCreate = [];
    let newBookingsCount = 0;

    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const rowData = {};
      Object.keys(headerMap).forEach((header) => {
        rowData[header] = row.getCell(headerMap[header]).value;
      });

      const passportNumber = rowData["Passport Number"];
      if (!passportNumber || existingPassportNumbers.has(passportNumber))
        continue;

      const programPricing = allPricings[0]; // Assuming one pricing per program
      if (!programPricing) continue;

      const bookingPackage = (program.packages || []).find(
        (p) => p.name === rowData["Package"]
      );
      if (!bookingPackage) continue;

      const selectedHotel = { cities: [], hotelNames: [], roomTypes: [] };
      (program.cities || []).forEach((city) => {
        const hotelName = rowData[`${city.name} Hotel`];
        const roomType = rowData[`${city.name} Room Type`];
        if (hotelName && roomType) {
          selectedHotel.cities.push(city.name);
          selectedHotel.hotelNames.push(hotelName);
          selectedHotel.roomTypes.push(roomType);
        }
      });

      const hotelCombination = selectedHotel.hotelNames.join("_");
      const priceStructure = (bookingPackage.prices || []).find(
        (p) => p.hotelCombination === hotelCombination
      );
      if (!priceStructure) continue;

      const guestMap = new Map(
        priceStructure.roomTypes.map((rt) => [rt.type, rt.guests])
      );

      const hotelCosts = selectedHotel.cities.reduce((total, city, index) => {
        const hotelName = selectedHotel.hotelNames[index];
        const roomTypeName = selectedHotel.roomTypes[index];
        const hotelInfo = (programPricing.allHotels || []).find(
          (h) => h.name === hotelName && h.city === city
        );
        const cityInfo = program.cities.find((c) => c.name === city);
        const guests = guestMap.get(roomTypeName) || 1;
        if (hotelInfo && cityInfo) {
          const pricePerNight = Number(
            hotelInfo.PricePerNights?.[roomTypeName] || 0
          );
          const nights = Number(cityInfo.nights || 0);
          if (guests > 0) return total + (pricePerNight * nights) / guests;
        }
        return total;
      }, 0);

      const basePrice = Math.round(
        Number(programPricing.ticketAirline || 0) +
          Number(programPricing.visaFees || 0) +
          Number(programPricing.guideFees || 0) +
          hotelCosts
      );
      const sellingPrice = Number(rowData["Selling Price"]) || 0;

      bookingsToCreate.push({
        userId: userId,
        employeeId: user.role === "admin" ? null : user.id,
        clientNameAr: rowData["Client Name (Arabic)"],
        clientNameFr: rowData["Client Name (French)"],
        phoneNumber: rowData["Phone Number"],
        passportNumber,
        tripId: program.id,
        packageId: rowData["Package"],
        selectedHotel,
        sellingPrice,
        basePrice,
        profit: sellingPrice - basePrice,
        advancePayments: [],
        remainingBalance: sellingPrice,
        isFullyPaid: sellingPrice <= 0,
      });
      existingPassportNumbers.add(passportNumber);
      newBookingsCount++;
    }

    for (const booking of bookingsToCreate) {
      await client.query(
        'INSERT INTO bookings ("userId", "employeeId", "clientNameAr", "clientNameFr", "phoneNumber", "passportNumber", "tripId", "packageId", "selectedHotel", "sellingPrice", "basePrice", profit, "advancePayments", "remainingBalance", "isFullyPaid") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)',
        [
          booking.userId,
          booking.employeeId,
          booking.clientNameAr,
          booking.clientNameFr,
          booking.phoneNumber,
          booking.passportNumber,
          booking.tripId,
          booking.packageId,
          JSON.stringify(booking.selectedHotel),
          booking.sellingPrice,
          booking.basePrice,
          booking.profit,
          "[]",
          booking.remainingBalance,
          booking.isFullyPaid,
        ]
      );
    }

    if (newBookingsCount > 0) {
      await client.query(
        'UPDATE programs SET "totalBookings" = "totalBookings" + $1 WHERE id = $2',
        [newBookingsCount, programId]
      );
    }

    await client.query("COMMIT");
    return {
      message: `Import complete. ${newBookingsCount} new bookings added.`,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Excel import error:", error);
    throw new Error("Error importing Excel file.");
  } finally {
    client.release();
  }
};
