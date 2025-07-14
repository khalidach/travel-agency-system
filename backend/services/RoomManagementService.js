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
