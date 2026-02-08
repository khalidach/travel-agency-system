const isEqual = require("fast-deep-equal");
const logger = require("../../utils/logger");
const AppError = require("../../utils/appError");
const RoomManagementService = require("../RoomManagementService");
const { checkProgramCapacity } = require("./capacity.service");
const { calculateBasePrice } = require("./pricing.service");

/**
 * Handles cascading name updates for a booking.
 */
async function handleNameChangeCascades(client, oldBooking, updatedBooking) {
  const nameChanged = !isEqual(
    oldBooking.clientNameFr,
    updatedBooking.clientNameFr,
  );

  if (!nameChanged) {
    return;
  }

  const newFullName =
    `${updatedBooking.clientNameFr.firstName} ${updatedBooking.clientNameFr.lastName}`.trim();

  const userId = updatedBooking.userId;
  const tripId = updatedBooking.tripId;
  const bookingId = updatedBooking.id;

  // 1. Update `relatedPersons` in other bookings
  const relatedPersonIdentifier = JSON.stringify([{ ID: bookingId }]);
  const { rows: referencingBookings } = await client.query(
    `SELECT id, "relatedPersons" FROM bookings 
      WHERE "userId" = $1 AND "tripId" = $2 AND "relatedPersons" @> $3::jsonb`,
    [userId, tripId, relatedPersonIdentifier],
  );

  for (const booking of referencingBookings) {
    const updatedRelatedPersons = booking.relatedPersons.map((person) => {
      if (person.ID === bookingId) {
        return { ...person, clientName: newFullName };
      }
      return person;
    });
    await client.query(
      'UPDATE bookings SET "relatedPersons" = $1 WHERE id = $2',
      [JSON.stringify(updatedRelatedPersons), booking.id],
    );
  }

  // 2. Update the name in `room_managements`
  const { rows: roomManagements } = await client.query(
    'SELECT id, rooms FROM room_managements WHERE "userId" = $1 AND "programId" = $2',
    [userId, tripId],
  );

  for (const management of roomManagements) {
    let roomsChanged = false;
    const updatedRooms = management.rooms.map((room) => {
      const updatedOccupants = room.occupants.map((occupant) => {
        if (occupant && occupant.id === bookingId) {
          roomsChanged = true;
          return { ...occupant, clientName: updatedBooking.clientNameAr };
        }
        return occupant;
      });
      return { ...room, occupants: updatedOccupants };
    });

    if (roomsChanged) {
      await client.query(
        "UPDATE room_managements SET rooms = $1 WHERE id = $2",
        [JSON.stringify(updatedRooms), management.id],
      );
    }
  }
}

