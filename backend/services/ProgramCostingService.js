// backend/services/ProgramCostingService.js
const { calculateBasePrice } = require("./BookingService");

/**
 * Recalculates all bookings for a program when the final costing is enabled.
 * The new base price is totalCost / totalBookings.
 * @param {object} client - The database client.
 * @param {number} userId - The admin user ID.
 * @param {number} programId - The program ID.
 * @param {number} totalCost - The total final cost for the program.
 */
async function applyFinalCostToBookings(client, userId, programId, totalCost) {
  const { rows: bookings } = await client.query(
    'SELECT id, "sellingPrice" FROM bookings WHERE "tripId" = $1 AND "userId" = $2',
    [String(programId), userId]
  );

  if (bookings.length === 0) {
    return; // No bookings to update
  }

  const totalBookings = bookings.length;
  const newBasePrice = totalBookings > 0 ? totalCost / totalBookings : 0;

  for (const booking of bookings) {
    const newProfit = Number(booking.sellingPrice || 0) - newBasePrice;
    await client.query(
      'UPDATE bookings SET "basePrice" = $1, profit = $2 WHERE id = $3',
      [newBasePrice, newProfit, booking.id]
    );
  }
}

/**
 * Reverts all bookings for a program to the detailed pricing calculation.
 * @param {object} client - The database client.
 * @param {number} userId - The admin user ID.
 * @param {number} programId - The program ID.
 */
async function revertToDetailedPricing(client, userId, programId) {
  const { rows: bookings } = await client.query(
    'SELECT * FROM bookings WHERE "tripId" = $1 AND "userId" = $2',
    [String(programId), userId]
  );

  for (const booking of bookings) {
    // Use the original detailed price calculation function
    const newBasePrice = await calculateBasePrice(
      client,
      userId,
      booking.tripId,
      booking.packageId,
      booking.selectedHotel,
      booking.personType,
      booking.variationName
    );

    const newProfit = Number(booking.sellingPrice || 0) - newBasePrice;
    await client.query(
      'UPDATE bookings SET "basePrice" = $1, profit = $2 WHERE id = $3',
      [newBasePrice, newProfit, booking.id]
    );
  }
}

module.exports = {
  applyFinalCostToBookings,
  revertToDetailedPricing,
};
