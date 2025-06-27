// backend/services/ProgramPricingService.js

/**
 * Creates a new program pricing and recalculates the base price and profit for all related bookings.
 * This is a transactional operation.
 * @param {object} db - The database connection pool.
 * @param {object} user - The user object from the request.
 * @param {object} pricingData - The new pricing data.
 * @returns {Promise<object>} A promise that resolves to the created program pricing record.
 */
exports.createPricingAndBookings = async (db, user, pricingData) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const {
      programId,
      selectProgram,
      ticketAirline,
      visaFees,
      guideFees,
      transportFees,
      allHotels,
      personTypes,
    } = pricingData;

    // Get userId and employeeId from user object
    const userId = user.adminId;
    const employeeId = user.role !== "admin" ? user.id : null;

    const { rows: createdPricingRows } = await client.query(
      'INSERT INTO program_pricing ("userId", "employeeId", "programId", "selectProgram", "ticketAirline", "visaFees", "guideFees", "transportFees", "allHotels", "personTypes") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [
        userId,
        employeeId,
        programId,
        selectProgram,
        ticketAirline,
        visaFees,
        guideFees,
        transportFees,
        JSON.stringify(allHotels || []),
        JSON.stringify(personTypes || []),
      ]
    );

    const newProgramPricing = createdPricingRows[0];

    // After creating the pricing, update all related bookings for that program
    await updateRelatedBookings(client, userId, programId, newProgramPricing);

    await client.query("COMMIT");
    return newProgramPricing;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Updates a program's pricing and recalculates the base price and profit for all related bookings.
 * This is a transactional operation.
 * @param {object} db - The database connection pool.
 * @param {object} user - The user performing the update.
 * @param {number} pricingId - The ID of the pricing record to update.
 * @param {object} pricingData - The new pricing data.
 * @returns {Promise<object>} A promise that resolves to the updated program pricing record.
 */
exports.updatePricingAndBookings = async (db, user, pricingId, pricingData) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Authorization check
    const pricingRes = await client.query(
      'SELECT "employeeId" FROM program_pricing WHERE id = $1 AND "userId" = $2',
      [pricingId, user.adminId]
    );

    if (pricingRes.rows.length === 0) {
      throw new Error("Program pricing not found or user not authorized");
    }

    const existingPricing = pricingRes.rows[0];
    if (user.role !== "admin" && existingPricing.employeeId !== user.id) {
      throw new Error("You are not authorized to modify this pricing.");
    }

    const { rows: updatedPricingRows } = await client.query(
      'UPDATE program_pricing SET "programId" = $1, "selectProgram" = $2, "ticketAirline" = $3, "visaFees" = $4, "guideFees" = $5, "allHotels" = $6, "transportFees" = $7, "personTypes" = $8, "updatedAt" = NOW() WHERE id = $9 AND "userId" = $10 RETURNING *',
      [
        pricingData.programId,
        pricingData.selectProgram,
        pricingData.ticketAirline,
        pricingData.visaFees,
        pricingData.guideFees,
        JSON.stringify(pricingData.allHotels || []),
        pricingData.transportFees,
        JSON.stringify(pricingData.personTypes || []),
        pricingId,
        user.adminId,
      ]
    );

    if (updatedPricingRows.length === 0) {
      throw new Error("Program pricing not found or user not authorized");
    }

    const updatedProgramPricing = updatedPricingRows[0];

    await updateRelatedBookings(
      client,
      user.adminId,
      pricingData.programId,
      updatedProgramPricing
    );

    await client.query("COMMIT");
    return updatedProgramPricing;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

async function updateRelatedBookings(
  client,
  userId,
  programId,
  programPricing
) {
  const { rows: programs } = await client.query(
    'SELECT * FROM programs WHERE id = $1 AND "userId" = $2',
    [programId, userId]
  );
  if (programs.length === 0) {
    throw new Error("Associated program not found.");
  }
  const program = programs[0];

  const { rows: relatedBookings } = await client.query(
    'SELECT * FROM bookings WHERE "tripId" = $1 AND "userId" = $2',
    [programPricing.programId, userId]
  );

  if (relatedBookings.length > 0) {
    const updatePromises = relatedBookings.map((booking) => {
      const bookingPackage = (program.packages || []).find(
        (p) => p.name === booking.packageId
      );
      if (!bookingPackage) return Promise.resolve();

      const hotelCombination = (booking.selectedHotel.hotelNames || []).join(
        "_"
      );
      const priceStructure = (bookingPackage.prices || []).find(
        (p) => p.hotelCombination === hotelCombination
      );
      if (!priceStructure) return Promise.resolve();

      const guestMap = new Map(
        priceStructure.roomTypes.map((rt) => [rt.type, rt.guests])
      );

      const hotelCosts = (booking.selectedHotel.cities || []).reduce(
        (total, city, index) => {
          const hotelName = booking.selectedHotel.hotelNames[index];
          const roomTypeName = booking.selectedHotel.roomTypes[index];

          const hotelPricingInfo = (programPricing.allHotels || []).find(
            (h) => h.name === hotelName && h.city === city
          );
          const cityInfo = (program.cities || []).find((c) => c.name === city);

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
        },
        0
      );

      const personTypeInfo = (programPricing.personTypes || []).find(
        (p) => p.type === booking.personType
      );
      const ticketPercentage = personTypeInfo
        ? personTypeInfo.ticketPercentage / 100
        : 1;
      const ticketPrice =
        Number(programPricing.ticketAirline || 0) * ticketPercentage;

      const visaPrice = Number(programPricing.visaFees || 0);
      const guidePrice = Number(programPricing.guideFees || 0);
      const transportPrice = Number(programPricing.transportFees || 0);

      const newBasePrice = Math.round(
        ticketPrice + visaPrice + guidePrice + transportPrice + hotelCosts
      );
      const newProfit = Number(booking.sellingPrice || 0) - newBasePrice;
      const totalPaid = (booking.advancePayments || []).reduce(
        (sum, p) => sum + p.amount,
        0
      );
      const newRemainingBalance = Number(booking.sellingPrice || 0) - totalPaid;

      return client.query(
        'UPDATE bookings SET "basePrice" = $1, profit = $2, "remainingBalance" = $3 WHERE id = $4',
        [newBasePrice, newProfit, newRemainingBalance, booking.id]
      );
    });
    await Promise.all(updatePromises);
  }
}
