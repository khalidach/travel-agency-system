// backend/services/RoomManagementService.js

/**
 * Recalculates room assignments for a booking and its family members.
 * This function handles family-based allocation and ensures no duplicate assignments within the same city.
 *
 * @param {object} client - The database client for the transaction.
 * @param {number} userId - The ID of the admin user.
 * @param {object} newBooking - The newly created or updated booking object.
 */
exports.autoAssignToRoom = async (client, userId, newBooking) => {
  const { tripId: programId, selectedHotel } = newBooking;

  // Make sure to have valid hotel selection for this to work
  if (
    !selectedHotel ||
    !selectedHotel.hotelNames ||
    selectedHotel.hotelNames.length === 0
  ) {
    return;
  }

  // Fetch the entire family group for the booking
  const members = await exports.getFamilyMembers(client, userId, newBooking.id);

  // Iterate over each hotel selected in the booking
  for (let i = 0; i < selectedHotel.hotelNames.length; i++) {
    const hotelName = selectedHotel.hotelNames[i];
    const roomType = selectedHotel.roomTypes[i];
    const cityName = selectedHotel.cities[i];
    if (!hotelName || !roomType) continue;

    // First, remove any existing assignments for the family members in the same city
    await exports.removeOccupantFromCity(
      client,
      userId,
      programId,
      cityName,
      members.map((m) => m.id)
    );

    const { rows: managementRows } = await client.query(
      'SELECT id, rooms FROM room_managements WHERE "userId" = $1 AND "programId" = $2 AND "hotelName" = $3',
      [userId, programId, hotelName]
    );

    let rooms = managementRows.length > 0 ? managementRows[0].rooms : [];
    const managementId =
      managementRows.length > 0 ? managementRows[0].id : null;

    // Get the room capacity for the selected room type
    const programResult = await client.query(
      "SELECT packages FROM programs WHERE id = $1",
      [programId]
    );
    const program = programResult.rows[0];
    let capacity = 2; // Default capacity
    if (program && program.packages) {
      for (const pkg of program.packages) {
        if (pkg.prices) {
          for (const price of pkg.prices) {
            const rt = price.roomTypes.find((r) => r.type === roomType);
            if (rt) {
              capacity = rt.guests;
              break;
            }
          }
        }
        if (capacity !== 2) break;
      }
    }

    const familySize = members.length;
    let placedOccupantIds = new Set();

    // --- Family room allocation rule: Check for exact match first ---
    if (familySize > 1 && familySize === capacity) {
      let emptyRoomIndex = rooms.findIndex(
        (r) => r.type === roomType && r.occupants.every((o) => o === null)
      );

      if (emptyRoomIndex === -1) {
        // Create a new room if none is available
        const newRoom = {
          name: `${roomType} ${
            rooms.filter((r) => r.type === roomType).length + 1
          }`,
          type: roomType,
          capacity: capacity,
          occupants: Array(capacity).fill(null),
        };
        rooms.push(newRoom);
        emptyRoomIndex = rooms.length - 1;
      }

      // Assign all family members to the new room
      members.forEach((member, index) => {
        rooms[emptyRoomIndex].occupants[index] = {
          id: member.id,
          clientName: member.clientNameAr,
          gender: member.gender,
        };
        placedOccupantIds.add(member.id);
      });
    }

    // --- Individual placement logic (for non-matching families or single bookings) ---
    for (const member of members) {
      if (placedOccupantIds.has(member.id)) continue;

      const occupant = {
        id: member.id,
        clientName: member.clientNameAr,
        gender: member.gender,
      };

      let placed = false;
      for (const room of rooms) {
        const roomGender = room.occupants.find((o) => o)?.gender;
        const emptySlot = room.occupants.findIndex((o) => o === null);
        if (
          room.type === roomType &&
          emptySlot !== -1 &&
          (roomGender === undefined || roomGender === member.gender)
        ) {
          room.occupants[emptySlot] = occupant;
          placed = true;
          break;
        }
      }

      if (!placed) {
        const newRoom = {
          name: `${roomType} ${
            rooms.filter((r) => r.type === roomType).length + 1
          }`,
          type: roomType,
          capacity: capacity,
          occupants: Array(capacity).fill(null),
        };
        newRoom.occupants[0] = occupant;
        rooms.push(newRoom);
      }
      placedOccupantIds.add(member.id);
    }

    const roomsToSave = rooms.filter((room) => room.occupants.some((o) => o));

    // Save or delete the room management record based on the result
    if (roomsToSave.length > 0) {
      if (managementId) {
        await client.query(
          'UPDATE room_managements SET rooms = $1, "updatedAt" = NOW() WHERE id = $2',
          [JSON.stringify(roomsToSave), managementId]
        );
      } else {
        await client.query(
          'INSERT INTO room_managements ("userId", "programId", "hotelName", rooms) VALUES ($1, $2, $3, $4)',
          [userId, programId, hotelName, JSON.stringify(roomsToSave)]
        );
      }
    } else if (managementId) {
      // If there are no more occupants for this hotel, delete the record.
      await client.query("DELETE FROM room_managements WHERE id = $1", [
        managementId,
      ]);
    }
  }
};

