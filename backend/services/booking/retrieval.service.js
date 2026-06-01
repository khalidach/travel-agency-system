const getAllBookings = async (db, id, page, limit, idColumn, branchId) => {
  const offset = (page - 1) * limit;
  let query = `SELECT b.*, e.username as "employeeName"
      FROM bookings b
      LEFT JOIN employees e ON b."employeeId" = e.id
      WHERE b."${idColumn}" = $1`;
  let countQuery = `SELECT COUNT(*) FROM bookings WHERE "${idColumn}" = $1`;
  const params = [id];
  
  if (branchId && branchId !== 'all') {
    query += ` AND b."branchId" = $${params.length + 1}`;
    countQuery += ` AND "branchId" = $${params.length + 1}`;
    params.push(branchId);
  }
  
  query += ` ORDER BY b."createdAt" DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  
  const bookingsPromise = db.query(query, [...params, limit, offset]);
  const totalCountPromise = db.query(countQuery, params);

  const [bookingsResult, totalCountResult] = await Promise.all([
    bookingsPromise,
    totalCountPromise,
  ]);
  const totalCount = parseInt(totalCountResult.rows[0].count, 10);
  return { bookings: bookingsResult.rows, totalCount };
};

const findBookingForUser = async (
  db,
  user,
  bookingId,
  checkOwnership = false,
) => {
  const { rows } = await db.query(
    'SELECT * FROM bookings WHERE id = $1 AND "userId" = $2',
    [bookingId, user.adminId],
  );
  if (rows.length === 0) throw new Error("Booking not found or not authorized");

  const booking = rows[0];
  const permissions = user.permissions || [];
  if (user.role === "employee" && !permissions.includes("viewOthersBookings") && booking.employeeId !== user.id) {
    throw new Error("Booking not found or not authorized");
  }

  if (checkOwnership) {
    if (user.role === "manager") {
      throw new Error("Managers are not authorized to modify payments.");
    }
    if (user.role === "employee" && booking.employeeId !== user.id) {
      throw new Error(
        "You are not authorized to modify payments for this booking.",
      );
    }
  }
  return booking;
};

const getGroupBookings = async (db, user, bookingId) => {
  const leaderBooking = await findBookingForUser(db, user, bookingId, false);
  const bookings = [leaderBooking];

  if (leaderBooking.relatedPersons && leaderBooking.relatedPersons.length > 0) {
    const memberIds = leaderBooking.relatedPersons.map(p => p.ID);
    if (memberIds.length > 0) {
      const placeholders = memberIds.map((_, i) => `$${i + 2}`).join(', ');
      const { rows } = await db.query(
        `SELECT * FROM bookings WHERE id IN (${placeholders}) AND "userId" = $1`,
        [user.adminId, ...memberIds]
      );
      bookings.push(...rows);
    }
  }
  return bookings;
};

module.exports = {
  getAllBookings,
  findBookingForUser,
  getGroupBookings,
};
