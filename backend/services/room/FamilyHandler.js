/**
 * Manages the retrieval and grouping of family members/bookings.
 */
class FamilyHandler {
  /**
   * Retrieves the full booking details for a family group based on any member's ID.
   */
  static async getFamilyMembers(client, userId, bookingId) {
    // 1. Fetch initial booking
    const initialBookingRes = await client.query(
      'SELECT * FROM bookings WHERE id = $1 AND "userId" = $2',
      [bookingId, userId],
    );

    if (initialBookingRes.rows.length === 0) return [];

    const initialBooking = initialBookingRes.rows[0];
    let leader = initialBooking;

    // 2. Resolve Leader if current is not leader
    if (
      !initialBooking.relatedPersons ||
      initialBooking.relatedPersons.length === 0
    ) {
      const relatedPersonQueryObject = JSON.stringify([{ ID: bookingId }]);
      const potentialLeaderRes = await client.query(
        `SELECT * FROM bookings
         WHERE "userId" = $1 AND "tripId" = $2 AND "relatedPersons" @> $3::jsonb`,
        [userId, initialBooking.tripId, relatedPersonQueryObject],
      );
      if (potentialLeaderRes.rows.length > 0) {
        leader = potentialLeaderRes.rows[0];
      }
    }

    // 3. Collect IDs
    const familyMemberIds = new Set([leader.id]);
    (leader.relatedPersons || []).forEach((p) => {
      if (p && p.ID) familyMemberIds.add(p.ID);
    });

    // 4. Fetch all members
    const familyMembersRes = await client.query(
      `SELECT * FROM bookings WHERE id = ANY($1::int[]) AND "userId" = $2`,
      [Array.from(familyMemberIds), userId],
    );

    return familyMembersRes.rows;
  }

  /**
   * Groups an array of members by their selected hotel.
   */
  static groupMembersByHotel(members) {
    return members.reduce((acc, member) => {
      (member.selectedHotel.cities || []).forEach((city, cityIndex) => {
        const hotelName = (member.selectedHotel.hotelNames || [])[cityIndex];
        if (hotelName) {
          if (!acc[hotelName]) acc[hotelName] = [];
          acc[hotelName].push(member);
        }
      });
      return acc;
    }, {});
  }

  /**
   * Groups members within a specific hotel context by their selected room type.
   */
  static groupMembersByRoomType(membersInHotel, hotelName) {
    return membersInHotel.reduce((acc, member) => {
      const cityIndex = (member.selectedHotel.cities || []).findIndex(
        (city) => {
          const hotelForCity = (member.selectedHotel.hotelNames || [])[
            (member.selectedHotel.cities || []).indexOf(city)
          ];
          return hotelForCity === hotelName;
        },
      );

      if (cityIndex !== -1) {
        const roomType = (member.selectedHotel.roomTypes || [])[cityIndex];
        if (roomType) {
          if (!acc[roomType]) acc[roomType] = [];
          acc[roomType].push(member);
        }
      }
      return acc;
    }, {});
  }
}

module.exports = FamilyHandler;
