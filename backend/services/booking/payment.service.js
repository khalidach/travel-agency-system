const { findBookingForUser, getGroupBookings } = require("./retrieval.service");

const addPayment = async (db, user, bookingId, paymentData) => {
  const booking = await findBookingForUser(db, user, bookingId, true);
  const { labelPaper, ...restOfPaymentData } = paymentData;

  const newPayment = {
    ...restOfPaymentData,
    _id: new Date().getTime().toString(),
    labelPaper: labelPaper || "",
  };

  const advancePayments = [...(booking.advancePayments || []), newPayment];
  const totalPaid = advancePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const remainingBalance = Number(booking.sellingPrice || 0) - totalPaid;
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
  const totalPaid = advancePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const remainingBalance = Number(booking.sellingPrice || 0) - totalPaid;
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
  const totalPaid = advancePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const remainingBalance = Number(booking.sellingPrice || 0) - totalPaid;
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

const distributeAmount = (totalAmount, groupBookingsData) => {
  let amountLeft = Number(totalAmount);
  const N = groupBookingsData.length;

  const distribution = {};
  groupBookingsData.forEach(b => {
    distribution[b.id] = { assigned: 0, remaining: b.trueRemainingBalance > 0 ? b.trueRemainingBalance : 0 };
  });

  let activeIds = groupBookingsData.filter(b => b.trueRemainingBalance > 0).map(b => b.id);

  if (activeIds.length === 0) {
    const share = amountLeft / N;
    groupBookingsData.forEach(b => distribution[b.id].assigned = share);
    return distribution;
  }

  while (amountLeft > 0.001 && activeIds.length > 0) {
    const share = amountLeft / activeIds.length;
    let amountAssignedInRound = 0;

    const nextActive = [];
    for (const id of activeIds) {
      const d = distribution[id];
      if (d.remaining <= share + 0.0001) {
        amountAssignedInRound += d.remaining;
        d.assigned += d.remaining;
        d.remaining = 0;
      } else {
        nextActive.push(id);
      }
    }

    if (nextActive.length === activeIds.length) {
      for (const id of activeIds) {
        distribution[id].assigned += share;
        distribution[id].remaining -= share;
      }
      amountLeft = 0;
    } else {
      amountLeft -= amountAssignedInRound;
      activeIds = nextActive;
    }
  }

  if (amountLeft > 0.001) {
    const share = amountLeft / N;
    groupBookingsData.forEach(b => distribution[b.id].assigned += share);
  }

  return distribution;
};

const addGroupPayment = async (db, user, bookingId, paymentData) => {
  const groupBookings = await getGroupBookings(db, user, bookingId);
  const leaderBooking = groupBookings.find(b => b.id == bookingId);
  if (!leaderBooking) throw new Error("Leader booking not found");

  if (user.role === "manager") {
    throw new Error("Managers are not authorized to modify payments.");
  }
  if (user.role === "employee" && leaderBooking.employeeId !== user.id) {
    throw new Error("You are not authorized to modify payments for this booking.");
  }

  const { labelPaper, ...restOfPaymentData } = paymentData;

  const bookingsData = groupBookings.map(b => ({
    id: b.id,
    trueRemainingBalance: Number(b.remainingBalance || 0)
  }));
  const distribution = distributeAmount(paymentData.amount, bookingsData);

  const paymentId = new Date().getTime().toString();

  const updatedBookings = [];

  for (const booking of groupBookings) {
    const isLeader = booking.id == bookingId;
    const newPayment = {
      ...restOfPaymentData,
      _id: paymentId,
      labelPaper: labelPaper || "",
      amount: distribution[booking.id].assigned,
      isGroupPayment: true,
      isLeader: isLeader,
      groupAmount: isLeader ? Number(paymentData.amount) : undefined,
    };

    const advancePayments = [...(booking.advancePayments || []), newPayment];
    const totalPaid = advancePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const remainingBalance = Number(booking.sellingPrice || 0) - totalPaid;
    const isFullyPaid = remainingBalance <= 0;

    const { rows: updatedRows } = await db.query(
      'UPDATE bookings SET "advancePayments" = $1, "remainingBalance" = $2, "isFullyPaid" = $3 WHERE id = $4 RETURNING *',
      [JSON.stringify(advancePayments), remainingBalance, isFullyPaid, booking.id],
    );
    updatedBookings.push(updatedRows[0]);
  }

  return updatedBookings;
};

const updateGroupPayment = async (db, user, bookingId, paymentId, paymentData) => {
  const groupBookings = await getGroupBookings(db, user, bookingId);
  const leaderBooking = groupBookings.find(b => b.id == bookingId);
  if (!leaderBooking) throw new Error("Leader booking not found");

  if (user.role === "manager") {
    throw new Error("Managers are not authorized to modify payments.");
  }
  if (user.role === "employee" && leaderBooking.employeeId !== user.id) {
    throw new Error("You are not authorized to modify payments for this booking.");
  }

  const { labelPaper, ...restOfPaymentData } = paymentData;

  const bookingsData = groupBookings.map(b => {
    const oldAdvancePayments = (b.advancePayments || []).filter(p => !(p._id === paymentId && p.isGroupPayment));
    const oldTotalPaid = oldAdvancePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return {
      id: b.id,
      trueRemainingBalance: Number(b.sellingPrice || 0) - oldTotalPaid
    };
  });
  const distribution = distributeAmount(paymentData.amount, bookingsData);

  const updatedBookings = [];

  for (const booking of groupBookings) {
    const isLeader = booking.id == bookingId;
    const advancePayments = (booking.advancePayments || []).map((p) =>
      p._id === paymentId && p.isGroupPayment
        ? {
          ...p,
          ...restOfPaymentData,
          _id: p._id,
          labelPaper: labelPaper || "",
          amount: distribution[booking.id].assigned,
          groupAmount: isLeader ? Number(paymentData.amount) : undefined,
        }
        : p
    );

    const totalPaid = advancePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const remainingBalance = Number(booking.sellingPrice || 0) - totalPaid;
    const isFullyPaid = remainingBalance <= 0;

    const { rows: updatedRows } = await db.query(
      'UPDATE bookings SET "advancePayments" = $1, "remainingBalance" = $2, "isFullyPaid" = $3 WHERE id = $4 RETURNING *',
      [JSON.stringify(advancePayments), remainingBalance, isFullyPaid, booking.id],
    );
    updatedBookings.push(updatedRows[0]);
  }

  return updatedBookings;
};

const deleteGroupPayment = async (db, user, bookingId, paymentId) => {
  const groupBookings = await getGroupBookings(db, user, bookingId);
  const leaderBooking = groupBookings.find(b => b.id == bookingId);
  if (!leaderBooking) throw new Error("Leader booking not found");

  if (user.role === "manager") {
    throw new Error("Managers are not authorized to modify payments.");
  }
  if (user.role === "employee" && leaderBooking.employeeId !== user.id) {
    throw new Error("You are not authorized to modify payments for this booking.");
  }

  const updatedBookings = [];

  for (const booking of groupBookings) {
    const advancePayments = (booking.advancePayments || []).filter(
      (p) => !(p._id === paymentId && p.isGroupPayment)
    );

    const totalPaid = advancePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const remainingBalance = Number(booking.sellingPrice || 0) - totalPaid;
    const isFullyPaid = remainingBalance <= 0;

    const { rows: updatedRows } = await db.query(
      'UPDATE bookings SET "advancePayments" = $1, "remainingBalance" = $2, "isFullyPaid" = $3 WHERE id = $4 RETURNING *',
      [JSON.stringify(advancePayments), remainingBalance, isFullyPaid, booking.id],
    );
    updatedBookings.push(updatedRows[0]);
  }

  return updatedBookings;
};

module.exports = {
  addPayment,
  updatePayment,
  deletePayment,
  addGroupPayment,
  updateGroupPayment,
  deleteGroupPayment,
};
