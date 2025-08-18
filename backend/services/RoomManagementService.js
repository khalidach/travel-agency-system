// backend/services/RoomManagementService.js
const isEqual = require("fast-deep-equal");
const logger = require("../utils/logger");

/**
 * Fetches a booking and all its related family members with their full booking details.
 * This function correctly identifies the family leader to retrieve all members.
 *
 * @param {object} client - The database client for the transaction.
 * @param {number} userId - The ID of the admin user.
 * @param {number} bookingId - The ID of any booking within the family group.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of all family members' full booking objects.
 */
exports.getFamilyMembers = async (client, userId, bookingId) => {
  // Step 1: Fetch the initial booking to check if it's the leader or a member.
  const initialBookingRes = await client.query(
    'SELECT * FROM bookings WHERE id = $1 AND "userId" = $2',
    [bookingId, userId]
  );

  if (initialBookingRes.rows.length === 0) {
    return []; // Booking not found
  }

  const initialBooking = initialBookingRes.rows[0];
  let leader = initialBooking;

  // Step 2: If the initial booking is not the leader, find the actual leader.
  // A booking is a member if it has no relatedPersons but is listed in another's relatedPersons.
  if (
    !initialBooking.relatedPersons ||
    initialBooking.relatedPersons.length === 0
  ) {
    // FIX: Construct the JSON query object as a string and cast it to jsonb in the query.
    // This avoids the "could not determine data type" error with the node-postgres driver.
    const relatedPersonQueryObject = JSON.stringify([{ ID: bookingId }]);
    const potentialLeaderRes = await client.query(
      `SELECT * FROM bookings
       WHERE "userId" = $1
       AND "tripId" = $2
       AND "relatedPersons" @> $3::jsonb`,
      [userId, initialBooking.tripId, relatedPersonQueryObject]
    );
    if (potentialLeaderRes.rows.length > 0) {
      leader = potentialLeaderRes.rows[0];
    }
  }

  // Step 3: Gather all family member IDs from the leader.
  const familyMemberIds = new Set([leader.id]);
  (leader.relatedPersons || []).forEach((p) => {
    if (p && p.ID) familyMemberIds.add(p.ID);
  });

  // Step 4: Fetch the full details for all family members.
  const familyMembersRes = await client.query(
    `SELECT * FROM bookings WHERE id = ANY($1::int[]) AND "userId" = $2`,
    [Array.from(familyMemberIds), userId]
  );

  return familyMembersRes.rows;
};

/**
 * Recalculates room assignments for a booking and its family members.
 * This function handles family-based allocation, respects individual room choices, and ensures gender separation.
 *
 * @param {object} client - The database client for the transaction.
 * @param {number} userId - The ID of the admin user.
 * @param {object} newBooking - The newly created or updated booking object that triggered the assignment.
 */
exports.autoAssignToRoom = async (client, userId, newBooking) => {
  const { tripId: programId } = newBooking;

  // Fetch the entire family group for the booking
  const members = await exports.getFamilyMembers(client, userId, newBooking.id);
  if (members.length === 0) return;

  // Get a list of all unique cities across all family members' selections
  const allCities = new Set();
  members.forEach((member) => {
    (member.selectedHotel.cities || []).forEach((city) => allCities.add(city));
  });

  // Iterate over each city relevant to the family
  for (const cityName of allCities) {
    // Remove any existing assignments for the family members in this city first to avoid duplicates
    await exports.removeOccupantFromCity(
      client,
      userId,
      programId,
      cityName,
      members.map((m) => m.id)
    );

    // Group members by their chosen hotel and room type in this city
    const membersByHotelAndRoom = members.reduce((acc, member) => {
      const cityIndex = (member.selectedHotel.cities || []).indexOf(cityName);
      if (cityIndex !== -1) {
        const hotelName = (member.selectedHotel.hotelNames || [])[cityIndex];
        const roomType = (member.selectedHotel.roomTypes || [])[cityIndex];
        if (hotelName && roomType) {
          const key = `${hotelName}|${roomType}`;
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(member);
        }
      }
      return acc;
    }, {});

    // Process each group (e.g., all members who chose Room Type 'Triple' in 'Hotel A')
    for (const key in membersByHotelAndRoom) {
      const [hotelName, roomType] = key.split("|");
      const groupOfMembers = membersByHotelAndRoom[key];

      // Fetch room management data for this specific hotel
      const { rows: managementRows } = await client.query(
        'SELECT id, rooms FROM room_managements WHERE "userId" = $1 AND "programId" = $2 AND "hotelName" = $3',
        [userId, programId, hotelName]
      );
      let rooms = managementRows.length > 0 ? managementRows[0].rooms : [];
      const managementId =
        managementRows.length > 0 ? managementRows[0].id : null;

      // Get room capacity for the selected room type
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

      const remainingMembersToPlace = [...groupOfMembers];

      // --- Rule 1: Perfect Family Match ---
      // If the group size perfectly matches the room capacity, place them together.
      if (
        remainingMembersToPlace.length > 1 &&
        remainingMembersToPlace.length === capacity
      ) {
        let emptyRoomIndex = rooms.findIndex(
          (r) => r.type === roomType && r.occupants.every((o) => o === null)
        );

        if (emptyRoomIndex === -1) {
          // Create a new room if no empty one is available
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

        // Assign all members to the room
        remainingMembersToPlace.forEach((member, index) => {
          rooms[emptyRoomIndex].occupants[index] = {
            id: member.id,
            clientName: member.clientNameAr,
            gender: member.gender,
          };
        });
        // Clear the array as everyone has been placed
        remainingMembersToPlace.length = 0;
      }

      // --- Rule 2: Individual Placement for remaining members ---
      for (const member of remainingMembersToPlace) {
        const occupant = {
          id: member.id,
          clientName: member.clientNameAr,
          gender: member.gender,
        };

        let placed = false;

        // Stage 1: Prioritize filling partially occupied rooms with matching gender
        for (const room of rooms) {
          const hasOccupants = room.occupants.length > 0;
          const hasSpace = room.occupants.length < room.capacity;

          if (room.type === roomType && hasOccupants && hasSpace) {
            const roomGender = room.occupants[0]?.gender; // Get gender from the first person in the room
            if (roomGender === member.gender) {
              room.occupants.push(occupant);
              placed = true;
              break;
            }
          }
        }

        if (placed) continue;

        // Stage 2: If no partially filled room is suitable, find a completely empty room
        for (const room of rooms) {
          if (room.type === roomType && room.occupants.length === 0) {
            // This room was created but is now empty. Let's use it.
            room.occupants.push(occupant);
            placed = true;
            break;
          }
        }

        if (placed) continue;

        // Stage 3: If no existing room is suitable, create a new one
        const newRoom = {
          name: `${roomType} ${
            rooms.filter((r) => r.type === roomType).length + 1
          }`,
          type: roomType,
          capacity: capacity,
          occupants: [occupant], // Add the first occupant directly
        };
        rooms.push(newRoom);
      }

      // Save changes for this hotel
      const roomsToSave = rooms.filter((room) => room.occupants.some((o) => o));
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
