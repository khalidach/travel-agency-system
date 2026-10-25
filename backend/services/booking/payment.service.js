const { findBookingForUser, getGroupBookings } = require("./retrieval.service");
const { getNextPaymentId } = require("../sequence.service");

const addPayment = async (db, user, bookingId, paymentData) => {
  const booking = await findBookingForUser(db, user, bookingId, true);
  const { labelPaper, ...restOfPaymentData } = paymentData;

  const paymentId = await getNextPaymentId(db, user.adminId);

  const newPayment = {
    ...restOfPaymentData,
    _id: new Date().getTime().toString(),
    paymentID: paymentId,
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

const distributeAmount = (totalAmount, groupBookingsData, manualAllocations = null) => {
  let amountLeft = Number(totalAmount) || 0;

  const distribution = {};
  groupBookingsData.forEach(b => {
    distribution[b.id] = {
      assigned: 0,
      remaining: b.trueRemainingBalance > 0 ? Number(b.trueRemainingBalance) : 0,
    };
  });

  // If manual allocations are provided:
  if (manualAllocations && typeof manualAllocations === "object") {
    let hasValidAllocations = false;
    for (const b of groupBookingsData) {
      if (manualAllocations[b.id] !== undefined && manualAllocations[b.id] !== null) {
        const val = Number(manualAllocations[b.id]);
        if (!isNaN(val) && val >= 0) {
          distribution[b.id].assigned = val;
          hasValidAllocations = true;
        }
      }
    }
    if (hasValidAllocations) {
      return distribution;
    }
  }

  // DEFAULT DISTRIBUTION:
  // Distribute equally among members who have a remaining balance.
  // If equal share exceeds someone's remaining balance, cap them at their remaining balance
  // and distribute the rest among remaining members.
  // Any leftover (rounding cents or excess over total remaining balance) is given to the upper person (leader first).
  if (amountLeft <= 0) return distribution;

  const leader = groupBookingsData.find(b => b.isLeader);
  const orderedMembers = leader
    ? [leader, ...groupBookingsData.filter(b => !b.isLeader)]
    : [...groupBookingsData];

  let activeMembers = orderedMembers.filter(m => distribution[m.id].remaining > 0);

  while (amountLeft > 0.001 && activeMembers.length > 0) {
    const share = amountLeft / activeMembers.length;
    let anyCapped = false;

    for (const m of activeMembers) {
      const cap = distribution[m.id].remaining - distribution[m.id].assigned;
      if (cap < share - 0.0001) {
        distribution[m.id].assigned += cap;
        amountLeft -= cap;
        anyCapped = true;
      }
    }

    if (anyCapped) {
      activeMembers = activeMembers.filter(m => {
        const cap = distribution[m.id].remaining - distribution[m.id].assigned;
        return cap > 0.001;
      });
    } else {
      const shareRounded = Math.floor((amountLeft / activeMembers.length) * 100) / 100;
      let totalDistributedInStep = 0;
      activeMembers.forEach(m => {
        distribution[m.id].assigned += shareRounded;
        totalDistributedInStep += shareRounded;
      });
      amountLeft = Math.round((amountLeft - totalDistributedInStep) * 100) / 100;

      // Distribute leftover cents to upper members (orderedMembers / leader first)
      for (const m of activeMembers) {
        if (amountLeft <= 0.001) break;
        distribution[m.id].assigned = Math.round((distribution[m.id].assigned + 0.01) * 100) / 100;
        amountLeft = Math.round((amountLeft - 0.01) * 100) / 100;
      }
      break;
    }
  }

  // If amountLeft still > 0 (meaning payment exceeds the total group balance):
  // Give excess to the upper person (leader)
  if (amountLeft > 0.001) {
    const topPerson = leader || orderedMembers[0];
    distribution[topPerson.id].assigned = Math.round((distribution[topPerson.id].assigned + amountLeft) * 100) / 100;
    amountLeft = 0;
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

  const { labelPaper, allocations, ...restOfPaymentData } = paymentData;

  const bookingsData = groupBookings.map(b => ({
    id: b.id,
    trueRemainingBalance: Number(b.remainingBalance || 0),
    isLeader: b.id == bookingId
  }));
  const distribution = distributeAmount(paymentData.amount, bookingsData, allocations);

  const paymentId = await getNextPaymentId(db, user.adminId);
  const sharedGroupPaymentId = new Date().getTime().toString();

  const updatedBookings = [];

  for (const booking of groupBookings) {
    const isLeader = booking.id == bookingId;
    const assignedAmount = distribution[booking.id].assigned;
    const newPayment = {
      ...restOfPaymentData,
      _id: sharedGroupPaymentId,
      paymentID: paymentId,
      labelPaper: labelPaper || "",
      amount: assignedAmount,
      amountMAD: assignedAmount,
      isGroupPayment: true,
      isLeader: isLeader,
      groupAmount: Number(paymentData.amount),
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

  const { labelPaper, allocations, ...restOfPaymentData } = paymentData;

  const leaderPayment = (leaderBooking.advancePayments || []).find(p => p._id === paymentId && p.isGroupPayment);
  const targetPaymentID = leaderPayment ? leaderPayment.paymentID : null;

  const bookingsData = groupBookings.map(b => {
    const oldAdvancePayments = (b.advancePayments || []).filter(p => !((p._id === paymentId || (targetPaymentID && p.paymentID === targetPaymentID)) && p.isGroupPayment));
    const oldTotalPaid = oldAdvancePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return {
      id: b.id,
      trueRemainingBalance: Number(b.sellingPrice || 0) - oldTotalPaid,
      isLeader: b.id == bookingId
    };
  });
  const distribution = distributeAmount(paymentData.amount, bookingsData, allocations);

  const updatedBookings = [];

  for (const booking of groupBookings) {
    const isLeader = booking.id == bookingId;
    const assignedAmount = distribution[booking.id].assigned;
    const advancePayments = (booking.advancePayments || []).map((p) =>
      (p._id === paymentId || (targetPaymentID && p.paymentID === targetPaymentID)) && p.isGroupPayment
        ? {
          ...p,
          ...restOfPaymentData,
          _id: p._id,
          labelPaper: labelPaper || "",
          amount: assignedAmount,
          amountMAD: assignedAmount,
          isGroupPayment: true,
          isLeader: isLeader,
          groupAmount: Number(paymentData.amount),
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

  const leaderPayment = (leaderBooking.advancePayments || []).find(p => p._id === paymentId && p.isGroupPayment);
  const targetPaymentID = leaderPayment ? leaderPayment.paymentID : null;

  const updatedBookings = [];

  for (const booking of groupBookings) {
    const advancePayments = (booking.advancePayments || []).filter(
      (p) => !((p._id === paymentId || (targetPaymentID && p.paymentID === targetPaymentID)) && p.isGroupPayment)
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
