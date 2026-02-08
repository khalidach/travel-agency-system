const RoomManagementService = require("../RoomManagementService");

const deleteBooking = async (db, user, bookingId) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { role, id, adminId } = user;

    if (role === "manager") {
      throw new Error(
        "Managers are not authorized to delete individual bookings.",
      );
    }

    const bookingRes = await client.query(
      'SELECT "tripId", "employeeId" FROM bookings WHERE id = $1 AND "userId" = $2',
      [bookingId, adminId],
    );

    if (bookingRes.rows.length === 0) {
      throw new Error("Booking not found or user not authorized");
    }
    const booking = bookingRes.rows[0];

    if (role === "employee" && booking.employeeId !== id) {
      throw new Error("You are not authorized to delete this booking.");
    }

    const { tripId } = booking;

    // Remove this booking from other bookings' relatedPersons list
    const relatedPersonIdentifier = JSON.stringify([
      { ID: parseInt(bookingId, 10) },
    ]);
    const { rows: referencingBookings } = await client.query(
      `SELECT id, "relatedPersons" FROM bookings
        WHERE "userId" = $1 AND "tripId" = $2 AND "relatedPersons" @> $3::jsonb`,
      [adminId, tripId, relatedPersonIdentifier],
    );

    for (const referencingBooking of referencingBookings) {
      const updatedRelatedPersons = referencingBooking.relatedPersons.filter(
        (person) => person.ID !== parseInt(bookingId, 10),
      );
      await client.query(
        'UPDATE bookings SET "relatedPersons" = $1 WHERE id = $2',
        [JSON.stringify(updatedRelatedPersons), referencingBooking.id],
      );
    }

    await RoomManagementService.removeOccupantFromRooms(
      client,
      adminId,
      booking.tripId,
      bookingId,
    );

    const deleteRes = await client.query("DELETE FROM bookings WHERE id = $1", [
      bookingId,
    ]);

    if (deleteRes.rowCount === 0) {
      throw new Error("Booking not found or failed to delete.");
    }

    if (tripId) {
      await client.query(
        'UPDATE programs SET "totalBookings" = "totalBookings" - 1 WHERE id = $1 AND "totalBookings" > 0',
        [tripId],
      );
    }

    await client.query("COMMIT");
    return { message: "Booking deleted successfully" };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const deleteMultipleBookings = async (db, user, bookingIds, filters) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { adminId, role, id: userId } = user;

    let whereClause = "";
    const queryParams = [adminId];
    let paramIndex = 2;

    if (bookingIds && bookingIds.length > 0) {
      whereClause = `WHERE id = ANY($${paramIndex}::int[]) AND "userId" = $1`;
      queryParams.push(bookingIds);
      paramIndex++;
    } else if (filters) {
      let whereConditions = ['"userId" = $1', '"tripId" = $2'];
      queryParams.push(filters.programId);
      paramIndex++;

      if (filters.searchTerm) {
        whereConditions.push(
          `("clientNameFr"->>'lastName' ILIKE $${paramIndex} OR "clientNameFr"->>'firstName' ILIKE $${paramIndex} OR "clientNameAr" ILIKE $${paramIndex} OR "passportNumber" ILIKE $${paramIndex})`,
        );
        queryParams.push(`%${filters.searchTerm}%`);
        paramIndex++;
      }
      if (filters.statusFilter === "paid") {
        whereConditions.push('"isFullyPaid" = true');
      } else if (filters.statusFilter === "pending") {
        whereConditions.push(
          '"isFullyPaid" = false AND COALESCE(jsonb_array_length("advancePayments"), 0) > 0',
        );
      } else if (filters.statusFilter === "notPaid") {
        whereConditions.push(
          '"isFullyPaid" = false AND COALESCE(jsonb_array_length("advancePayments"), 0) = 0',
        );
      }

      if (filters.variationFilter && filters.variationFilter !== "all") {
        whereConditions.push(`"variationName" = $${paramIndex}`);
        queryParams.push(filters.variationFilter);
        paramIndex++;
      }

      if (role === "admin") {
        if (
          filters.employeeFilter !== "all" &&
          /^\d+$/.test(filters.employeeFilter)
        ) {
          whereConditions.push(`"employeeId" = $${paramIndex}`);
          queryParams.push(filters.employeeFilter);
          paramIndex++;
        }
      } else if (role === "employee" || role === "manager") {
        whereConditions.push(`"employeeId" = $${paramIndex}`);
        queryParams.push(userId);
        paramIndex++;
      }

      whereClause = `WHERE ${whereConditions.join(" AND ")}`;
    } else {
      throw new Error("No booking IDs or filters provided for deletion.");
    }

    const bookingsToDeleteRes = await client.query(
      `SELECT id, "tripId", "employeeId" FROM bookings ${whereClause}`,
      queryParams,
    );

    const bookingsToDelete = bookingsToDeleteRes.rows;
    if (bookingsToDelete.length === 0) {
      return { message: "No matching bookings found to delete." };
    }

    const idsToDelete = bookingsToDelete.map((b) => b.id);
    const tripId = bookingsToDelete[0]?.tripId;

    if (tripId) {
      await client.query(
        `UPDATE bookings
          SET "relatedPersons" = (
              SELECT jsonb_agg(elem)
              FROM jsonb_array_elements("relatedPersons") AS elem
              WHERE NOT ((elem->>'ID')::int = ANY($1::int[]))
          )
          WHERE "userId" = $2 AND "tripId" = $3 AND "relatedPersons" IS NOT NULL AND "relatedPersons" != '[]'::jsonb`,
        [idsToDelete, adminId, tripId],
      );
    }

    for (const booking of bookingsToDelete) {
      await RoomManagementService.removeOccupantFromRooms(
        client,
        user.adminId,
        booking.tripId,
        booking.id,
      );
    }

    if (user.role !== "admin") {
      const isAuthorized = bookingsToDelete.every(
        (b) => b.employeeId === user.id,
      );
      if (!isAuthorized) {
        throw new Error(
          "You are not authorized to delete one or more of the selected bookings.",
        );
      }
    }

    const deleteRes = await client.query(
      "DELETE FROM bookings WHERE id = ANY($1::int[])",
      [idsToDelete],
    );

    const tripIdCounts = bookingsToDelete.reduce((acc, booking) => {
      if (booking.tripId) {
        acc[booking.tripId] = (acc[booking.tripId] || 0) + 1;
      }
      return acc;
    }, {});

    const updatePromises = Object.entries(tripIdCounts).map(
      ([tripId, count]) => {
        return client.query(
          'UPDATE programs SET "totalBookings" = "totalBookings" - $1 WHERE id = $2 AND "totalBookings" >= $1',
          [count, tripId],
        );
      },
    );

    await Promise.all(updatePromises);

    await client.query("COMMIT");
    return { message: `${deleteRes.rowCount} bookings deleted successfully` };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  deleteBooking,
  deleteMultipleBookings,
};
