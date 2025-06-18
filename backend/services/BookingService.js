// backend/services/BookingService.js

/**
 * Retrieves all bookings for a specific user.
 * @param {object} db - The database connection pool.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<Array>} A promise that resolves to an array of bookings.
 */
exports.getAllBookings = async (db, userId) => {
  const { rows } = await db.query(
    'SELECT * FROM bookings WHERE "userId" = $1 ORDER BY "createdAt" DESC',
    [userId]
  );
  return rows;
};

/**
 * Creates a new booking in the database.
 * @param {object} db - The database connection pool.
 * @param {number} userId - The ID of the user creating the booking.
 * @param {object} bookingData - The data for the new booking.
 * @returns {Promise<object>} A promise that resolves to the newly created booking.
 */
exports.createBooking = async (db, userId, bookingData) => {
  const {
    clientNameAr,
    clientNameFr,
    phoneNumber,
    passportNumber,
    tripId,
    packageId,
    selectedHotel,
    sellingPrice,
    basePrice,
    profit,
    advancePayments,
    relatedPersons,
  } = bookingData;
  const totalPaid = (advancePayments || []).reduce(
    (sum, p) => sum + p.amount,
    0
  );
  const remainingBalance = sellingPrice - totalPaid;
  const isFullyPaid = remainingBalance <= 0;

  const { rows } = await db.query(
    'INSERT INTO bookings ("userId", "clientNameAr", "clientNameFr", "phoneNumber", "passportNumber", "tripId", "packageId", "selectedHotel", "sellingPrice", "basePrice", profit, "advancePayments", "remainingBalance", "isFullyPaid", "relatedPersons", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW()) RETURNING *',
    [
      userId,
      clientNameAr,
      clientNameFr,
      phoneNumber,
      passportNumber,
      tripId,
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
  return rows[0];
};

/**
 * Updates an existing booking.
 * @param {object} db - The database connection pool.
 * @param {number} userId - The ID of the user.
 * @param {number} bookingId - The ID of the booking to update.
 * @param {object} bookingData - The new data for the booking.
 * @returns {Promise<object>} A promise that resolves to the updated booking.
 */
exports.updateBooking = async (db, userId, bookingId, bookingData) => {
  const {
    clientNameAr,
    clientNameFr,
    phoneNumber,
    passportNumber,
    tripId,
    packageId,
    selectedHotel,
    sellingPrice,
    basePrice,
    profit,
    advancePayments,
    relatedPersons,
  } = bookingData;
  const totalPaid = (advancePayments || []).reduce(
    (sum, p) => sum + p.amount,
    0
  );
  const remainingBalance = sellingPrice - totalPaid;
  const isFullyPaid = remainingBalance <= 0;

  const { rows } = await db.query(
    'UPDATE bookings SET "clientNameAr" = $1, "clientNameFr" = $2, "phoneNumber" = $3, "passportNumber" = $4, "tripId" = $5, "packageId" = $6, "selectedHotel" = $7, "sellingPrice" = $8, "basePrice" = $9, profit = $10, "advancePayments" = $11, "remainingBalance" = $12, "isFullyPaid" = $13, "relatedPersons" = $14 WHERE id = $15 AND "userId" = $16 RETURNING *',
    [
      clientNameAr,
      clientNameFr,
      phoneNumber,
      passportNumber,
      tripId,
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
      userId,
    ]
  );
  if (rows.length === 0) {
    throw new Error("Booking not found or user not authorized");
  }
  return rows[0];
};

/**
 * Deletes a booking from the database.
 * @param {object} db - The database connection pool.
 * @param {number} userId - The ID of the user.
 * @param {number} bookingId - The ID of the booking to delete.
 * @returns {Promise<object>} A promise that resolves to a confirmation message.
 */
exports.deleteBooking = async (db, userId, bookingId) => {
  const { rowCount } = await db.query(
    'DELETE FROM bookings WHERE id = $1 AND "userId" = $2',
    [bookingId, userId]
  );
  if (rowCount === 0) {
    throw new Error("Booking not found or user not authorized");
  }
  return { message: "Booking deleted successfully" };
};

/**
 * Adds a payment to a booking.
 * @param {object} db - The database connection pool.
 * @param {number} userId - The ID of the user.
 * @param {number} bookingId - The ID of the booking to add the payment to.
 * @param {object} paymentData - The payment details.
 * @returns {Promise<object>} A promise that resolves to the updated booking.
 */
exports.addPayment = async (db, userId, bookingId, paymentData) => {
  const { rows } = await db.query(
    'SELECT * FROM bookings WHERE id = $1 AND "userId" = $2',
    [bookingId, userId]
  );
  if (rows.length === 0) throw new Error("Booking not found");

  const booking = rows[0];
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

/**
 * Updates a payment for a booking.
 * @param {object} db - The database connection pool.
 * @param {number} userId - The ID of the user.
 * @param {number} bookingId - The ID of the booking.
 * @param {string} paymentId - The ID of the payment to update.
 * @param {object} paymentData - The new payment details.
 * @returns {Promise<object>} A promise that resolves to the updated booking.
 */
exports.updatePayment = async (
  db,
  userId,
  bookingId,
  paymentId,
  paymentData
) => {
  const { rows } = await db.query(
    'SELECT * FROM bookings WHERE id = $1 AND "userId" = $2',
    [bookingId, userId]
  );
  if (rows.length === 0) throw new Error("Booking not found");

  const booking = rows[0];
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

/**
 * Deletes a payment from a booking.
 * @param {object} db - The database connection pool.
 * @param {number} userId - The ID of the user.
 * @param {number} bookingId - The ID of the booking.
 * @param {string} paymentId - The ID of the payment to delete.
 * @returns {Promise<object>} A promise that resolves to the updated booking.
 */
exports.deletePayment = async (db, userId, bookingId, paymentId) => {
  const { rows } = await db.query(
    'SELECT * FROM bookings WHERE id = $1 AND "userId" = $2',
    [bookingId, userId]
  );
  if (rows.length === 0) throw new Error("Booking not found");

  const booking = rows[0];
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