const updateBooking = async (db, user, bookingId, bookingData) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Get the old booking data before the update
    const oldBookingResult = await client.query(
      'SELECT * FROM bookings WHERE id = $1 AND "userId" = $2',
      [bookingId, user.adminId],
    );

    if (oldBookingResult.rows.length === 0) {
      throw new Error("Booking not found or not authorized");
    }

    const oldBooking = oldBookingResult.rows[0];

    if (user.role !== "admin" && oldBooking.employeeId !== user.id) {
      throw new Error("You are not authorized to modify this booking.");
    }

    const {
      clientNameAr,
      clientNameFr,
      personType,
      phoneNumber,
      passportNumber,
      dateOfBirth,
      passportExpirationDate,
      gender,
      tripId,
      variationName,
      packageId,
      selectedHotel,
      sellingPrice,
      advancePayments,
      relatedPersons,
      noPassport,
      bookingSource,
    } = bookingData;

    // Capacity Check for TripId change
    if (oldBooking.tripId !== tripId) {
      const capacity = await checkProgramCapacity(client, tripId, 1);

      if (capacity.isFull) {
        throw new AppError(
          `لا يمكن نقل الحجز إلى هذا البرنامج. البرنامج ممتلئ: ${capacity.currentBookings}/${capacity.maxBookings}.`,
          400,
        );
      }
    }

    const processedClientNameFr = {
      lastName: clientNameFr.lastName
        ? clientNameFr.lastName.toUpperCase()
        : "",
      firstName: clientNameFr.firstName
        ? clientNameFr.firstName.toUpperCase()
        : "",
    };

    const processedPassportNumber =
      noPassport || !passportNumber ? null : passportNumber.toUpperCase();

    if (processedPassportNumber) {
      const existingBookingCheck = await client.query(
        'SELECT id FROM bookings WHERE "passportNumber" = $1 AND "tripId" = $2 AND "userId" = $3 AND id != $4',
        [processedPassportNumber, tripId, user.adminId, bookingId],
      );

      if (existingBookingCheck.rows.length > 0) {
        throw new Error(
          "Another booking with this passport number already exists for this program.",
        );
      }
    }

    const programRes = await db.query(
      'SELECT packages FROM programs WHERE id = $1 AND "userId" = $2',
      [tripId, user.adminId],
    );
    if (programRes.rows.length === 0) {
      throw new Error("Program not found.");
    }
    const program = programRes.rows[0];
    if (program.packages && program.packages.length > 0 && !packageId) {
      throw new Error("A package must be selected for this program.");
    }

    const basePrice = await calculateBasePrice(
      client,
      user.adminId,
      tripId,
      packageId,
      selectedHotel,
      personType,
      variationName,
    );
    const profit = sellingPrice - basePrice;
    const totalPaid = (advancePayments || []).reduce(
      (sum, p) => sum + p.amount,
      0,
    );
    const remainingBalance = sellingPrice - totalPaid;
    const isFullyPaid = remainingBalance <= 0;

    const { rows } = await client.query(
      'UPDATE bookings SET "clientNameAr" = $1, "clientNameFr" = $2, "personType" = $3, "phoneNumber" = $4, "passportNumber" = $5, "dateOfBirth" = $6, "passportExpirationDate" = $7, "gender" = $8, "tripId" = $9, "variationName" = $10, "packageId" = $11, "selectedHotel" = $12, "sellingPrice" = $13, "basePrice" = $14, profit = $15, "advancePayments" = $16, "remainingBalance" = $17, "isFullyPaid" = $18, "relatedPersons" = $19, "bookingSource" = $20 WHERE id = $21 RETURNING *',
      [
        clientNameAr,
        JSON.stringify(processedClientNameFr),
        personType,
        phoneNumber,
        processedPassportNumber,
        dateOfBirth || null,
        passportExpirationDate || null,
        gender,
        tripId,
        variationName,
        packageId,
        JSON.stringify(selectedHotel),
        sellingPrice,
        basePrice,
        profit,
        JSON.stringify(advancePayments || []),
        remainingBalance,
        isFullyPaid,
        JSON.stringify(relatedPersons || []),
        bookingSource || null,
        bookingId,
      ],
    );

    const updatedBooking = rows[0];

    await handleNameChangeCascades(client, oldBooking, updatedBooking);

    const isFullyAssigned = await RoomManagementService.isFamilyFullyAssigned(
      client,
      user.adminId,
      updatedBooking.tripId,
      updatedBooking,
    );

    const keyFieldsChanged =
      oldBooking.packageId !== updatedBooking.packageId ||
      oldBooking.gender !== updatedBooking.gender ||
      oldBooking.personType !== updatedBooking.personType ||
      oldBooking.variationName !== updatedBooking.variationName ||
      !isEqual(oldBooking.relatedPersons, updatedBooking.relatedPersons) ||
      !isEqual(oldBooking.selectedHotel, updatedBooking.selectedHotel) ||
      oldBooking.tripId !== updatedBooking.tripId;

    if (!isFullyAssigned || keyFieldsChanged) {
      let reason = [];
      if (!isFullyAssigned) reason.push("not fully assigned");
      if (keyFieldsChanged) reason.push("key fields changed");
      logger.info(
        `Re-assignment triggered for booking ID ${bookingId}. Reason: ${reason.join(" and ")}.`,
      );

      await RoomManagementService.removeOccupantFromRooms(
        client,
        user.adminId,
        oldBooking.tripId,
        oldBooking.id,
      );

      await RoomManagementService.autoAssignToRoom(
        client,
        user.adminId,
        updatedBooking,
      );
    } else {
      logger.info(
        `Booking ID ${bookingId} is fully assigned and no key fields changed. Skipping room re-assignment.`,
      );
    }

    if (oldBooking.tripId !== tripId) {
      await client.query(
        'UPDATE programs SET "totalBookings" = "totalBookings" - 1 WHERE id = $1 AND "totalBookings" > 0',
        [oldBooking.tripId],
      );
      await client.query(
        'UPDATE programs SET "totalBookings" = "totalBookings" + 1 WHERE id = $1',
        [tripId],
      );
    }

    await client.query("COMMIT");
    return updatedBooking;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  updateBooking,
};
