// backend/services/BookingService.js

const calculateBasePrice = async (
  db,
  userId,
  tripId,
  packageId,
  selectedHotel,
  personType,
  variationName
) => {
  const { rows: programs } = await db.query(
    'SELECT * FROM programs WHERE id = $1 AND "userId" = $2',
    [tripId, userId]
  );
  if (programs.length === 0)
    throw new Error("Program not found for base price calculation.");
  const program = programs[0];

  // --- Start of fix ---
  // Find the correct variation from the program's variations array based on the name.
  let variation = (program.variations || []).find(
    (v) => v.name === variationName
  );

  if (!variation) {
    // Fallback to the first variation if the provided name is not found.
    // This maintains backward compatibility for older data that might not have a variationName.
    if (program.variations && program.variations.length > 0) {
      variation = program.variations[0];
    } else {
      // If no variations exist at all, throw an error.
      throw new Error(`Variation "${variationName}" not found in program.`);
    }
  }
  // --- End of fix ---

  const { rows: pricings } = await db.query(
    'SELECT * FROM program_pricing WHERE "programId" = $1 AND "userId" = $2',
    [tripId, userId]
  );
  // If no pricing is set up at all, the base price is 0.
  if (pricings.length === 0) return 0;
  const pricing = pricings[0];

  // --- Determine ticket price ---
  let ticketPriceForVariation = Number(pricing.ticketAirline || 0); // Default
  if (
    pricing.ticketPricesByVariation &&
    pricing.ticketPricesByVariation[variationName]
  ) {
    ticketPriceForVariation = Number(
      pricing.ticketPricesByVariation[variationName]
    );
  }

  // --- Calculate non-hotel costs first ---
  const personTypeInfo = (pricing.personTypes || []).find(
    (p) => p.type === personType
  );
  const ticketPercentage = personTypeInfo
    ? personTypeInfo.ticketPercentage / 100
    : 1;

  const ticketPrice = ticketPriceForVariation * ticketPercentage;
  const visaPrice = Number(pricing.visaFees || 0);
  const guidePrice = Number(pricing.guideFees || 0);
  const transportPrice = Number(pricing.transportFees || 0);

  const nonHotelCosts = ticketPrice + visaPrice + guidePrice + transportPrice;

  // --- Conditionally calculate hotel costs ---
  let hotelCosts = 0;
  const bookingPackage = (program.packages || []).find(
    (p) => p.name === packageId
  );

  // Only proceed with hotel cost calculation if a package and hotels are selected
  if (
    bookingPackage &&
    selectedHotel &&
    selectedHotel.hotelNames &&
    selectedHotel.hotelNames.some((h) => h)
  ) {
    const hotelCombination = (selectedHotel.hotelNames || []).join("_");
    const priceStructure = (bookingPackage.prices || []).find(
      (p) => p.hotelCombination === hotelCombination
    );

    // And a corresponding price structure for the selected hotels exists
    if (priceStructure) {
      const guestMap = new Map(
        priceStructure.roomTypes.map((rt) => [rt.type, rt.guests])
      );

      hotelCosts = (selectedHotel.cities || []).reduce((total, city, index) => {
        const hotelName = selectedHotel.hotelNames[index];
        const roomTypeName = selectedHotel.roomTypes[index];
        const hotelPricingInfo = (pricing.allHotels || []).find(
          (h) => h.name === hotelName && h.city === city
        );
        // --- Fix applied here: Use the correct variation's cities array to get the number of nights ---
        const cityInfo = (variation.cities || []).find((c) => c.name === city);

        if (hotelPricingInfo && cityInfo && roomTypeName) {
          const pricePerNight = Number(
            hotelPricingInfo.PricePerNights?.[roomTypeName] || 0
          );
          const nights = Number(cityInfo.nights || 0);
          const guests = Number(guestMap.get(roomTypeName) || 1);
          if (guests > 0) {
            return total + (pricePerNight * nights) / guests;
          }
        }
        return total;
      }, 0);
    }
  }

  return Math.round(nonHotelCosts + hotelCosts);
};

