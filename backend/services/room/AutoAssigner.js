/**
 * Contains the core algorithms for assigning occupants to rooms.
 */
class AutoAssigner {
  /**
   * Determines the capacity of a room type based on the program configuration.
   */
  static getCapacityForRoomType(program, roomType) {
    let capacity = 2; // Default
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
    return capacity;
  }

  /**
   * Helper to find or create a room for a specific type.
   */
  static findOrCreateRoom(rooms, roomType, capacity) {
    // 1. Try to find an existing empty room (perfect match logic reuse)
    let emptyRoomIndex = rooms.findIndex(
      (r) => r.type === roomType && r.occupants.every((o) => o === null),
    );

    if (emptyRoomIndex !== -1) {
      return rooms[emptyRoomIndex];
    }

    // 2. Create new room
    let maxNum = 0;
    rooms.forEach((r) => {
      if (r.type === roomType) {
        const match = r.name.match(/\s(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });

    const newRoom = {
      name: `${roomType} ${maxNum + 1}`,
      type: roomType,
      capacity: capacity,
      occupants: Array(capacity).fill(null),
    };
    rooms.push(newRoom);
    return newRoom;
  }

  /**
   * Processes a group of members for a specific room type and assigns them to rooms.
   */
  static processRoomTypeGroup(rooms, roomType, groupOfMembers, capacity) {
    const remainingMembers = [...groupOfMembers];

    // Rule 1: Perfect Family Match (Entire family fits exactly in one room)
    if (remainingMembers.length > 1 && remainingMembers.length === capacity) {
      const targetRoom = this.findOrCreateRoom(rooms, roomType, capacity);

      // Clear current occupants just in case (though it should be empty based on logic)
      targetRoom.occupants.fill(null);

      remainingMembers.forEach((member, index) => {
        targetRoom.occupants[index] = {
          id: member.id,
          clientName: member.clientNameAr,
          gender: member.gender,
        };
      });
      return; // Done for this group
    }

    // Rule 2: Grouped Placement by Gender
    const membersByGender = remainingMembers.reduce((acc, member) => {
      const gender = member.gender || "unknown";
      if (!acc[gender]) acc[gender] = [];
      acc[gender].push(member);
      return acc;
    }, {});

    for (const gender in membersByGender) {
      if (gender === "unknown") continue;

      const genderGroup = membersByGender[gender];
      const groupSize = genderGroup.length;
      let placed = false;

      // A. Attempt to place into ONE existing room with space
      for (const room of rooms) {
        const occupants = room.occupants.filter((o) => o);
        const roomGender = occupants.length > 0 ? occupants[0].gender : null;
        const emptySlots = room.capacity - occupants.length;

        if (
          room.type === roomType &&
          (!roomGender || roomGender === gender) &&
          emptySlots >= groupSize
        ) {
          genderGroup.forEach((member) => {
            const emptySlotIndex = room.occupants.findIndex((o) => !o);
            if (emptySlotIndex !== -1) {
              room.occupants[emptySlotIndex] = {
                id: member.id,
                clientName: member.clientNameAr,
                gender: member.gender,
              };
            }
          });
          placed = true;
          break;
        }
      }

      // B. If not placed, create new room(s)
      if (!placed) {
        const membersToPlace = [...genderGroup];
        while (membersToPlace.length > 0) {
          const newRoom = this.findOrCreateRoom(rooms, roomType, capacity);
          const membersForNewRoom = membersToPlace.splice(0, capacity);

          membersForNewRoom.forEach((member, index) => {
            newRoom.occupants[index] = {
              id: member.id,
              clientName: member.clientNameAr,
              gender: member.gender,
            };
          });
        }
      }
    }
  }
}

module.exports = AutoAssigner;