/**
 * Removes a person and their family members from all rooms in a specific city for a given program.
 *
 * @param {object} client - The database client for the transaction.
 * @param {number} userId - The ID of the admin user.
 * @param {string} programId - The ID of the program.
 * @param {string} cityName - The name of the city to remove assignments from.
 * @param {Array<number>} occupantIds - An array of booking IDs for the family members to remove.
 */
exports.removeOccupantFromCity = async (
  client,
  userId,
  programId,
  cityName,
  occupantIds
) => {
  const { rows } = await client.query(
    'SELECT id, rooms, "hotelName" FROM room_managements WHERE "userId" = $1 AND "programId" = $2',
    [userId, programId]
  );

  const cityHotelsResult = await client.query(
    "SELECT jsonb_array_elements(packages)->'hotels'->>$1 AS hotel_name FROM programs WHERE id = $2 AND \"userId\" = $3",
    [cityName, programId, userId]
  );
  const cityHotelNames = new Set(
    cityHotelsResult.rows.map((row) => row.hotel_name)
  );

  for (const management of rows) {
    if (cityHotelNames.has(management.hotelName)) {
      let rooms = management.rooms;
      let changed = false;
      rooms.forEach((room) => {
        room.occupants = room.occupants.map((o) =>
          o && occupantIds.includes(o.id) ? null : o
        );
        if (room.occupants.some((o) => o === null)) {
          changed = true;
        }
      });
      if (changed) {
        const roomsToSave = rooms.filter((room) =>
          room.occupants.some((o) => o)
        );
        if (roomsToSave.length > 0) {
          await client.query(
            'UPDATE room_managements SET rooms = $1, "updatedAt" = NOW() WHERE id = $2',
            [JSON.stringify(roomsToSave), management.id]
          );
        } else {
          await client.query("DELETE FROM room_managements WHERE id = $1", [
            management.id,
          ]);
        }
      }
    }
  }
};

/**
 * Removes an occupant from all rooms for a given program, regardless of city.
 * This is used when a booking is being deleted or changed to ensure a clean slate.
 *
 * @param {object} client - The database client for the transaction.
 * @param {number} userId - The ID of the admin user.
 * @param {string} programId - The ID of the program.
 * @param {number} occupantId - The ID of the occupant (booking ID) to remove.
 */
exports.removeOccupantFromRooms = async (
  client,
  userId,
  programId,
  occupantId
) => {
  const allBookings = await exports.getFamilyMembers(
    client,
    userId,
    occupantId
  );
  const occupantIds = allBookings.map((b) => b.id);

  const { rows } = await client.query(
    'SELECT id, rooms FROM room_managements WHERE "userId" = $1 AND "programId" = $2',
    [userId, programId]
  );

  for (const management of rows) {
    let rooms = management.rooms;
    let changed = false;
    rooms.forEach((room) => {
      const initialOccupantCount = room.occupants.filter((o) => o).length;
      room.occupants = room.occupants.map((o) =>
        o && occupantIds.includes(o.id) ? null : o
      );
      if (room.occupants.filter((o) => o).length < initialOccupantCount) {
        changed = true;
      }
    });
    if (changed) {
      const roomsToSave = rooms.filter((room) => room.occupants.some((o) => o));
      if (roomsToSave.length > 0) {
        await client.query(
          'UPDATE room_managements SET rooms = $1, "updatedAt" = NOW() WHERE id = $2',
          [JSON.stringify(roomsToSave), management.id]
        );
      } else {
        await client.query("DELETE FROM room_managements WHERE id = $1", [
          management.id,
        ]);
      }
    }
  }
};

