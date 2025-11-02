// backend/services/ProgramCostingService.js
const { calculateBasePrice } = require("./BookingService");
const logger = require("../utils/logger");

/**
 * Recalculates all bookings for a program when the final costing is enabled.
 * The new base price is totalCost / totalBookings.
 * @param {object} client - The database client.
 * @param {number} userId - The admin user ID.
 * @param {number} programId - The program ID.
 * @param {number} totalCost - The total final cost for the program.
 * @param {object} dbPool - The database connection pool (needed for logging in controller).
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

/**
 * Exported function to run the heavy booking update logic asynchronously.
 * This should be called *after* the main transaction commits.
 * @param {object} dbPool - The database connection pool.
 * @param {number} adminId - The admin user ID.
 * @param {number} programId - The program ID.
 * @param {number} totalCost - The total final cost.
 * @param {boolean} isEnabled - Whether final costing is enabled.
 */
exports.runBookingRecalculation = async (
  dbPool,
  adminId,
  programId,
  totalCost,
  isEnabled
) => {
  const client = await dbPool.connect();
  try {
    logger.info(
      `Starting asynchronous booking recalculation for Program ID: ${programId}, Enabled: ${isEnabled}`
    );

    // Begin a new transaction for the long-running task
    await client.query("BEGIN");

    if (isEnabled) {
      await applyFinalCostToBookings(client, adminId, programId, totalCost);
    } else {
      await revertToDetailedPricing(client, adminId, programId);
    }

    await client.query("COMMIT");
    logger.info(
      `Finished asynchronous booking recalculation for Program ID: ${programId}`
    );
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error(
      `Error during asynchronous booking recalculation for Program ID: ${programId}`,
      {
        message: error.message,
        stack: error.stack,
      }
    );
  } finally {
    client.release();
  }
};

module.exports.applyFinalCostToBookings = applyFinalCostToBookings; // Export original internal function
module.exports.revertToDetailedPricing = revertToDetailedPricing; // Export original internal function
