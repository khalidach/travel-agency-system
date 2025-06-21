const ProgramPricingService = require("./ProgramPricingService"); // We need this to get pricing info

const calculateBasePrice = async (
  db,
  userId,
  tripId,
  packageId,
  selectedHotel
) => {
  const { rows: programs } = await db.query(
    'SELECT * FROM programs WHERE id = $1 AND "userId" = $2',
    [tripId, userId]
  );
  if (programs.length === 0)
    throw new Error("Program not found for base price calculation.");
  const program = programs[0];

  const { rows: pricings } = await db.query(
    'SELECT * FROM program_pricing WHERE "programId" = $1 AND "userId" = $2',
    [tripId, userId]
  );
  if (pricings.length === 0) return 0; // Return 0 if no pricing is set up
  const pricing = pricings[0];

  const bookingPackage = (program.packages || []).find(
    (p) => p.name === packageId
  );
  if (!bookingPackage) return 0;

  const hotelCombination = (selectedHotel.hotelNames || []).join("_");
  const priceStructure = (bookingPackage.prices || []).find(
    (p) => p.hotelCombination === hotelCombination
  );
  if (!priceStructure) return 0;

  const guestMap = new Map(
    priceStructure.roomTypes.map((rt) => [rt.type, rt.guests])
  );

  const hotelCosts = (selectedHotel.cities || []).reduce(
    (total, city, index) => {
      const hotelName = selectedHotel.hotelNames[index];
      const roomTypeName = selectedHotel.roomTypes[index];
      const hotelPricingInfo = (pricing.allHotels || []).find(
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

  const ticketPrice = Number(pricing.ticketAirline || 0);
  const visaPrice = Number(pricing.visaFees || 0);
  const guidePrice = Number(pricing.guideFees || 0);

  return Math.round(ticketPrice + visaPrice + guidePrice + hotelCosts);
};

const createBooking = async (db, user, bookingData) => {
  const { role, id, adminId } = user;
  const {
    clientNameAr,
    clientNameFr,
    phoneNumber,
    passportNumber,
    tripId,
    packageId,
    selectedHotel,
    sellingPrice,
    advancePayments,
    relatedPersons,
  } = bookingData;

  const basePrice = await calculateBasePrice(
    db,
    adminId,
    tripId,
    packageId,
    selectedHotel
  );
  const profit = sellingPrice - basePrice;

  const totalPaid = (advancePayments || []).reduce(
    (sum, p) => sum + p.amount,
    0
  );
  const remainingBalance = sellingPrice - totalPaid;
  const isFullyPaid = remainingBalance <= 0;
  const employeeId = role === "admin" ? null : id;

  const { rows } = await db.query(
    'INSERT INTO bookings ("userId", "employeeId", "clientNameAr", "clientNameFr", "phoneNumber", "passportNumber", "tripId", "packageId", "selectedHotel", "sellingPrice", "basePrice", profit, "advancePayments", "remainingBalance", "isFullyPaid", "relatedPersons", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW()) RETURNING *',
    [
      adminId,
      employeeId,
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

const updateBooking = async (db, user, bookingId, bookingData) => {
  const {
    clientNameAr,
    clientNameFr,
    phoneNumber,
    passportNumber,
    tripId,
    packageId,
    selectedHotel,
    sellingPrice,
    advancePayments,
    relatedPersons,
  } = bookingData;

  const basePrice = await calculateBasePrice(
    db,
    user.adminId,
    tripId,
    packageId,
    selectedHotel
  );
  const profit = sellingPrice - basePrice;

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
      user.adminId,
    ]
  );
  if (rows.length === 0) {
    throw new Error("Booking not found or user not authorized");
  }
  return rows[0];
};

// --- Other functions (getAllBookings, deleteBooking, payment functions) remain the same ---

const getAllBookings = async (db, id, page, limit, idColumn) => {
  const offset = (page - 1) * limit;
  const bookingsPromise = db.query(
    `SELECT * FROM bookings WHERE "${idColumn}" = $1 ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3`,
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
  const { role, id, adminId } = user;
  let query;
  let params;

  if (role === "employee") {
    query = 'DELETE FROM bookings WHERE id = $1 AND "employeeId" = $2';
    params = [bookingId, id];
  } else {
    query = 'DELETE FROM bookings WHERE id = $1 AND "userId" = $2';
    params = [bookingId, adminId];
  }

  const { rowCount } = await db.query(query, params);
  if (rowCount === 0) {
    throw new Error("Booking not found or user not authorized");
  }
  return { message: "Booking deleted successfully" };
};

const findBookingForUser = async (db, user, bookingId) => {
  const { rows } = await db.query(
    'SELECT * FROM bookings WHERE id = $1 AND "userId" = $2',
    [bookingId, user.adminId]
  );
  if (rows.length === 0) throw new Error("Booking not found or not authorized");
  return rows[0];
};

const addPayment = async (db, user, bookingId, paymentData) => {
  const booking = await findBookingForUser(db, user, bookingId);
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
  const booking = await findBookingForUser(db, user, bookingId);
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
  const booking = await findBookingForUser(db, user, bookingId);
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
  getAllBookings,
  createBooking,
  updateBooking,
  deleteBooking,
  addPayment,
  updatePayment,
  deletePayment,
};
