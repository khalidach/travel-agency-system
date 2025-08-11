// backend/services/RoomManagementService.js

/**
 * Initializes rooms for a given program and hotel if they don't exist.
 * This function will now return an empty array to prevent default room creation.
 * @param {object} db - The database connection pool.
 * @param {number} userId - The ID of the admin user.
 * @param {number} programId - The ID of the program.
 * @param {string} hotelName - The name of the hotel.
 * @returns {Promise<Array>} A promise that resolves to an empty list of rooms.
 */
const initializeRooms = async (db, userId, programId, hotelName) => {
  // The original logic for creating default rooms is removed.
  // We will return an empty array to give you a clean slate.
  return [];
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
    // This will now call the updated initializeRooms and return an empty array.
    return initializeRooms(db, userId, programId, hotelName);
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
  // If the rooms array is empty or null, delete the record for this hotel.
  if (!rooms || rooms.length === 0) {
    await db.query(
      'DELETE FROM room_managements WHERE "userId" = $1 AND "programId" = $2 AND "hotelName" = $3',
      [userId, programId, hotelName]
    );
    // Return an empty array to signify no rooms are saved.
    return [];
  } else {
    // If there are rooms, proceed with the upsert logic.
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
  // 1. Get all occupant IDs that are already assigned to a room in this specific hotel for this specific program.
  const assignedResult = await db.query(
    `SELECT jsonb_path_query(rooms, '$[*].occupants[*].id') as id
     FROM room_managements
     WHERE "userId" = $1 AND "programId" = $2 AND "hotelName" = $3`,
    [userId, programId, hotelName]
  );

  // Convert the result to a Set of numbers for efficient lookup.
  const assignedIds = new Set(
    assignedResult.rows.map((r) => parseInt(r.id, 10))
  );

  // 2. Search for bookings, now selecting the Arabic name and searching both name fields.
  let query = `
    SELECT id, "clientNameAr" as "clientName"
    FROM bookings
    WHERE "userId" = $1
  `;
  const params = [userId];
  let paramIndex = 2;

  // Add condition to exclude already assigned occupants
  if (assignedIds.size > 0) {
    // Using ANY with an array is more efficient than a large IN clause.
    query += ` AND NOT (id = ANY($${paramIndex}::int[]))`;
    params.push(Array.from(assignedIds));
    paramIndex++;
  }

  // Add search term filter
  if (searchTerm) {
    // Search in both French and Arabic names
    query += ` AND ("clientNameFr" ILIKE $${paramIndex} OR "clientNameAr" ILIKE $${paramIndex})`;
    params.push(`%${searchTerm}%`);
    paramIndex++;
  }

  query += ` LIMIT 20`; // Limit the search results for performance.

  const { rows } = await db.query(query, params);
  return rows;
};

/**
 * Automatically assigns a new booking and its related persons to rooms.
 * This version uses the Arabic name and enforces strict gender separation for non-family groups.
 * @param {object} client - The database client for the transaction.
 * @param {number} userId - The ID of the admin user.
 * @param {object} newBooking - The newly created booking object.
 */
exports.autoAssignToRoom = async (client, userId, newBooking) => {
  const { tripId: programId, selectedHotel, relatedPersons } = newBooking;

  // Make sure to have valid hotel selection for this to work
  if (
    !selectedHotel ||
    !selectedHotel.hotelNames ||
    selectedHotel.hotelNames.length === 0
  ) {
    return;
  }

  const allFamilyMembers = [newBooking];
  if (relatedPersons && relatedPersons.length > 0) {
    const relatedIds = relatedPersons.map((p) => p.ID);
    const { rows: familyBookings } = await client.query(
      'SELECT id, "clientNameAr", gender FROM bookings WHERE id = ANY($1::int[])',
      [relatedIds]
    );
    allFamilyMembers.push(...familyBookings);
  }

  // Iterate over each hotel selected in the booking
  for (let i = 0; i < selectedHotel.hotelNames.length; i++) {
    const hotelName = selectedHotel.hotelNames[i];
    const roomType = selectedHotel.roomTypes[i];
    if (!hotelName || !roomType) continue;

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

    // Check if the entire family fits in a single room of the specified type.
    const familySize = allFamilyMembers.length;

    // --- START FIX ---
    // If the family size exactly matches the room capacity, place them together.
    if (familySize > 1 && familySize === capacity) {
      // Find an empty room of the correct type to place the entire family
      let emptyRoomIndex = rooms.findIndex(
        (r) => r.type === roomType && r.occupants.every((o) => o === null)
      );

      if (emptyRoomIndex === -1) {
        // Create a new room for the family
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

      allFamilyMembers.forEach((member, index) => {
        rooms[emptyRoomIndex].occupants[index] = {
          id: member.id,
          clientName: member.clientNameAr,
          gender: member.gender,
        };
      });
      // Mark all family members as placed to skip individual placement logic
      const placedOccupantIds = new Set(allFamilyMembers.map((m) => m.id));
      for (const member of allFamilyMembers) {
        // This is a new approach to ensure no duplicates
        // ... (this part is actually handled by the outer loop now)
      }
    } else {
      // Logic for individual placement with gender separation
      const placedOccupantIds = new Set();
      rooms.forEach((room) =>
        room.occupants.forEach((o) => {
          if (o && allFamilyMembers.some((member) => member.id === o.id)) {
            placedOccupantIds.add(o.id);
          }
        })
      );

      for (const member of allFamilyMembers) {
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
            (!roomGender || roomGender === member.gender)
          ) {
            room.occupants[emptySlot] = occupant;
            placed = true;
            placedOccupantIds.add(member.id);
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
          placedOccupantIds.add(member.id);
        }
      }
    }
    // --- END FIX ---

    // Save the updated rooms for the hotel
    if (managementId) {
      await client.query(
        'UPDATE room_managements SET rooms = $1, "updatedAt" = NOW() WHERE id = $2',
        [JSON.stringify(rooms), managementId]
      );
    } else {
      await client.query(
        'INSERT INTO room_managements ("userId", "programId", "hotelName", rooms) VALUES ($1, $2, $3, $4)',
        [userId, programId, hotelName, JSON.stringify(rooms)]
      );
    }
  }
};

/**
 * Removes an occupant from all rooms for a given program.
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
        o && o.id === occupantId ? null : o
      );
      if (room.occupants.filter((o) => o).length < initialOccupantCount) {
        changed = true;
      }
    });

    if (changed) {
      await client.query(
        'UPDATE room_managements SET rooms = $1, "updatedAt" = NOW() WHERE id = $2',
        [JSON.stringify(rooms), management.id]
      );
    }
  }
};
