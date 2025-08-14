// backend/services/BookingExcelService.js
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

  // Base columns
  let allColumns = [
    { header: "ID", key: "id" },
    { header: "Prenom/Nom", key: "clientNameFr" },
    { header: "الاسم/النسب", key: "clientNameAr" },
    { header: "Passport Number", key: "passportNumber" },
    { header: "Phone Number", key: "phoneNumber" },
    { header: "Variation", key: "variationName" },
    { header: "الباقة", key: "packageId" },
  ];

  // Dynamically add hotel and room type columns based on program cities
  const hasCities =
    program.variations &&
    program.variations[0] &&
    program.variations[0].cities &&
    program.variations[0].cities.length > 0;
  if (hasCities) {
    const hotelHeaders = (program.variations[0].cities || []).map((city) => ({
      header: `${city.name} Hotel`,
      key: `hotel_${sanitizeName(city.name)}`,
    }));
    const roomTypeHeaders = (program.variations[0].cities || []).map(
      (city) => ({
        header: `${city.name} Room Type`,
        key: `roomType_${sanitizeName(city.name)}`,
      })
    );
    allColumns.push(...hotelHeaders, ...roomTypeHeaders);
  } else {
    // Fallback for programs without structured city/hotel data
    allColumns.push(
      { header: "الفندق المختار", key: "hotels" },
      { header: "نوع الغرفة", key: "roomType" }
    );
  }

  // Add pricing columns at the end
  allColumns.push(
    { header: "Prix Cost", key: "basePrice" },
    { header: "Prix Vente", key: "sellingPrice" },
    { header: "Bénéfice", key: "profit" },
    { header: "Payé", key: "paid" },
    { header: "Reste", key: "remaining" }
  );

  // Filter columns based on the user's role
  worksheet.columns = allColumns.filter((col) => {
    if (userRole === "admin") {
      return true; // Admin sees all columns
    }
    // Non-admins do not see 'basePrice' or 'profit'
    return col.key !== "basePrice" && col.key !== "profit";
  });

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 20, color: { argb: "FFFFFFFF" } };
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

  // Correctly re-order bookings to group families together.
  const bookingMap = new Map(bookings.map((b) => [b.id, b]));
  const memberIds = new Set();
  bookings.forEach((booking) => {
    if (booking.relatedPersons) {
      booking.relatedPersons.forEach((p) => memberIds.add(p.ID));
    }
  });

  const orderedBookings = [];
  const processedIds = new Set();

  for (const booking of bookings) {
    if (processedIds.has(booking.id) || memberIds.has(booking.id)) {
      continue;
    }

    orderedBookings.push(booking);
    processedIds.add(booking.id);

    if (booking.relatedPersons && booking.relatedPersons.length > 0) {
      for (const related of booking.relatedPersons) {
        const memberBooking = bookingMap.get(related.ID);
        if (memberBooking && !processedIds.has(memberBooking.id)) {
          orderedBookings.push(memberBooking);
          processedIds.add(memberBooking.id);
        }
      }
    }
  }

  // Add any remaining bookings that might be members but their leader wasn't in the initial list for some reason
  for (const booking of bookings) {
    if (!processedIds.has(booking.id)) {
      orderedBookings.push(booking);
    }
  }

  // Add rows from the correctly ordered list
  orderedBookings.forEach((booking, index) => {
    const totalPaid = (booking.advancePayments || []).reduce(
      (sum, p) => sum + p.amount,
      0
    );

    const rowData = {
      id: index + 1,
      clientNameFr: booking.clientNameFr,
      clientNameAr: booking.clientNameAr,
      passportNumber: booking.passportNumber,
      phoneNumber: booking.phoneNumber,
      variationName: booking.variationName,
      packageId: booking.packageId,
      sellingPrice: Number(booking.sellingPrice),
      paid: totalPaid,
      remaining: Number(booking.remainingBalance),
    };

    // Populate dynamic hotel/room columns
    if (hasCities) {
      (program.variations[0].cities || []).forEach((city) => {
        const cityIndex = (booking.selectedHotel.cities || []).indexOf(
          city.name
        );
        const hotelKey = `hotel_${sanitizeName(city.name)}`;
        const roomTypeKey = `roomType_${sanitizeName(city.name)}`;

        if (cityIndex !== -1) {
          rowData[hotelKey] = (booking.selectedHotel.hotelNames || [])[
            cityIndex
          ];
          rowData[roomTypeKey] = (booking.selectedHotel.roomTypes || [])[
            cityIndex
          ];
        } else {
          rowData[hotelKey] = "";
          rowData[roomTypeKey] = "";
        }
      });
    } else {
      rowData.hotels = (booking.selectedHotel.hotelNames || []).join(", ");
      rowData.roomType = (booking.selectedHotel.roomTypes || []).join(", ");
    }

    if (userRole === "admin") {
      rowData.basePrice = Number(booking.basePrice);
      rowData.profit = Number(booking.profit);
    }

    const row = worksheet.addRow(rowData);

    row.font = { size: 20 };
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
  });

  // Perform merges based on family groups
  let i = 0;
  while (i < orderedBookings.length) {
    const leaderBooking = orderedBookings[i];
    const familySize = leaderBooking.relatedPersons?.length || 0;
    const isFamily = familySize > 0;

    if (isFamily) {
      const startRow = i + 2; // +2 for 1-based index and header row
      const endRow = startRow + familySize;
      const phoneColumn = worksheet.getColumn("phoneNumber");
      const phoneColumnLetter = phoneColumn.letter;

      // Use the leader's phone number for the entire family.
      const leaderPhoneNumber = leaderBooking.phoneNumber || "";

      // Set the phone number for all members to be the leader's.
      // This includes the leader's row itself and all member rows.
      for (let j = startRow; j <= endRow; j++) {
        const cell = worksheet.getCell(`${phoneColumnLetter}${j}`);
        cell.value = leaderPhoneNumber;
      }

      // Merge the cells for a cleaner look
      worksheet.mergeCells(
        `${phoneColumnLetter}${startRow}:${phoneColumnLetter}${endRow}`
      );
      const cellToAlign = worksheet.getCell(`${phoneColumnLetter}${startRow}`);
      cellToAlign.alignment = { vertical: "middle", horizontal: "center" };

      i += familySize + 1; // Skip past the processed family members
    } else {
      i++; // Not a family leader, move to the next person
    }
  }

  // Add totals row
  worksheet.addRow([]);
  const lastDataRowNumber = orderedBookings.length + 1;
  const totalsRow = worksheet.addRow({});
  const totalRowNumber = totalsRow.number;

  const totalColumnsKeys = ["sellingPrice", "paid", "remaining"];
  if (userRole === "admin") {
    totalColumnsKeys.push("basePrice", "profit");
  }

  const firstTotalCol = worksheet.columns.find((c) =>
    totalColumnsKeys.includes(c.key)
  );
  if (firstTotalCol) {
    const firstTotalColLetter = firstTotalCol.letter;
    worksheet.mergeCells(
      `A${totalRowNumber}:${String.fromCharCode(
        firstTotalColLetter.charCodeAt(0) - 1
      )}${totalRowNumber}`
    );
    const totalLabelCell = worksheet.getCell(`A${totalRowNumber}`);
    totalLabelCell.value = "Total";
    totalLabelCell.font = { bold: true, size: 20 };
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
      cell.font = { bold: true, size: 20 };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD3D3D3" },
      };
    }
  });

  totalsRow.height = 30;

  // Iterate over all columns to set the width to the length of the longest cell value.
  // The font size of the header row (20) needs to be considered,
  // as it may be larger than the content rows (which are 12 by default in exceljs).
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      // Get the value and its font size
      const cellValue = cell.value ? String(cell.value) : "";
      const fontSize =
        cell.font && cell.font.size ? Number(cell.font.size) : 12; // Default to 12 if not set

      // Calculate an approximate "weighted" length based on font size
      const weightedLength = cellValue.length * (fontSize / 12);

      if (weightedLength > maxLength) {
        maxLength = weightedLength;
      }
    });

    // Set the column width to the calculated max length plus a small amount of padding.
    // Set a minimum width for columns with little content.
    const MIN_WIDTH = 15;
    column.width = Math.max(MIN_WIDTH, maxLength + 5);
  });

  return workbook;
};
