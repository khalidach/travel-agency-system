const AppError = require("../../utils/appError");

/**
 * Checks if a program has reached its maximum booking capacity.
 * @param {object} client - pg client object.
 * @param {number} programId - The ID of the program (tripId).
 * @param {number} newBookingsCount - The number of new bookings being added.
 * @returns {Promise<{isFull: boolean, maxBookings: number | null, currentBookings: number}>}
 */
const checkProgramCapacity = async (client, programId, newBookingsCount) => {
  const programResult = await client.query(
    'SELECT "maxBookings" FROM programs WHERE id = $1',
    [programId],
  );

  if (programResult.rows.length === 0) {
    throw new AppError("Program not found.", 404);
  }

  const { maxBookings } = programResult.rows[0];

  // If maxBookings is NULL (unlimited), capacity check is skipped.
  if (maxBookings === null) {
    return { isFull: false, maxBookings: null, currentBookings: 0 };
  }

  // Count existing bookings for the program
  const countResult = await client.query(
    'SELECT COUNT(*) FROM bookings WHERE "tripId" = $1',
    [programId],
  );
  const currentBookings = parseInt(countResult.rows[0].count, 10);

  const totalAfterNew = currentBookings + newBookingsCount;

  return {
    isFull: totalAfterNew > maxBookings,
    maxBookings: parseInt(maxBookings, 10), // Ensure it's number
    currentBookings,
  };
};

module.exports = {
  checkProgramCapacity,
};