const createBooking = async (db, user, bookingData) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { role, id, adminId } = user;
    const {
      clientNameAr,
      clientNameFr,
      personType,
      phoneNumber,
      passportNumber,
      dateOfBirth,
      passportExpirationDate,
      gender,
      tripId,
      variationName,
      packageId,
      selectedHotel,
      sellingPrice,
      advancePayments,
      relatedPersons,
    } = bookingData;

    // Check if a booking with the same passport number already exists for this trip
    const existingBookingCheck = await client.query(
      'SELECT id FROM bookings WHERE "passportNumber" = $1 AND "tripId" = $2 AND "userId" = $3',
      [passportNumber, tripId, adminId]
    );

    if (existingBookingCheck.rows.length > 0) {
      throw new Error("This person is already booked for this program.");
    }

    const programRes = await client.query(
      'SELECT packages FROM programs WHERE id = $1 AND "userId" = $2',
      [tripId, adminId]
    );
    if (programRes.rows.length === 0) {
      throw new Error("Program not found.");
    }
    const program = programRes.rows[0];
    if (program.packages && program.packages.length > 0 && !packageId) {
      throw new Error("A package must be selected for this program.");
    }

    const basePrice = await calculateBasePrice(
      client, // Use client for transaction
      adminId,
      tripId,
      packageId,
      selectedHotel,
      personType,
      variationName
    );
    const profit = sellingPrice - basePrice;

    const totalPaid = (advancePayments || []).reduce(
      (sum, p) => sum + p.amount,
      0
    );
    const remainingBalance = sellingPrice - totalPaid;
    const isFullyPaid = remainingBalance <= 0;
    const employeeId = role === "admin" ? null : id;

    const { rows } = await client.query(
      'INSERT INTO bookings ("userId", "employeeId", "clientNameAr", "clientNameFr", "personType", "phoneNumber", "passportNumber", "dateOfBirth", "passportExpirationDate", "gender", "tripId", "variationName", "packageId", "selectedHotel", "sellingPrice", "basePrice", profit, "advancePayments", "remainingBalance", "isFullyPaid", "relatedPersons", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW()) RETURNING *',
      [
        adminId,
        employeeId,
        clientNameAr,
        clientNameFr,
        personType,
        phoneNumber,
        passportNumber,
        dateOfBirth || null,
        passportExpirationDate || null,
        gender,
        tripId,
        variationName,
        packageId,
        JSON.stringify(selectedHotel),
        sellingPrice,
        basePrice,
        profit,
        JSON.stringify(advancePayments || []),
        remainingBalance,
        isFullyPaid,
        JSON.stringify(relatedPersons || []),
      ]
    );

    await client.query(
      'UPDATE programs SET "totalBookings" = "totalBookings" + 1 WHERE id = $1',
      [tripId]
    );

    await client.query("COMMIT");
    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const updateBooking = async (db, user, bookingId, bookingData) => {
  // MODIFICATION: Add authorization check for manager
  if (user.role === "manager") {
    throw new Error("Managers are not authorized to update bookings.");
  }

  const {
    clientNameAr,
    clientNameFr,
    personType,
    phoneNumber,
    passportNumber,
    dateOfBirth,
    passportExpirationDate,
    gender,
    tripId,
    variationName,
    packageId,
    selectedHotel,
    sellingPrice,
    advancePayments,
    relatedPersons,
  } = bookingData;

  // First, verify ownership before updating
  const bookingResult = await db.query(
    'SELECT "employeeId" FROM bookings WHERE id = $1 AND "userId" = $2',
    [bookingId, user.adminId]
  );
  if (bookingResult.rows.length === 0) {
    throw new Error("Booking not found or not authorized");
  }

  const booking = bookingResult.rows[0];
  if (user.role === "employee" && booking.employeeId !== user.id) {
    throw new Error("You are not authorized to modify this booking.");
  }

  // Check if updating the passport number would create a duplicate for the same trip
  const existingBookingCheck = await db.query(
    'SELECT id FROM bookings WHERE "passportNumber" = $1 AND "tripId" = $2 AND "userId" = $3 AND id != $4',
    [passportNumber, tripId, user.adminId, bookingId]
  );

  if (existingBookingCheck.rows.length > 0) {
    throw new Error(
      "Another booking with this passport number already exists for this program."
    );
  }

  const programRes = await db.query(
    'SELECT packages FROM programs WHERE id = $1 AND "userId" = $2',
    [tripId, user.adminId]
  );
  if (programRes.rows.length === 0) {
    throw new Error("Program not found.");
  }
  const program = programRes.rows[0];
  if (program.packages && program.packages.length > 0 && !packageId) {
    throw new Error("A package must be selected for this program.");
  }

  // Proceed with update logic
  const basePrice = await calculateBasePrice(
    db,
    user.adminId,
    tripId,
    packageId,
    selectedHotel,
    personType,
    variationName
  );
  const profit = sellingPrice - basePrice;
  const totalPaid = (advancePayments || []).reduce(
    (sum, p) => sum + p.amount,
    0
  );
  const remainingBalance = sellingPrice - totalPaid;
  const isFullyPaid = remainingBalance <= 0;

  const { rows } = await db.query(
    'UPDATE bookings SET "clientNameAr" = $1, "clientNameFr" = $2, "personType" = $3, "phoneNumber" = $4, "passportNumber" = $5, "dateOfBirth" = $6, "passportExpirationDate" = $7, "gender" = $8, "tripId" = $9, "variationName" = $10, "packageId" = $11, "selectedHotel" = $12, "sellingPrice" = $13, "basePrice" = $14, profit = $15, "advancePayments" = $16, "remainingBalance" = $17, "isFullyPaid" = $18, "relatedPersons" = $19 WHERE id = $20 RETURNING *',
    [
      clientNameAr,
      clientNameFr,
      personType,
      phoneNumber,
      passportNumber,
      dateOfBirth || null,
      passportExpirationDate || null,
      gender,
      tripId,
      variationName,
      packageId,
      JSON.stringify(selectedHotel),
      sellingPrice,
      basePrice,
      profit,
      JSON.stringify(advancePayments || []),
      remainingBalance,
      isFullyPaid,
      JSON.stringify(relatedPersons || []),
      bookingId,
    ]
  );

  return rows[0];
};

