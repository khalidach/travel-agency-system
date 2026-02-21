// backend/services/ProgramPricingService.js
// Per-booking profit calculation removed — profit is now calculated at program level via ProgramCosting.

/**
 * Creates a new program pricing record.
 * No longer recalculates bookings — pricing is display-only in the booking form.
 */
exports.createPricingAndBookings = async (db, user, pricingData) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const {
      programId,
      selectProgram,
      ticketAirline,
      ticketPricesByVariation,
      visaFees,
      guideFees,
      transportFees,
      allHotels,
      personTypes,
    } = pricingData;

    const userId = user.adminId;
    const employeeId = user.role !== "admin" ? user.id : null;

    const { rows: createdPricingRows } = await client.query(
      'INSERT INTO program_pricing ("userId", "employeeId", "programId", "selectProgram", "ticketAirline", "ticketPricesByVariation", "visaFees", "guideFees", "transportFees", "allHotels", "personTypes") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [
        userId,
        employeeId,
        programId,
        selectProgram,
        ticketAirline,
        JSON.stringify(ticketPricesByVariation || {}),
        visaFees,
        guideFees,
        transportFees,
        JSON.stringify(allHotels || []),
        JSON.stringify(personTypes || []),
      ]
    );

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
 * Updates a program's pricing record.
 * No longer recalculates bookings — pricing is display-only in the booking form.
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
      'UPDATE program_pricing SET "programId" = $1, "selectProgram" = $2, "ticketAirline" = $3, "ticketPricesByVariation" = $4, "visaFees" = $5, "guideFees" = $6, "allHotels" = $7, "transportFees" = $8, "personTypes" = $9, "updatedAt" = NOW() WHERE id = $10 AND "userId" = $11 RETURNING *',
      [
        pricingData.programId,
        pricingData.selectProgram,
        pricingData.ticketAirline,
        JSON.stringify(pricingData.ticketPricesByVariation || {}),
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

    await client.query("COMMIT");
    return updatedPricingRows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
