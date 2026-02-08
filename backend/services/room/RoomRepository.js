const logger = require("../../utils/logger");

/**
 * Manages direct database operations for the room_managements table.
 */
class RoomRepository {
  /**
   * Fetches the room configuration for a specific hotel in a program.
   */
  static async getRoomsForHotel(client, userId, programId, hotelName) {
    const { rows } = await client.query(
      'SELECT id, rooms FROM room_managements WHERE "userId" = $1 AND "programId" = $2 AND "hotelName" = $3',
      [userId, programId, hotelName],
    );
    return rows.length > 0
      ? { id: rows[0].id, rooms: rows[0].rooms }
      : { id: null, rooms: [] };
  }

  /**
   * Saves or deletes room configurations based on occupancy.
   */
  static async saveRooms(
    client,
    userId,
    programId,
    hotelName,
    rooms,
    managementId = null,
  ) {
    // Sanitize: Filter out null occupants
    const sanitizedRooms = rooms
      .map((room) => ({
        ...room,
        occupants: room.occupants.filter((o) => o !== null),
      }))
      .filter((room) => room.occupants.length > 0); // Remove completely empty rooms if desired, or keep them if policy dictates

    if (sanitizedRooms.length === 0) {
      // If no rooms left, delete the record
      if (managementId) {
        await client.query("DELETE FROM room_managements WHERE id = $1", [
          managementId,
        ]);
      } else {
        await client.query(
          'DELETE FROM room_managements WHERE "userId" = $1 AND "programId" = $2 AND "hotelName" = $3',
          [userId, programId, hotelName],
        );
      }
      return [];
    }

    // Upsert logic
    if (managementId) {
      await client.query(
        'UPDATE room_managements SET rooms = $1, "updatedAt" = NOW() WHERE id = $2',
        [JSON.stringify(sanitizedRooms), managementId],
      );
    } else {
      await client.query(
        'INSERT INTO room_managements ("userId", "programId", "hotelName", rooms) VALUES ($1, $2, $3, $4) ON CONFLICT ("userId", "programId", "hotelName") DO UPDATE SET rooms = $4, "updatedAt" = NOW()',
        [userId, programId, hotelName, JSON.stringify(sanitizedRooms)],
      );
    }
    return sanitizedRooms;
  }

  /**
   * Checks if any of the provided booking IDs are assigned to a room.
   */
  static async areBookingsAssigned(client, userId, programId, bookingIds) {
    if (!bookingIds || bookingIds.length === 0) return false;
    const { rows } = await client.query(
      `SELECT EXISTS (
            SELECT 1 FROM room_managements
            WHERE "userId" = $1 AND "programId" = $2
            AND EXISTS (
                SELECT 1 FROM jsonb_array_elements(rooms) as r, jsonb_array_elements(r->'occupants') as o
                WHERE (o->>'id')::int = ANY($3::int[])
            )
        ) AS is_assigned`,
      [userId, programId, bookingIds],
    );
    return rows[0].is_assigned;
  }

  /**
   * Fetches all room management records for a program (used for bulk removal).
   */
  static async getAllForProgram(client, userId, programId) {
    const { rows } = await client.query(
      'SELECT id, rooms, "hotelName" FROM room_managements WHERE "userId" = $1 AND "programId" = $2',
      [userId, programId],
    );
    return rows;
  }

  /**
   * Searches for assigned occupant IDs to exclude them from search results.
   */
  static async getAssignedOccupantIds(client, userId, programId, hotelName) {
    const assignedResult = await client.query(
      `SELECT jsonb_path_query(rooms, '$[*].occupants[*].id') as id
       FROM room_managements
       WHERE "userId" = $1 AND "programId" = $2 AND "hotelName" = $3`,
      [userId, programId, hotelName],
    );
    return new Set(assignedResult.rows.map((r) => parseInt(r.id, 10)));
  }
}

module.exports = RoomRepository;