/**
 * Gets or initializes rooms for a given program and hotel.
 * @param {object} db - The database connection pool.
 * @param {number} userId - The ID of the admin user.
 * @param {number} programId - The ID of the program.
 * @param {string} hotelName - The name of the hotel.
 * @returns {Promise<Array>} A promise that resolves to the list of rooms.
 */
exports.getRooms = async (db, userId, programId, hotelName) => {
  const { rows } = await db.query(
    'SELECT rooms FROM room_managements WHERE "userId" = $1 AND "programId" = $2 AND "hotelName" = $3',
    [userId, programId, hotelName]
  );

  if (rows.length > 0) {
    return rows[0].rooms;
  } else {
    return [];
  }
};

/**
 * Saves the room assignments for a given program and hotel.
 * If the provided rooms array is empty, the corresponding database record is deleted.
 * @param {object} db - The database connection pool.
 * @param {number} userId - The ID of the admin user.
 * @param {number} programId - The ID of the program.
 * @param {string} hotelName - The name of the hotel.
 * @param {Array} rooms - The array of room objects to save.
 * @returns {Promise<Array>} A promise that resolves to the saved list of rooms, or an empty array if deleted.
 */
exports.saveRooms = async (db, userId, programId, hotelName, rooms) => {
  if (!rooms || rooms.length === 0) {
    await db.query(
      'DELETE FROM room_managements WHERE "userId" = $1 AND "programId" = $2 AND "hotelName" = $3',
      [userId, programId, hotelName]
    );
    return [];
  } else {
    const { rows } = await db.query(
      `INSERT INTO room_managements ("userId", "programId", "hotelName", rooms)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("userId", "programId", "hotelName")
       DO UPDATE SET rooms = $4, "updatedAt" = NOW()
       RETURNING rooms`,
      [userId, programId, hotelName, JSON.stringify(rooms)]
    );
    return rows[0].rooms;
  }
};

/**
 * Searches for occupants across all user bookings, excluding those already assigned
 * to a room in the specified hotel for the specified program.
 * @param {object} db - The database connection pool.
 * @param {number} userId - The ID of the admin user.
 * @param {number} programId - The ID of the program to scope the exclusion.
 * @param {string} hotelName - The name of the hotel to scope the exclusion.
 * @param {string} searchTerm - The search term for the client name.
 * @returns {Promise<Array>} A promise that resolves to a list of available occupants.
 */
exports.searchUnassignedOccupants = async (
  db,
  userId,
  programId,
  hotelName,
  searchTerm
) => {
  const assignedResult = await db.query(
    `SELECT jsonb_path_query(rooms, '$[*].occupants[*].id') as id
     FROM room_managements
     WHERE "userId" = $1 AND "programId" = $2 AND "hotelName" = $3`,
    [userId, programId, hotelName]
  );
  const assignedIds = new Set(
    assignedResult.rows.map((r) => parseInt(r.id, 10))
  );

  let query = `
    SELECT id, "clientNameAr" as "clientName"
    FROM bookings
    WHERE "userId" = $1
  `;
  const params = [userId];
  let paramIndex = 2;

  if (assignedIds.size > 0) {
    query += ` AND NOT (id = ANY($${paramIndex}::int[]))`;
    params.push(Array.from(assignedIds));
    paramIndex++;
  }

  if (searchTerm) {
    query += ` AND ("clientNameFr" ILIKE $${paramIndex} OR "clientNameAr" ILIKE $${paramIndex})`;
    params.push(`%${searchTerm}%`);
    paramIndex++;
  }

  query += ` LIMIT 20`;

  const { rows } = await db.query(query, params);
  return rows;
};

/**
 * Fetches a booking and all its related family members.
 * This function will fetch the main booking and all related persons, or if the booking is a related person,
 * it will fetch the main booking and the entire family.
 *
 * @param {object} client - The database client for the transaction.
 * @param {number} userId - The ID of the admin user.
 * @param {number} bookingId - The ID of the booking to get family members for.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of all family members.
 */
