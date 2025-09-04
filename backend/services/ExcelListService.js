// backend/services/ExcelListService.js
const excel = require("exceljs");

/**
 * Generates an Excel workbook for a flight list based on booking data.
 * @param {Array<object>} bookings - The list of bookings.
 * @param {object} program - The program associated with the bookings, including agencyName.
 * @returns {Promise<object>} A promise that resolves to an exceljs Workbook object.
 */
exports.generateFlightListExcel = async (bookings, program) => {
  const workbook = new excel.Workbook();
  const worksheet = workbook.addWorksheet("Flight List", {
    views: [{ state: "frozen", ySplit: 7 }], // Freezes the top 7 rows
  });

  // Add static headers from the image to the top of the sheet
  worksheet.getCell("A1").value = "Agence de Voyages";
  worksheet.getCell("B1").value = program.agencyName || "Discovery";
  worksheet.getCell("A2").value = "Date de depart";
  worksheet.getCell("A3").value = "Date de Retour";
  worksheet.getCell("A4").value = "Nombre de passager";
  worksheet.getCell("B4").value = bookings.length;

  // Merge cells for the top static headers as requested
  worksheet.mergeCells("B1:D1");
  worksheet.mergeCells("B2:D2");
  worksheet.mergeCells("B3:D3");
  worksheet.mergeCells("B4:D4");

  // Add borders to the top header section
  ["A1", "B1", "A2", "B2", "A3", "B3", "A4", "B4"].forEach((cellRef) => {
    worksheet.getCell(cellRef).border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Define and style the main data table headers on Row 7
  const headers = [
    "Rec",
    "Title",
    "FirstName",
    "LastName",
    "Nationality",
    "PassengerType",
    "DocumentType",
    "Gender",
    "DOB",
    "DocumentNumber",
    "DocumentExpiration",
    "DocumentIssueCountryCode",
    "DocumentBirthCountryCode",
  ];
  const headerRow = worksheet.getRow(7);
  headerRow.values = headers;

  headerRow.font = { bold: true, color: { argb: "FF000000" } };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD3D3D3" }, // Light Gray
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
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

  // Helper function to map personType to PassengerType
  const getPassengerType = (type) => {
    if (!type) return "ADT"; // Default to Adult if not specified
    switch (type.toLowerCase()) {
      case "adult":
        return "ADT";
      case "child":
        return "CHD";
      case "infant":
        return "INF";
      default:
        return type.toUpperCase().substring(0, 3);
    }
  };

  // Add booking data rows starting from row 8
  orderedBookings.forEach((booking, index) => {
    const { firstName, lastName } = booking.clientNameFr || {
      firstName: "",
      lastName: "",
    };

    let title = "";
    let genderChar = "";
    if (booking.gender && booking.gender.toLowerCase() === "male") {
      title = "MR";
      genderChar = "M";
    } else if (booking.gender && booking.gender.toLowerCase() === "female") {
      title = "MS";
      genderChar = "F";
    }

    // Format Date of Birth
    let formattedDob = "";
    const dob = booking.dateOfBirth || "";
    if (dob) {
      // Case 1: Full date is available (e.g., "1995-01-14")
      if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
        // Create a date object interpreting the string as UTC to avoid timezone shifts
        const parts = dob.split("-").map((part) => parseInt(part, 10));
        const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));

        if (!isNaN(date.getTime())) {
          const day = date.getUTCDate().toString().padStart(2, "0");
          const month = date
            .toLocaleString("en-GB", { month: "short", timeZone: "UTC" })
            .toUpperCase();
          const year = date.getUTCFullYear().toString().slice(-2);
          formattedDob = `${day}${month}${year}`;
        }
      }
      // Case 2: Only year is available (e.g., "XX/XX/1995" or "1995")
      else if (/^(?:XX\/XX\/)?(\d{4})$/.test(dob)) {
        const yearMatch = dob.match(/(\d{4})$/);
        if (yearMatch) {
          const year = yearMatch[1].slice(-2);
          formattedDob = `01JAN${year}`;
        }
      }
    }

    // Format Passport Expiration Date
    let expirationDate = booking.passportExpirationDate || "";
    if (expirationDate) {
      const d = new Date(expirationDate);
      if (!isNaN(d.getTime())) {
        // FIX: Use methods that respect the "local" time of the Date object from the DB,
        // avoiding the automatic shift to UTC that toISOString() or similar methods cause.
        const year = d.getFullYear();
        const month = d.getMonth(); // 0-indexed, so January is 0
        const day = d.getDate();

        // Re-create a new date object explicitly in UTC from the extracted components.
        // This makes formatting consistent regardless of server timezone.
        const utcDate = new Date(Date.UTC(year, month, day));

        const formattedDay = utcDate.getUTCDate().toString().padStart(2, "0");
        const formattedMonth = utcDate
          .toLocaleString("en-GB", { month: "short", timeZone: "UTC" })
          .toUpperCase();
        const formattedYear = utcDate.getUTCFullYear().toString().slice(-2);
        expirationDate = `${formattedDay}-${formattedMonth}-${formattedYear}`;
      }
    }

    const rowData = [
      index + 1,
      title,
      firstName,
      lastName,
      "MA", // Fixed value
      getPassengerType(booking.personType),
      "P", // Fixed value
      genderChar,
      formattedDob,
      booking.passportNumber,
      expirationDate,
      "MA", // Fixed value
      "MA", // Fixed value
    ];
    const row = worksheet.addRow(rowData);

    // Add borders and conditional coloring to the data row
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      // Column numbers are 1-based. E=5, G=7, L=12, M=13
      const redColorColumns = [5, 7, 12, 13];
      if (redColorColumns.includes(colNumber)) {
        cell.font = { color: { argb: "FFFF0000" } }; // Red color
      }
    });
  });

  // Auto-fit columns based on content with added padding
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      let cellLength = cell.value ? cell.value.toString().length : 10;
      if (cellLength > maxLength) {
        maxLength = cellLength;
      }
    });
    column.width = maxLength < 10 ? 10 : maxLength + 6; // Increased padding to 6
  });

  return workbook;
};
