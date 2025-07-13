// backend/services/ProgramUpdateService.js

/**
 * Finds differences in package, hotel, and room type names between old and new program versions.
 * @param {object} oldProgram - The program state before the update.
 * @param {object} newProgram - The program state after the update.
 * @returns {{packageRenames: Array, hotelRenames: Array, roomTypeRenames: Array}} - An object containing arrays of renamed items.
 */
function findRenames(oldProgram, newProgram) {
  const packageRenames = [];
  const hotelRenames = [];
  const roomTypeRenames = [];

  // Find package renames
  (oldProgram.packages || []).forEach((oldPkg, index) => {
    const newPkg = (newProgram.packages || [])[index];
    if (newPkg && oldPkg.name !== newPkg.name) {
      packageRenames.push({
        oldName: oldPkg.name,
        newName: newPkg.name,
      });
    }

    if (newPkg) {
      // Find hotel renames within this package
      (oldProgram.cities || []).forEach((city) => {
        const oldHotels = oldPkg.hotels[city.name] || [];
        const newHotels = newPkg.hotels[city.name] || [];
        oldHotels.forEach((oldHotelName, hotelIndex) => {
          const newHotelName = newHotels[hotelIndex];
          if (newHotelName && oldHotelName !== newHotelName) {
            if (
              !hotelRenames.some(
                (h) => h.oldName === oldHotelName && h.newName === newHotelName
              )
            ) {
              hotelRenames.push({
                oldName: oldHotelName,
                newName: newHotelName,
              });
            }
          }
        });
      });

      // Find room type renames
      (oldPkg.prices || []).forEach((oldPrice, priceIndex) => {
        const newPrice = (newPkg.prices || [])[priceIndex];
        if (
          newPrice &&
          oldPrice.hotelCombination === newPrice.hotelCombination
        ) {
          (oldPrice.roomTypes || []).forEach((oldRoomType, roomTypeIndex) => {
            const newRoomType = (newPrice.roomTypes || [])[roomTypeIndex];
            if (newRoomType && oldRoomType.type !== newRoomType.type) {
              if (
                !roomTypeRenames.some(
                  (rt) =>
                    rt.oldName === oldRoomType.type &&
                    rt.newName === newRoomType.type
                )
              ) {
                roomTypeRenames.push({
                  oldName: oldRoomType.type,
                  newName: newRoomType.type,
                });
              }
            }
          });
        }
      });
    }
  });

  return { packageRenames, hotelRenames, roomTypeRenames };
}

/**
 * Handles cascading updates to other tables when a program's package, hotel, or room type names change.
 * This function must be called within a database transaction.
 * @param {object} client - The database client for the transaction.
 * @param {object} oldProgram - The program state before the update.
 * @param {object} newProgram - The program state after the update.
 */
