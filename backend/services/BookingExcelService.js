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
  // Sort bookings by variation name first, handling potential null/undefined values.
  bookings.sort((a, b) =>
    (a.variationName || "").localeCompare(b.variationName || "")
  );

  const workbook = new excel.Workbook();
  const worksheet = workbook.addWorksheet("Bookings", {
    views: [{ rightToLeft: false }],
  }); // Add an empty row that will become the title row

  worksheet.addRow([]); // An empty row for spacing
  worksheet.addRow([]); // Base columns

  let allColumns = [
    { header: "ID", key: "id" },
    { header: "Nom/Prénom", key: "clientNameFr" },
    { header: "الاسم/النسب", key: "clientNameAr" },
    { header: "Passport Number", key: "passportNumber" },
    { header: "Phone Number", key: "phoneNumber" },
    { header: "Variation", key: "variationName" },
    { header: "الباقة", key: "packageId" },
  ]; // Dynamically add hotel and room type columns based on program cities

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
  } // Add pricing columns at the end

  allColumns.push(
    { header: "Prix Vente", key: "sellingPrice" },
    { header: "Payé", key: "paid" },
    { header: "Reste", key: "remaining" }
  );

  worksheet.columns = allColumns; // Merge cells for the program name header now that we have columns

  if (worksheet.columns.length > 0) {
    worksheet.mergeCells(1, 1, 1, worksheet.columns.length);
    const programHeaderCell = worksheet.getCell(1, 1);
    programHeaderCell.value = program.name;
    programHeaderCell.font = { bold: true, size: 25 };
    programHeaderCell.alignment = { vertical: "middle", horizontal: "center" };
    worksheet.getRow(1).height = 30;
  }

  const headerRow = worksheet.getRow(3);
  headerRow.values = worksheet.columns.map((c) => c.header);
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
  }); // Correctly re-order bookings to group families together.

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
  } // Add any remaining bookings that might be members but their leader wasn't in the initial list for some reason

  for (const booking of bookings) {
    if (!processedIds.has(booking.id)) {
      orderedBookings.push(booking);
    }
  } // Create a new array with final phone numbers resolved for family members

  const finalBookings = orderedBookings.map((b) => ({ ...b }));
  for (const booking of finalBookings) {
    if (booking.relatedPersons && booking.relatedPersons.length > 0) {
      const leaderPhoneNumber = booking.phoneNumber || "";
      booking.relatedPersons.forEach((related) => {
        const memberBooking = finalBookings.find((b) => b.id === related.ID);
        if (memberBooking && !memberBooking.phoneNumber) {
          memberBooking.phoneNumber = leaderPhoneNumber;
        }
      });
    }
  } // Add rows from the final bookings list

  finalBookings.forEach((booking, index) => {
    const totalPaid = (booking.advancePayments || []).reduce(
      (sum, p) => sum + p.amount,
      0
    );

    const clientNameFr =
      `${booking.clientNameFr.lastName} / ${booking.clientNameFr.firstName} `.trim();

    const rowData = {
      id: index + 1,
      clientNameFr,
      clientNameAr: booking.clientNameAr,
      passportNumber: booking.passportNumber,
      phoneNumber: booking.phoneNumber,
      variationName: booking.variationName,
      packageId: booking.packageId,
      sellingPrice: Number(booking.sellingPrice),
      paid: totalPaid,
      remaining: Number(booking.remainingBalance),
    }; // Populate dynamic hotel/room columns

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

    const row = worksheet.addRow(rowData);

    row.font = { size: 20 };
    row.height = 25;

    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thick", color: { argb: "FF000000" } },
        left: { style: "thick", color: { argb: "FF000000" } },
        bottom: { style: "thick", color: { argb: "FF000000" } },
        right: { style: "thick", color: { argb: "FF000000" } },
      };
      const columnKey = worksheet.getColumn(cell.col).key;
      const priceColumns = ["sellingPrice", "paid", "remaining"];

      if (priceColumns.includes(columnKey)) {
        cell.numFmt = '#,##0.00 "MAD"';
      }
    });
  }); // Merge phone number cells for family groups

  const phoneColumn = worksheet.columns.find((c) => c.key === "phoneNumber");
  if (phoneColumn) {
    const phoneColumnLetter = phoneColumn.letter;
    let i = 0;
    while (i < finalBookings.length) {
      const leader = finalBookings[i]; // A family group is identified by the leader having related persons.
      const isFamilyLeader =
        leader.relatedPersons && leader.relatedPersons.length > 0;

      if (isFamilyLeader) {
        const familySize = 1 + leader.relatedPersons.length;

        let subGroupStartIndex = i; // Index in finalBookings for the start of a mergeable subgroup // Iterate through the family members

        for (let j = 1; j < familySize; j++) {
          const currentIndex = i + j;
          const prevIndex = currentIndex - 1; // Check if we are at the end of the family or if the phone number changes

          if (
            currentIndex >= i + familySize || // Should not happen with j < familySize, but for safety
            finalBookings[currentIndex].phoneNumber !==
            finalBookings[prevIndex].phoneNumber
          ) {
            // A subgroup has ended. Check if it's worth merging.
            const mergeCount = currentIndex - subGroupStartIndex;
            if (mergeCount > 1) {
              const startRow = subGroupStartIndex + 4;
              const endRow = startRow + mergeCount - 1;
              worksheet.mergeCells(
                `${phoneColumnLetter}${startRow}:${phoneColumnLetter}${endRow}`
              );
              const cellToAlign = worksheet.getCell(
                `${phoneColumnLetter}${startRow}`
              );
              cellToAlign.alignment = {
                vertical: "middle",
                horizontal: "center",
              };
            } // Start a new subgroup
            subGroupStartIndex = currentIndex;
          }
        } // After the loop, check the last subgroup of the family

        const lastMergeCount = i + familySize - subGroupStartIndex;
        if (lastMergeCount > 1) {
          const startRow = subGroupStartIndex + 4;
          const endRow = startRow + lastMergeCount - 1;
          worksheet.mergeCells(
            `${phoneColumnLetter}${startRow}:${phoneColumnLetter}${endRow}`
          );
          const cellToAlign = worksheet.getCell(
            `${phoneColumnLetter}${startRow}`
          );
          cellToAlign.alignment = {
            vertical: "middle",
            horizontal: "center",
          };
        }

        i += familySize; // Move index past the entire family group
      } else {
        // Not a family leader, just move to the next person
        i++;
      }
    }
  } // Add totals row

  worksheet.addRow([]);
  const lastDataRowNumber = orderedBookings.length + 3; // Adjusted for new rows
  const totalsRow = worksheet.addRow({});
  const totalRowNumber = totalsRow.number;

  const totalColumnsKeys = ["sellingPrice", "paid", "remaining"];

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
    // Apply thick border to the merged label cell
    totalLabelCell.border = {
      top: { style: "thick", color: { argb: "FF000000" } },
      left: { style: "thick", color: { argb: "FF000000" } },
      bottom: { style: "thick", color: { argb: "FF000000" } },
      right: { style: "thick", color: { argb: "FF000000" } },
    };
  }

  totalColumnsKeys.forEach((key) => {
    const col = worksheet.getColumn(key);
    if (col) {
      const colLetter = col.letter;
      const cell = worksheet.getCell(`${colLetter}${totalRowNumber}`);
      cell.value = {
        formula: `SUM(${colLetter}4:${colLetter}${lastDataRowNumber})`, // Start from row 4
      };
      cell.numFmt = '#,##0.00 "MAD"';
      cell.font = { bold: true, size: 20 };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD3D3D3" },
      };
      // Apply thick border to the sum cells
      cell.border = {
        top: { style: "thick", color: { argb: "FF000000" } },
        left: { style: "thick", color: { argb: "FF000000" } },
        bottom: { style: "thick", color: { argb: "FF000000" } },
        right: { style: "thick", color: { argb: "FF000000" } },
      };
    }
  });

  totalsRow.height = 30;

  // Auto-fit column widths to match the widest cell content in each column.
  // This mimics Excel's "double-click column border to auto-fit" behavior.
  const mergedCellRanges = worksheet.model.merges || [];

  /**
   * Checks if a cell (by row,col) is part of a merged range but is NOT the
   * top-left origin of that merge. We skip those cells so a value spanning
   * many columns doesn't inflate a single column's width.
   */
  const isMergedNonOrigin = (row, col) => {
    for (const range of mergedCellRanges) {
      // range format: "A1:D1"
      const decoded = excel.Range ? null : null; // not used directly
      const parts = range.split(":");
      if (parts.length !== 2) continue;
      const tl = worksheet.getCell(parts[0]);
      const br = worksheet.getCell(parts[1]);
      const top = tl.row, left = tl.col;
      const bottom = br.row, right = br.col;
      if (row >= top && row <= bottom && col >= left && col <= right) {
        // It's inside a merged range – skip unless it's the origin cell
        if (row !== top || col !== left) return true;
        // It IS the origin but spans multiple columns – also skip to
        // avoid one column getting the full merged-text width.
        if (right > left) return true;
      }
    }
    return false;
  };

  /**
   * Checks if a character code falls in an Arabic Unicode range.
   */
  const isArabicChar = (code) =>
    (code >= 0x0600 && code <= 0x06ff) || // Arabic
    (code >= 0x0750 && code <= 0x077f) || // Arabic Supplement
    (code >= 0x08a0 && code <= 0x08ff) || // Arabic Extended-A
    (code >= 0xfb50 && code <= 0xfdff) || // Arabic Presentation Forms-A
    (code >= 0xfe70 && code <= 0xfeff);   // Arabic Presentation Forms-B

  /**
   * Estimates the rendered width of a cell value in ExcelJS column-width
   * units (≈ width of character "0" in Calibri 11pt).
   */
  const estimateCellWidth = (cell) => {
    if (!cell || cell.value === null || cell.value === undefined) return 0;

    let displayText = "";
    const val = cell.value;

    if (typeof val === "object" && val !== null) {
      if (val.formula) {
        // SUM formulas produce currency values – use a representative string
        displayText = "000,000,000.00 MAD";
      } else if (val.richText) {
        displayText = val.richText.map((rt) => rt.text).join("");
      } else if (val.text) {
        displayText = val.text;
      } else {
        displayText = String(val);
      }
    } else {
      displayText = String(val);
    }

    // For currency-formatted numbers, format the number as it will appear
    if (cell.numFmt && cell.numFmt.includes("MAD") && typeof val === "number") {
      const formatted = val.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      displayText = formatted + " MAD";
    }

    // Calculate character-weighted width.
    // Arabic characters with contextual shaping, ligatures, and diacritics
    // render significantly wider than Latin characters (~2.2x).
    let charWidth = 0;
    for (const ch of displayText) {
      const code = ch.codePointAt(0);
      if (isArabicChar(code)) {
        charWidth += 1; // Reduced from 2.2 as they don't actually take up twice the space
      } else if (
        (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified
        (code >= 0x3000 && code <= 0x303f)    // CJK Symbols
      ) {
        charWidth += 1.0;
      } else {
        charWidth += 1.0;
      }
    }

    // Scale by font size. ExcelJS column.width is calibrated against Calibri 11pt,
    // so a font of size 20 needs (20/11) ≈ 1.82x the width per character.
    const fontSize = cell.font && cell.font.size ? Number(cell.font.size) : 11;
    charWidth *= fontSize / 11;

    // Bold text is ~15% wider
    if (cell.font && cell.font.bold) {
      charWidth *= 1.15;
    }

    return charWidth;
  };

  worksheet.columns.forEach((column) => {
    let maxWidth = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      // Skip cells that are part of a multi-column merge
      if (isMergedNonOrigin(cell.row, cell.col)) return;

      const w = estimateCellWidth(cell);
      if (w > maxWidth) {
        maxWidth = w;
      }
    });
    // const MIN_WIDTH = 6;
    // const PADDING = 1; // breathing room so text doesn't touch cell borders
    column.width = Math.max(Math.ceil(maxWidth));
  });

  return workbook;
};
