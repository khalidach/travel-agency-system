// backend/services/ProgramPricingService.js

/**
 * Updates a program's pricing and recalculates the base price and profit for all related bookings.
 * This is a transactional operation.
 * @param {object} db - The database connection pool.
 * @param {number} userId - The ID of the user performing the update.
 * @param {number} pricingId - The ID of the pricing record to update.
 * @param {object} pricingData - The new pricing data.
 * @returns {Promise<object>} A promise that resolves to the updated program pricing record.
 */
exports.updatePricingAndBookings = async (
  db,
  userId,
  pricingId,
  pricingData
) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const { rows: updatedPricingRows } = await client.query(
      'UPDATE program_pricing SET "programId" = $1, "selectProgram" = $2, "ticketAirline" = $3, "visaFees" = $4, "guideFees" = $5, "allHotels" = $6, "updatedAt" = NOW() WHERE id = $7 AND "userId" = $8 RETURNING *',
      [
        pricingData.programId,
        pricingData.selectProgram,
        pricingData.ticketAirline,
        pricingData.visaFees,
        pricingData.guideFees,
        JSON.stringify(pricingData.allHotels || []),
        pricingId,
        userId,
      ]
    );

    if (updatedPricingRows.length === 0) {
      throw new Error("Program pricing not found or user not authorized");
    }

    const updatedProgramPricing = updatedPricingRows[0];

    const { rows: programs } = await client.query(
      'SELECT * FROM programs WHERE id = $1 AND "userId" = $2',
      [pricingData.programId, userId]
    );
    if (programs.length === 0) {
      throw new Error("Associated program not found.");
    }
    const program = programs[0];

    const { rows: relatedBookings } = await client.query(
      'SELECT * FROM bookings WHERE "tripId" = $1 AND "userId" = $2',
      [updatedProgramPricing.programId, userId]
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

            const hotelPricingInfo = (
              updatedProgramPricing.allHotels || []
            ).find((h) => h.name === hotelName && h.city === city);
            const cityInfo = (program.cities || []).find(
              (c) => c.name === city
            );

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

        const ticketPrice = Number(updatedProgramPricing.ticketAirline || 0);
        const visaPrice = Number(updatedProgramPricing.visaFees || 0);
        const guidePrice = Number(updatedProgramPricing.guideFees || 0);

        const newBasePrice = Math.round(
          ticketPrice + visaPrice + guidePrice + hotelCosts
        );
        const newProfit = Number(booking.sellingPrice || 0) - newBasePrice;
        const totalPaid = (booking.advancePayments || []).reduce(
          (sum, p) => sum + p.amount,
          0
        );
        const newRemainingBalance =
          Number(booking.sellingPrice || 0) - totalPaid;

        return client.query(
          'UPDATE bookings SET "basePrice" = $1, profit = $2, "remainingBalance" = $3 WHERE id = $4',
          [newBasePrice, newProfit, newRemainingBalance, booking.id]
        );
      });
      await Promise.all(updatePromises);
    }

    await client.query("COMMIT");
    return updatedProgramPricing;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