async function handleCascadingUpdates(client, oldProgram, newProgram) {
  const { packageRenames, hotelRenames, roomTypeRenames } = findRenames(
    oldProgram,
    newProgram
  );
  const programId = newProgram.id;
  const userId = newProgram.userId;

  // --- Update Package Names ---
  for (const rename of packageRenames) {
    await client.query(
      'UPDATE bookings SET "packageId" = $1 WHERE "packageId" = $2 AND "tripId" = $3 AND "userId" = $4',
      [rename.newName, rename.oldName, programId, userId]
    );
  }

  // --- Update Hotel Names ---
  if (hotelRenames.length > 0) {
    // 1. Update hotel names in the `allHotels` list within program_pricing.
    const { rows: pricings } = await client.query(
      'SELECT * FROM program_pricing WHERE "programId" = $1 AND "userId" = $2',
      [programId, userId]
    );
    for (const pricing of pricings) {
      let pricingModified = false;
      const newAllHotels = (pricing.allHotels || []).map((hotel) => {
        const rename = hotelRenames.find((r) => r.oldName === hotel.name);
        if (rename) {
          pricingModified = true;
          return { ...hotel, name: rename.newName };
        }
        return hotel;
      });

      if (pricingModified) {
        await client.query(
          'UPDATE program_pricing SET "allHotels" = $1 WHERE id = $2',
          [JSON.stringify(newAllHotels), pricing.id]
        );
      }
    }

    // 2. Update `hotelCombination` strings within the program's own `packages` JSONB.
    let programPackagesModified = false;
    const newProgramPackages = JSON.parse(JSON.stringify(newProgram.packages));
    newProgramPackages.forEach((pkg) => {
      if (pkg.prices) {
        pkg.prices.forEach((price) => {
          let combinationParts = price.hotelCombination.split("_");
          let combinationModified = false;

          const updatedCombinationParts = combinationParts.map((part) => {
            const rename = hotelRenames.find((r) => r.oldName === part);
            if (rename) {
              combinationModified = true;
              return rename.newName;
            }
            return part;
          });

          if (combinationModified) {
            price.hotelCombination = updatedCombinationParts.join("_");
            programPackagesModified = true;
          }
        });
      }
    });

    if (programPackagesModified) {
      await client.query("UPDATE programs SET packages = $1 WHERE id = $2", [
        JSON.stringify(newProgramPackages),
        programId,
      ]);
    }

    // 3. Update hotel names in the `selectedHotel` object for each booking.
    const { rows: bookings } = await client.query(
      'SELECT id, "selectedHotel" FROM bookings WHERE "tripId" = $1 AND "userId" = $2',
      [programId, userId]
    );
    for (const booking of bookings) {
      let bookingModified = false;
      const newSelectedHotel = { ...booking.selectedHotel };
      newSelectedHotel.hotelNames = (newSelectedHotel.hotelNames || []).map(
        (hotelName) => {
          const rename = hotelRenames.find((r) => r.oldName === hotelName);
          if (rename) {
            bookingModified = true;
            return rename.newName;
          }
          return hotelName;
        }
      );

      if (bookingModified) {
        await client.query(
          'UPDATE bookings SET "selectedHotel" = $1 WHERE id = $2',
          [JSON.stringify(newSelectedHotel), booking.id]
        );
      }
    }

    // 4. Update hotel names in the room_managements table.
    for (const rename of hotelRenames) {
      await client.query(
        'UPDATE room_managements SET "hotelName" = $1 WHERE "hotelName" = $2 AND "programId" = $3 AND "userId" = $4',
        [rename.newName, rename.oldName, programId, userId]
      );
    }
  }

  // --- Update Room Type Names ---
  if (roomTypeRenames.length > 0) {
    // 1. Update room type keys in `program_pricing.allHotels.PricePerNights`.
    const { rows: pricings } = await client.query(
      'SELECT * FROM program_pricing WHERE "programId" = $1 AND "userId" = $2',
      [programId, userId]
    );
    for (const pricing of pricings) {
      let pricingModified = false;
      const newAllHotels = (pricing.allHotels || []).map((hotel) => {
        const newPricePerNights = {};
        if (hotel.PricePerNights) {
          for (const roomType in hotel.PricePerNights) {
            const rename = roomTypeRenames.find((r) => r.oldName === roomType);
            if (rename) {
              newPricePerNights[rename.newName] =
                hotel.PricePerNights[roomType];
              pricingModified = true;
            } else {
              newPricePerNights[roomType] = hotel.PricePerNights[roomType];
            }
          }
        }
        return { ...hotel, PricePerNights: newPricePerNights };
      });
      if (pricingModified) {
        await client.query(
          'UPDATE program_pricing SET "allHotels" = $1 WHERE id = $2',
          [JSON.stringify(newAllHotels), pricing.id]
        );
      }
    }

    // 2. Update room type names in `bookings.selectedHotel.roomTypes` array.
    const { rows: bookings } = await client.query(
      'SELECT id, "selectedHotel" FROM bookings WHERE "tripId" = $1 AND "userId" = $2',
      [programId, userId]
    );
    for (const booking of bookings) {
      let bookingModified = false;
      const newSelectedHotel = { ...booking.selectedHotel };
      newSelectedHotel.roomTypes = (newSelectedHotel.roomTypes || []).map(
        (roomType) => {
          const rename = roomTypeRenames.find((r) => r.oldName === roomType);
          if (rename) {
            bookingModified = true;
            return rename.newName;
          }
          return roomType;
        }
      );
      if (bookingModified) {
        await client.query(
          'UPDATE bookings SET "selectedHotel" = $1 WHERE id = $2',
          [JSON.stringify(newSelectedHotel), booking.id]
        );
      }
    }

    // 3. Update room type names in `room_managements.rooms` array.
    const { rows: roomManagements } = await client.query(
      'SELECT id, rooms FROM room_managements WHERE "programId" = $1 AND "userId" = $2',
      [programId, userId]
    );
    for (const management of roomManagements) {
      let managementModified = false;
      const newRooms = (management.rooms || []).map((room) => {
        const rename = roomTypeRenames.find((r) => r.oldName === room.type);
        if (rename) {
          managementModified = true;
          return { ...room, type: rename.newName };
        }
        return room;
      });
      if (managementModified) {
        await client.query(
          "UPDATE room_managements SET rooms = $1 WHERE id = $2",
          [JSON.stringify(newRooms), management.id]
        );
      }
    }
  }
}

module.exports = {
  handleCascadingUpdates,
};
