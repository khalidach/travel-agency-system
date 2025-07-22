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
 * Generates an Excel template for a single program.
 * @param {object} program - The program object.
 * @returns {Promise<object>} A promise that resolves to an exceljs Workbook object.
 */
exports.generateBookingTemplateForProgramExcel = async (program) => {
  const workbook = new excel.Workbook();
  const templateSheet = workbook.addWorksheet("Booking Template");
  const hasPackages = program.packages && program.packages.length > 0;
  const hasVariations = program.variations && program.variations.length > 0;

  // --- MODIFICATION: Add new headers for gender and dates ---
  let headers = [
    { header: "Client Name (French)", key: "clientNameFr", width: 25 },
    { header: "Client Name (Arabic)", key: "clientNameAr", width: 25 },
    { header: "Person Type", key: "personType", width: 15 },
    { header: "Gender", key: "gender", width: 15 }, // New
    { header: "Passport Number", key: "passportNumber", width: 20 },
    {
      header: "Date of Birth (YYYY-MM-DD or YYYY)",
      key: "dateOfBirth",
      width: 25,
    }, // New
    {
      header: "Passport Expiration Date (YYYY-MM-DD)",
      key: "passportExpirationDate",
      width: 25,
    }, // New
    { header: "Phone Number", key: "phoneNumber", width: 20 },
  ];

  if (hasVariations) {
    headers.push({ header: "Variation", key: "variation", width: 20 });
  }

  if (hasPackages) {
    headers.push({ header: "Package", key: "package", width: 20 });

    const hotelHeaders = (program.variations[0]?.cities || []).map((city) => ({
      header: `${city.name} Hotel`,
      key: `hotel_${sanitizeName(city.name)}`,
      width: 25,
    }));
    const roomTypeHeaders = (program.variations[0]?.cities || []).map(
      (city) => ({
        header: `${city.name} Room Type`,
        key: `roomType_${sanitizeName(city.name)}`,
        width: 20,
      })
    );

    headers.push(...hotelHeaders, ...roomTypeHeaders);
  }

  headers.push({ header: "Selling Price", key: "sellingPrice", width: 15 });

  templateSheet.columns = headers;

  const headerRow = templateSheet.getRow(1);
  headerRow.font = { bold: true };

  // Setup for dropdown lists
  const validationSheet = workbook.addWorksheet("Lists");
  validationSheet.state = "hidden";

  // Person Type Dropdown
  const personTypes = ["adult", "child", "infant"];
  validationSheet.getColumn("A").values = ["PersonTypes", ...personTypes];
  workbook.definedNames.add(
    "Lists!$A$2:$A$" + (personTypes.length + 1),
    "PersonTypes"
  );

  // --- MODIFICATION: Add Gender Dropdown ---
  const genders = ["male", "female"];
  validationSheet.getColumn("B").values = ["Genders", ...genders];
  workbook.definedNames.add("Lists!$B$2:$B$" + (genders.length + 1), "Genders");

  // Apply validation to the Person Type column
  const personTypeCol = templateSheet.getColumn("personType").letter;
  for (let i = 2; i <= 101; i++) {
    templateSheet.getCell(`${personTypeCol}${i}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ["=PersonTypes"],
    };
  }

  // --- MODIFICATION: Apply validation to the Gender column ---
  const genderCol = templateSheet.getColumn("gender").letter;
  for (let i = 2; i <= 101; i++) {
    templateSheet.getCell(`${genderCol}${i}`).dataValidation = {
      type: "list",
      allowBlank: false, // Gender is required
      formulae: ["=Genders"],
      showErrorMessage: true,
      error: 'Please select a valid gender ("male" or "female").',
    };
  }

  // Variation Dropdown
  if (hasVariations) {
    const variationNames = (program.variations || []).map((v) => v.name);
    validationSheet.getColumn("D").values = ["Variations", ...variationNames];
    if (variationNames.length > 0) {
      workbook.definedNames.add(
        "Lists!$D$2:$D$" + (variationNames.length + 1),
        "Variations"
      );
    }

    const variationCol = templateSheet.getColumn("variation").letter;
    for (let i = 2; i <= 101; i++) {
      templateSheet.getCell(`${variationCol}${i}`).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: ["=Variations"],
      };
    }
  }

  if (hasPackages) {
    // Package Dropdown
    const packageNames = (program.packages || []).map((p) => p.name);
    validationSheet.getColumn("C").values = ["Packages", ...packageNames];
    if (packageNames.length > 0) {
      workbook.definedNames.add(
        "Lists!$C$2:$C$" + (packageNames.length + 1),
        "Packages"
      );
    }

    const packageCol = templateSheet.getColumn("package").letter;
    for (let i = 2; i <= 101; i++) {
      templateSheet.getCell(`${packageCol}${i}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ["=Packages"],
      };
    }

    let listColumnIndex = 4; // Start from column E
    const hotelRoomTypesMap = new Map();

    (program.packages || []).forEach((pkg) => {
      const packageNameSanitized = sanitizeName(pkg.name);
      (program.variations[0]?.cities || []).forEach((city) => {
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
            console.warn(
              `Could not create named range for Hotel: ${rangeName}.`
            );
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

    const hotelHeaders = (program.variations[0]?.cities || []).map((city) => ({
      header: `${city.name} Hotel`,
      key: `hotel_${sanitizeName(city.name)}`,
    }));
    const roomTypeHeaders = (program.variations[0]?.cities || []).map(
      (city) => ({
        header: `${city.name} Room Type`,
        key: `roomType_${sanitizeName(city.name)}`,
      })
    );

    for (let i = 2; i <= 101; i++) {
      hotelHeaders.forEach((h) => {
        const cityNameSanitized = sanitizeName(h.header.replace(" Hotel", ""));
        const columnLetter = templateSheet.getColumn(h.key).letter;
        if (columnLetter) {
          const hotelFormula = `=INDIRECT(SUBSTITUTE(${packageCol}${i}," ","_")&"_${cityNameSanitized}_Hotels")`;
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
          templateSheet.getCell(`${roomTypeColumnLetter}${i}`).dataValidation =
            {
              type: "list",
              allowBlank: true,
              formulae: [roomFormula],
            };
        }
      });
    }
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
    const programPricing = allPricings[0];

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

      const gender = rowData["Gender"]?.toString().toLowerCase();
      const dateOfBirthValue = rowData["Date of Birth (YYYY-MM-DD or YYYY)"];
      const passportExpirationDateValue =
        rowData["Passport Expiration Date (YYYY-MM-DD)"];

      if (!gender || (gender !== "male" && gender !== "female")) {
        continue;
      }

      let dateOfBirth = null;
      if (dateOfBirthValue) {
        if (dateOfBirthValue instanceof Date) {
          dateOfBirth = dateOfBirthValue.toISOString().split("T")[0];
        } else if (
          typeof dateOfBirthValue === "string" &&
          /^\d{4}$/.test(dateOfBirthValue.trim())
        ) {
          dateOfBirth = `XX/XX/${dateOfBirthValue.trim()}`;
        } else if (typeof dateOfBirthValue === "string") {
          const parsedDate = new Date(dateOfBirthValue);
          if (!isNaN(parsedDate.getTime())) {
            dateOfBirth = parsedDate.toISOString().split("T")[0];
          }
        }
      }

      let passportExpirationDate = null;
      if (passportExpirationDateValue) {
        const parsedDate = new Date(passportExpirationDateValue);
        if (!isNaN(parsedDate.getTime())) {
          passportExpirationDate = parsedDate.toISOString().split("T")[0];
        }
      }

      const variationName = rowData["Variation"];
      const bookingPackage = (program.packages || []).find(
        (p) => p.name === rowData["Package"]
      );
      if (!bookingPackage && program.packages && program.packages.length > 0)
        continue;

      const selectedHotel = { cities: [], hotelNames: [], roomTypes: [] };
      (program.variations[0]?.cities || []).forEach((city) => {
        const hotelName = rowData[`${city.name} Hotel`];
        if (hotelName) {
          // Only require hotelName to be present
          const roomType = rowData[`${city.name} Room Type`];
          selectedHotel.cities.push(city.name);
          selectedHotel.hotelNames.push(hotelName);
          selectedHotel.roomTypes.push(roomType || null); // Add roomType or null if it's missing
        }
      });

      const hotelCombination = selectedHotel.hotelNames.join("_");
      const priceStructure =
        (bookingPackage?.prices || []).find(
          (p) => p.hotelCombination === hotelCombination
        ) || null;

      if (program.packages && program.packages.length > 0 && !priceStructure)
        continue;

      let basePrice = 0;
      const sellingPrice = Number(rowData["Selling Price"]) || 0;
      const personType = rowData["Person Type"] || "adult";

      if (programPricing && priceStructure) {
        const guestMap = new Map(
          priceStructure.roomTypes.map((rt) => [rt.type, rt.guests])
        );

        const hotelCosts = selectedHotel.cities.reduce((total, city, index) => {
          const hotelName = selectedHotel.hotelNames[index];
          const roomTypeName = selectedHotel.roomTypes[index];
          const hotelInfo = (programPricing.allHotels || []).find(
            (h) => h.name === hotelName && h.city === city
          );
          const cityInfo = program.variations[0]?.cities.find(
            (c) => c.name === city
          );

          if (
            hotelInfo &&
            cityInfo &&
            hotelInfo.PricePerNights &&
            roomTypeName
          ) {
            const pricePerNight = Number(
              hotelInfo.PricePerNights[roomTypeName] || 0
            );
            const nights = Number(cityInfo.nights || 0);
            const guests = Number(guestMap.get(roomTypeName) || 1);

            if (guests > 0) {
              return total + (pricePerNight * nights) / guests;
            }
          }
          return total;
        }, 0);

        let ticketPriceForVariation = Number(programPricing.ticketAirline || 0);
        if (
          programPricing.ticketPricesByVariation &&
          variationName &&
          programPricing.ticketPricesByVariation[variationName]
        ) {
          ticketPriceForVariation = Number(
            programPricing.ticketPricesByVariation[variationName]
          );
        }

        const personTypeInfo = (programPricing.personTypes || []).find(
          (p) => p.type === personType
        );
        const ticketPercentage = personTypeInfo
          ? personTypeInfo.ticketPercentage / 100
          : 1;
        const ticketPrice = ticketPriceForVariation * ticketPercentage;

        basePrice = Math.round(
          ticketPrice +
            Number(programPricing.visaFees || 0) +
            Number(programPricing.guideFees || 0) +
            Number(programPricing.transportFees || 0) +
            hotelCosts
        );
      }

      bookingsToCreate.push({
        userId: userId,
        employeeId: user.role === "admin" ? null : user.id,
        clientNameAr: rowData["Client Name (Arabic)"],
        clientNameFr: rowData["Client Name (French)"],
        personType: personType,
        phoneNumber: rowData["Phone Number"] || "",
        passportNumber,
        gender,
        dateOfBirth,
        passportExpirationDate,
        tripId: program.id,
        variationName,
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
        'INSERT INTO bookings ("userId", "employeeId", "clientNameAr", "clientNameFr", "personType", "phoneNumber", "passportNumber", "gender", "dateOfBirth", "passportExpirationDate", "tripId", "variationName", "packageId", "selectedHotel", "sellingPrice", "basePrice", profit, "advancePayments", "remainingBalance", "isFullyPaid") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)',
        [
          booking.userId,
          booking.employeeId,
          booking.clientNameAr,
          booking.clientNameFr,
          booking.personType,
          booking.phoneNumber,
          booking.passportNumber,
          booking.gender,
          booking.dateOfBirth,
          booking.passportExpirationDate,
          booking.tripId,
          booking.variationName,
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
