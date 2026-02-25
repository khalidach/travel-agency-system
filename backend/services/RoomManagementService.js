// backend/services/RoomManagementService.js
const RoomRepository = require("./room/RoomRepository");
const FamilyHandler = require("./room/FamilyHandler");
const AutoAssigner = require("./room/AutoAssigner");
const logger = require("../utils/logger");

/**
 * Main RoomManagementService Facade.
 * Orchestrates sub-services for room management operations.
 */

/**
 * Fetches a booking and all its related family members.
 */
exports.getFamilyMembers = async (client, userId, bookingId) => {
  return await FamilyHandler.getFamilyMembers(client, userId, bookingId);
};

/**
 * Auto-assigns a booking and its family to rooms.
 */
exports.autoAssignToRoom = async (client, userId, newBooking) => {
  const { tripId: programId } = newBooking;

  // 1. Get all members
  const members = await FamilyHandler.getFamilyMembers(
    client,
    userId,
    newBooking.id,
  );
  if (members.length === 0) return;

  // 2. Clean slate: Remove existing assignments for this family
  await exports.removeOccupantFromRooms(
    client,
    userId,
    programId,
    newBooking.id,
  );

  // 3. Group by Hotel
  const membersByHotel = FamilyHandler.groupMembersByHotel(members);

  // 4. Process each hotel
  for (const hotelName in membersByHotel) {
    const membersInHotel = membersByHotel[hotelName];

    // Fetch Program Data for Pricing/Capacity logic
    // Optimization: Could cache this if program is large, but currently fetching per hotel loop
    const programResult = await client.query(
      "SELECT packages FROM programs WHERE id = $1",
      [programId],
    );
    const program = programResult.rows[0];

    // Fetch Room State
    const { id: managementId, rooms } = await RoomRepository.getRoomsForHotel(
      client,
      userId,
      programId,
      hotelName,
    );

    // Ensure rooms have padded occupant arrays
    rooms.forEach((room) => {
      const occupantsCount = room.occupants.length;
      if (occupantsCount < room.capacity) {
        room.occupants.push(
          ...Array(room.capacity - occupantsCount).fill(null),
        );
      }
    });

    // Group by Room Type
    const membersByRoomType = FamilyHandler.groupMembersByRoomType(
      membersInHotel,
      hotelName,
    );

    // Apply Assignment Logic
    for (const roomType in membersByRoomType) {
      const groupOfMembers = membersByRoomType[roomType];
      const capacity = AutoAssigner.getCapacityForRoomType(program, roomType);

      AutoAssigner.processRoomTypeGroup(
        rooms,
        roomType,
        groupOfMembers,
        capacity,
      );
    }

    // Save State
    await RoomRepository.saveRooms(
      client,
      userId,
      programId,
      hotelName,
      rooms,
      managementId,
    );
  }
};

/**
 * Removes occupant from a specific city's hotels.
 */
exports.removeOccupantFromCity = async (
  client,
  userId,
  programId,
  cityName,
  occupantIds,
) => {
  const allManagements = await RoomRepository.getAllForProgram(
    client,
    userId,
    programId,
  );

  // Identify which hotels belong to the city
  const cityHotelsResult = await client.query(
    "SELECT jsonb_array_elements(packages)->'hotels'->>$1 AS hotel_name FROM programs WHERE id = $2 AND \"userId\" = $3",
    [cityName, programId, userId],
  );
  const cityHotelNames = new Set(
    cityHotelsResult.rows.map((row) => row.hotel_name),
  );

  for (const management of allManagements) {
    if (cityHotelNames.has(management.hotelName)) {
      let rooms = management.rooms;
      let changed = false;

      rooms.forEach((room) => {
        const originalCount = room.occupants.filter(Boolean).length;
        room.occupants = room.occupants.map((o) =>
          o && occupantIds.includes(o.id) ? null : o,
        );
        if (room.occupants.filter(Boolean).length < originalCount)
          changed = true;
      });

      if (changed) {
        await RoomRepository.saveRooms(
          client,
          userId,
          programId,
          management.hotelName,
          rooms,
          management.id,
        );
      }
    }
  }
};

/**
 * Removes an occupant and their family from ALL rooms in the program.
 */
exports.removeOccupantFromRooms = async (
  client,
  userId,
  programId,
  occupantId,
) => {
  const allBookings = await FamilyHandler.getFamilyMembers(
    client,
    userId,
    occupantId,
  );
  if (allBookings.length === 0) return;
  const occupantIds = allBookings.map((b) => b.id);

  const allManagements = await RoomRepository.getAllForProgram(
    client,
    userId,
    programId,
  );

  for (const management of allManagements) {
    let rooms = management.rooms;
    let changed = false;

    rooms.forEach((room) => {
      const initialCount = room.occupants.filter(Boolean).length;
      room.occupants = room.occupants.map((o) =>
        o && occupantIds.includes(o.id) ? null : o,
      );
      if (room.occupants.filter(Boolean).length < initialCount) changed = true;
    });

    if (changed) {
      await RoomRepository.saveRooms(
        client,
        userId,
        programId,
        management.hotelName,
        rooms,
        management.id,
      );
    }
  }
};

