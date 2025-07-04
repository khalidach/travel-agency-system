// backend/services/ProgramPricingService.js
const { calculateBasePrice } = require("./BookingService");

/**
 * Recalculates base price and profit for all bookings related to a program.
 * @param {object} client - The database client for the transaction.
 * @param {number} userId - The ID of the admin user.
 * @param {number} programId - The ID of the program whose bookings need updating.
 */
async function updateRelatedBookings(client, userId, programId) {
  const { rows: relatedBookings } = await client.query(
    'SELECT * FROM bookings WHERE "tripId" = $1 AND "userId" = $2',
    [programId, userId]
  );

  if (relatedBookings.length > 0) {
    const updatePromises = relatedBookings.map(async (booking) => {
      const newBasePrice = await calculateBasePrice(
        client,
        userId,
        booking.tripId,
        booking.packageId,
        booking.selectedHotel,
        booking.personType
      );

      const newProfit = Number(booking.sellingPrice || 0) - newBasePrice;
      const totalPaid = (booking.advancePayments || []).reduce(
        (sum, p) => sum + p.amount,
        0
      );
      const newRemainingBalance = Number(booking.sellingPrice || 0) - totalPaid;
      const newIsFullyPaid = newRemainingBalance <= 0;

      return client.query(
        'UPDATE bookings SET "basePrice" = $1, profit = $2, "remainingBalance" = $3, "isFullyPaid" = $4 WHERE id = $5',
        [
          newBasePrice,
          newProfit,
          newRemainingBalance,
          newIsFullyPaid,
          booking.id,
        ]
      );
    });
    await Promise.all(updatePromises);
  }
}

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

    await updateRelatedBookings(client, userId, programId);

    await client.query("COMMIT");
    return createdPricingRows[0];
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

    await updateRelatedBookings(client, user.adminId, pricingData.programId);

    await client.query("COMMIT");
    return updatedPricingRows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