const getAllBookings = async (db, id, page, limit, idColumn) => {
  const offset = (page - 1) * limit;
  // This query now fetches all bookings for the agency for both admin and manager
  const queryUserId = id;
  const queryIdColumn =
    idColumn === "employeeId" && id !== "admin" ? "employeeId" : "userId";

  const bookingsPromise = db.query(
    `SELECT b.*, e.username as "employeeName"
     FROM bookings b
     LEFT JOIN employees e ON b."employeeId" = e.id
     WHERE b."${idColumn}" = $1
     ORDER BY b."createdAt" DESC
     LIMIT $2 OFFSET $3`,
    [id, limit, offset]
  );
  const totalCountPromise = db.query(
    `SELECT COUNT(*) FROM bookings WHERE "${idColumn}" = $1`,
    [id]
  );
  const [bookingsResult, totalCountResult] = await Promise.all([
    bookingsPromise,
    totalCountPromise,
  ]);
  const totalCount = parseInt(totalCountResult.rows[0].count, 10);
  return { bookings: bookingsResult.rows, totalCount };
};

const deleteBooking = async (db, user, bookingId) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { role, id, adminId } = user;

    // MODIFICATION: Add authorization check for manager
    if (role === "manager") {
      throw new Error(
        "Managers are not authorized to delete individual bookings."
      );
    }

    const bookingRes = await client.query(
      'SELECT "tripId", "employeeId" FROM bookings WHERE id = $1 AND "userId" = $2',
      [bookingId, adminId]
    );

    if (bookingRes.rows.length === 0) {
      throw new Error("Booking not found or user not authorized");
    }
    const booking = bookingRes.rows[0];

    // Check ownership for delete
    if (role === "employee" && booking.employeeId !== id) {
      throw new Error("You are not authorized to delete this booking.");
    }

    const { tripId } = booking;
    const deleteRes = await client.query("DELETE FROM bookings WHERE id = $1", [
      bookingId,
    ]);

    if (deleteRes.rowCount === 0) {
      throw new Error("Booking not found or failed to delete.");
    }

    if (tripId) {
      await client.query(
        'UPDATE programs SET "totalBookings" = "totalBookings" - 1 WHERE id = $1 AND "totalBookings" > 0',
        [tripId]
      );
    }

    await client.query("COMMIT");
    return { message: "Booking deleted successfully" };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const deleteMultipleBookings = async (db, user, bookingIds, filters) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { adminId, role, id: userId } = user;

    let whereClause = "";
    const queryParams = [adminId];
    let paramIndex = 2;

    if (bookingIds && bookingIds.length > 0) {
      whereClause = `WHERE id = ANY($${paramIndex}::int[]) AND "userId" = $1`;
      queryParams.push(bookingIds);
      paramIndex++;
    } else if (filters) {
      let whereConditions = ['"userId" = $1', '"tripId" = $2'];
      queryParams.push(filters.programId);
      paramIndex++;

      if (filters.searchTerm) {
        whereConditions.push(
          `("clientNameFr" ILIKE $${paramIndex} OR "clientNameAr" ILIKE $${paramIndex} OR "passportNumber" ILIKE $${paramIndex})`
        );
        queryParams.push(`%${filters.searchTerm}%`);
        paramIndex++;
      }
      if (filters.statusFilter === "paid") {
        whereConditions.push('"isFullyPaid" = true');
      } else if (filters.statusFilter === "pending") {
        whereConditions.push('"isFullyPaid" = false');
      }

      if (role === "admin") {
        if (
          filters.employeeFilter !== "all" &&
          /^\d+$/.test(filters.employeeFilter)
        ) {
          whereConditions.push(`"employeeId" = $${paramIndex}`);
          queryParams.push(filters.employeeFilter);
          paramIndex++;
        }
      } else if (role === "employee" || role === "manager") {
        whereConditions.push(`"employeeId" = $${paramIndex}`);
        queryParams.push(userId);
        paramIndex++;
      }

      whereClause = `WHERE ${whereConditions.join(" AND ")}`;
    } else {
      throw new Error("No booking IDs or filters provided for deletion.");
    }

    const bookingsToDeleteRes = await client.query(
      `SELECT id, "tripId", "employeeId" FROM bookings ${whereClause}`,
      queryParams
    );

    const bookingsToDelete = bookingsToDeleteRes.rows;
    if (bookingsToDelete.length === 0) {
      return { message: "No matching bookings found to delete." };
    }

    if (user.role !== "admin") {
      const isAuthorized = bookingsToDelete.every(
        (b) => b.employeeId === user.id
      );
      if (!isAuthorized) {
        throw new Error(
          "You are not authorized to delete one or more of the selected bookings."
        );
      }
    }

    const idsToDelete = bookingsToDelete.map((b) => b.id);
    const deleteRes = await client.query(
      "DELETE FROM bookings WHERE id = ANY($1::int[])",
      [idsToDelete]
    );

    const tripIdCounts = bookingsToDelete.reduce((acc, booking) => {
      if (booking.tripId) {
        acc[booking.tripId] = (acc[booking.tripId] || 0) + 1;
      }
      return acc;
    }, {});

    const updatePromises = Object.entries(tripIdCounts).map(
      ([tripId, count]) => {
        return client.query(
          'UPDATE programs SET "totalBookings" = "totalBookings" - $1 WHERE id = $2 AND "totalBookings" >= $1',
          [count, tripId]
        );
      }
    );

    await Promise.all(updatePromises);

    await client.query("COMMIT");
    return { message: `${deleteRes.rowCount} bookings deleted successfully` };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const findBookingForUser = async (
  db,
  user,
  bookingId,
  checkOwnership = false
) => {
  const { rows } = await db.query(
    'SELECT * FROM bookings WHERE id = $1 AND "userId" = $2',
    [bookingId, user.adminId]
  );
  if (rows.length === 0) throw new Error("Booking not found or not authorized");

  const booking = rows[0];
  if (checkOwnership) {
    if (user.role === "manager") {
      throw new Error("Managers are not authorized to modify payments.");
    }
    if (user.role === "employee" && booking.employeeId !== user.id) {
      throw new Error(
        "You are not authorized to modify payments for this booking."
      );
    }
  }
  return booking;
};