/**
 * Gets rooms for a specific hotel (Delegates to Repo).
 */
exports.getRooms = async (db, userId, programId, hotelName) => {
  const { rooms } = await RoomRepository.getRoomsForHotel(
    db,
    userId,
    programId,
    hotelName,
  );
  return rooms;
};

/**
 * Saves rooms for a specific hotel (Delegates to Repo).
 */
exports.saveRooms = async (db, userId, programId, hotelName, rooms) => {
  const savedRooms = await RoomRepository.saveRooms(
    db,
    userId,
    programId,
    hotelName,
    rooms,
  );

  try {
    const assignments = [];
    savedRooms.forEach((room) => {
      (room.occupants || []).forEach((occupant) => {
        if (occupant && occupant.id) {
          assignments.push({ bookingId: occupant.id, roomType: room.type });
        }
      });
    });

    if (assignments.length > 0) {
      const bookingIds = assignments.map((a) => a.bookingId);
      const { rows: bookings } = await db.query(
        'SELECT id, "selectedHotel" FROM bookings WHERE id = ANY($1::int[]) AND "userId" = $2',
        [bookingIds, userId],
      );

      for (const booking of bookings) {
        const assignment = assignments.find((a) => a.bookingId === booking.id);
        if (!assignment || !booking.selectedHotel) continue;

        let changed = false;
        const updatedSelectedHotel = JSON.parse(
          JSON.stringify(booking.selectedHotel),
        );

        const hotelNames = updatedSelectedHotel.hotelNames || [];
        const roomTypes = updatedSelectedHotel.roomTypes || [];

        const hotelIndex = hotelNames.findIndex((name) => name === hotelName);

        if (hotelIndex !== -1) {
          while (roomTypes.length <= hotelIndex) {
            roomTypes.push(null);
          }
          if (roomTypes[hotelIndex] !== assignment.roomType) {
            roomTypes[hotelIndex] = assignment.roomType;
            updatedSelectedHotel.roomTypes = roomTypes;
            changed = true;
          }
        }

        if (changed) {
          await db.query(
            'UPDATE bookings SET "selectedHotel" = $1 WHERE id = $2',
            [JSON.stringify(updatedSelectedHotel), booking.id],
          );
        }
      }
    }
  } catch (error) {
    logger.error("Failed to sync room assignments to bookings:", error);
  }

  return savedRooms;
};

/**
 * Searches unassigned occupants.
 */
exports.searchUnassignedOccupants = async (
  db,
  userId,
  programId,
  hotelName,
  searchTerm,
) => {
  const assignedIds = await RoomRepository.getAssignedOccupantIds(
    db,
    userId,
    programId,
    hotelName,
  );

  let query = `
    SELECT id, COALESCE(
      NULLIF("clientNameAr", ''),
      CONCAT_WS(' ', "clientNameFr"->>'firstName', "clientNameFr"->>'lastName')
    ) as "clientName"
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
    query += ` AND ("clientNameFr"->>'firstName' ILIKE $${paramIndex} OR "clientNameFr"->>'lastName' ILIKE $${paramIndex} OR "clientNameAr" ILIKE $${paramIndex})`;
    params.push(`%${searchTerm}%`);
    paramIndex++;
  }

  query += ` LIMIT 20`;

  const { rows } = await db.query(query, params);
  return rows;
};

/**
 * Checks if any booking is assigned (Delegates to Repo).
 */
exports.checkIfAnyAssigned = async (client, userId, programId, bookingIds) => {
  return await RoomRepository.areBookingsAssigned(
    client,
    userId,
    programId,
    bookingIds,
  );
};

/**
 * Checks if family is fully assigned.
 */
exports.isFamilyFullyAssigned = async (client, userId, programId, booking) => {
  const familyMembers = await FamilyHandler.getFamilyMembers(
    client,
    userId,
    booking.id,
  );
  if (familyMembers.length === 0) return false;

  const familyMemberIds = new Set(familyMembers.map((m) => m.id));
  const requiredHotels = (booking.selectedHotel?.hotelNames || []).filter(
    (h) => h,
  );
  if (requiredHotels.length === 0) return true;

  const allRoomManagements = await RoomRepository.getAllForProgram(
    client,
    userId,
    programId,
  );
  const assignmentsByHotel = new Map();

  allRoomManagements.forEach((mgmt) => {
    const assignedIdsInHotel = new Set();
    (mgmt.rooms || []).forEach((room) => {
      (room.occupants || []).forEach((occupant) => {
        if (occupant && occupant.id) assignedIdsInHotel.add(occupant.id);
      });
    });
    assignmentsByHotel.set(mgmt.hotelName, assignedIdsInHotel);
  });

  for (const hotelName of requiredHotels) {
    const assignedInThisHotel = assignmentsByHotel.get(hotelName);
    if (!assignedInThisHotel) return false;
    for (const memberId of familyMemberIds) {
      if (!assignedInThisHotel.has(memberId)) return false;
    }
  }

  return true;
};