exports.getFamilyMembers = async (client, userId, bookingId) => {
  // Find the booking that is either the leader or a related person.
  const { rows: allBookingsRows } = await client.query(
    `SELECT id, "clientNameAr", gender, "relatedPersons", "tripId"
     FROM bookings
     WHERE id = $1 AND "userId" = $2
     OR (
        "userId" = $2 AND "relatedPersons" @> jsonb_build_array(jsonb_build_object('ID', $1))
     )`,
    [bookingId, userId]
  );

  if (allBookingsRows.length === 0) {
    return [];
  }

  const mainBooking =
    allBookingsRows.find((b) => b.id === bookingId) || allBookingsRows[0];
  const relatedPersons = mainBooking.relatedPersons || [];
  const allFamilyMembers = [mainBooking];

  if (relatedPersons.length > 0) {
    const relatedIds = relatedPersons.map((p) => p.ID);
    const { rows: relatedBookings } = await client.query(
      'SELECT id, "clientNameAr", gender FROM bookings WHERE id = ANY($1::int[]) AND "userId" = $2',
      [relatedIds, userId]
    );
    allFamilyMembers.push(...relatedBookings);
  }

  return allFamilyMembers;
};

/**
 * Checks if any of the given booking IDs are currently assigned to a room in a program.
 * @param {object} client - The database client for the transaction.
 * @param {number} userId - The ID of the admin user.
 * @param {number} programId - The ID of the program.
 * @param {Array<number>} bookingIds - An array of booking IDs to check for assignment.
 * @returns {Promise<boolean>} A promise that resolves to true if any booking is assigned, otherwise false.
 */
exports.checkIfAnyAssigned = async (client, userId, programId, bookingIds) => {
  if (!bookingIds || bookingIds.length === 0) return false;
  const { rows } = await client.query(
    `SELECT EXISTS (
          SELECT 1
          FROM room_managements
          WHERE "userId" = $1 AND "programId" = $2
          AND EXISTS (
              SELECT 1
              FROM jsonb_array_elements(rooms) as r, jsonb_array_elements(r->'occupants') as o
              WHERE (o->>'id')::int = ANY($3::int[])
          )
      ) AS is_assigned`,
    [userId, programId, bookingIds]
  );
  return rows[0].is_assigned;
};

/**
 * Checks if a booking and its entire family are assigned to a room in every required hotel for the program.
 * @param {object} client - The database client.
 * @param {number} userId - The ID of the admin user.
 * @param {string} programId - The ID of the program.
 * @param {object} booking - The booking object to check.
 * @returns {Promise<boolean>} A promise that resolves to true if fully assigned, otherwise false.
 */
exports.isFamilyFullyAssigned = async (client, userId, programId, booking) => {
  const familyMembers = await exports.getFamilyMembers(
    client,
    userId,
    booking.id
  );
  if (familyMembers.length === 0) {
    return false;
  }
  const familyMemberIds = new Set(familyMembers.map((m) => m.id));

  const requiredHotels = (booking.selectedHotel?.hotelNames || []).filter(
    (h) => h
  );
  if (requiredHotels.length === 0) {
    return true;
  }

  const { rows: allRoomManagements } = await client.query(
    'SELECT "hotelName", rooms FROM room_managements WHERE "userId" = $1 AND "programId" = $2',
    [userId, programId]
  );

  const assignmentsByHotel = new Map();
  allRoomManagements.forEach((mgmt) => {
    const assignedIdsInHotel = new Set();
    (mgmt.rooms || []).forEach((room) => {
      (room.occupants || []).forEach((occupant) => {
        if (occupant && occupant.id) {
          assignedIdsInHotel.add(occupant.id);
        }
      });
    });
    assignmentsByHotel.set(mgmt.hotelName, assignedIdsInHotel);
  });

  for (const hotelName of requiredHotels) {
    const assignedInThisHotel = assignmentsByHotel.get(hotelName);
    if (!assignedInThisHotel) {
      return false;
    }

    for (const memberId of familyMemberIds) {
      if (!assignedInThisHotel.has(memberId)) {
        return false;
      }
    }
  }

  return true;
};
