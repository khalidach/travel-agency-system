const { findBookingForUser } = require("./retrieval.service");

const addPayment = async (db, user, bookingId, paymentData) => {
  const booking = await findBookingForUser(db, user, bookingId, true);
  const { labelPaper, ...restOfPaymentData } = paymentData;

  const newPayment = {
    ...restOfPaymentData,
    _id: new Date().getTime().toString(),
    labelPaper: labelPaper || "",
  };

  const advancePayments = [...(booking.advancePayments || []), newPayment];
  const totalPaid = advancePayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = booking.sellingPrice - totalPaid;
  const isFullyPaid = remainingBalance <= 0;

  const { rows: updatedRows } = await db.query(
    'UPDATE bookings SET "advancePayments" = $1, "remainingBalance" = $2, "isFullyPaid" = $3 WHERE id = $4 RETURNING *',
    [JSON.stringify(advancePayments), remainingBalance, isFullyPaid, bookingId],
  );
  return updatedRows[0];
};

const updatePayment = async (db, user, bookingId, paymentId, paymentData) => {
  const booking = await findBookingForUser(db, user, bookingId, true);
  const { labelPaper, ...restOfPaymentData } = paymentData;

  const advancePayments = (booking.advancePayments || []).map((p) =>
    p._id === paymentId
      ? { ...p, ...restOfPaymentData, _id: p._id, labelPaper: labelPaper || "" }
      : p,
  );
  const totalPaid = advancePayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = booking.sellingPrice - totalPaid;
  const isFullyPaid = remainingBalance <= 0;

  const { rows: updatedRows } = await db.query(
    'UPDATE bookings SET "advancePayments" = $1, "remainingBalance" = $2, "isFullyPaid" = $3 WHERE id = $4 RETURNING *',
    [JSON.stringify(advancePayments), remainingBalance, isFullyPaid, bookingId],
  );
  return updatedRows[0];
};

const deletePayment = async (db, user, bookingId, paymentId) => {
  const booking = await findBookingForUser(db, user, bookingId, true);
  const advancePayments = (booking.advancePayments || []).filter(
    (p) => p._id !== paymentId,
  );
  const totalPaid = advancePayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = booking.sellingPrice - totalPaid;
  const isFullyPaid = remainingBalance <= 0;

  const { rows: updatedRows } = await db.query(
    'UPDATE bookings SET "advancePayments" = $1, "remainingBalance" = $2, "isFullyPaid" = $3 WHERE id = $4 RETURNING *',
    [JSON.stringify(advancePayments), remainingBalance, isFullyPaid, bookingId],
  );
  return updatedRows[0];
};

module.exports = {
  addPayment,
  updatePayment,
  deletePayment,
};