const addPayment = async (db, user, bookingId, paymentData) => {
  // Check ownership before adding a payment
  const booking = await findBookingForUser(db, user, bookingId, true);
  const newPayment = { ...paymentData, _id: new Date().getTime().toString() };
  const advancePayments = [...(booking.advancePayments || []), newPayment];
  const totalPaid = advancePayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = booking.sellingPrice - totalPaid;
  const isFullyPaid = remainingBalance <= 0;

  const { rows: updatedRows } = await db.query(
    'UPDATE bookings SET "advancePayments" = $1, "remainingBalance" = $2, "isFullyPaid" = $3 WHERE id = $4 RETURNING *',
    [JSON.stringify(advancePayments), remainingBalance, isFullyPaid, bookingId]
  );
  return updatedRows[0];
};

const updatePayment = async (db, user, bookingId, paymentId, paymentData) => {
  // Check ownership before updating a payment
  const booking = await findBookingForUser(db, user, bookingId, true);
  const advancePayments = (booking.advancePayments || []).map((p) =>
    p._id === paymentId ? { ...p, ...paymentData, _id: p._id } : p
  );
  const totalPaid = advancePayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = booking.sellingPrice - totalPaid;
  const isFullyPaid = remainingBalance <= 0;

  const { rows: updatedRows } = await db.query(
    'UPDATE bookings SET "advancePayments" = $1, "remainingBalance" = $2, "isFullyPaid" = $3 WHERE id = $4 RETURNING *',
    [JSON.stringify(advancePayments), remainingBalance, isFullyPaid, bookingId]
  );
  return updatedRows[0];
};

const deletePayment = async (db, user, bookingId, paymentId) => {
  // Check ownership before deleting a payment
  const booking = await findBookingForUser(db, user, bookingId, true);
  const advancePayments = (booking.advancePayments || []).filter(
    (p) => p._id !== paymentId
  );
  const totalPaid = advancePayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = booking.sellingPrice - totalPaid;
  const isFullyPaid = remainingBalance <= 0;

  const { rows: updatedRows } = await db.query(
    'UPDATE bookings SET "advancePayments" = $1, "remainingBalance" = $2, "isFullyPaid" = $3 WHERE id = $4 RETURNING *',
    [JSON.stringify(advancePayments), remainingBalance, isFullyPaid, bookingId]
  );
  return updatedRows[0];
};

module.exports = {
  calculateBasePrice,
  getAllBookings,
  createBooking,
  updateBooking,
  deleteBooking,
  deleteMultipleBookings,
  addPayment,
  updatePayment,
  deletePayment,
};
