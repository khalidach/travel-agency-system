/**
 * Recalculates base price and profit for all bookings related to a program.
 */
const calculateBasePrice = async (
  db,
  userId,
  tripId,
  packageId,
  selectedHotel,
  personType,
  variationName,
) => {
  const { rows: programs } = await db.query(
    'SELECT * FROM programs WHERE id = $1 AND "userId" = $2',
    [tripId, userId],
  );
  if (programs.length === 0)
    throw new Error("Program not found for base price calculation.");
  const program = programs[0];

  let variation = (program.variations || []).find(
    (v) => v.name === variationName,
  );

  if (!variation) {
    if (program.variations && program.variations.length > 0) {
      variation = program.variations[0];
    } else {
      throw new Error(`Variation "${variationName}" not found in program.`);
    }
  }

  // Logic for commission-based programs
  if (program.isCommissionBased) {
    const bookingPackage = (program.packages || []).find(
      (p) => p.name === packageId,
    );
    if (!bookingPackage) return 0;

    const hotelCombination = (selectedHotel.hotelNames || []).join("_");
    const priceStructure = (bookingPackage.prices || []).find(
      (p) => p.hotelCombination === hotelCombination,
    );
    if (!priceStructure) return 0;

    // We assume the first selected room type applies to the entire booking for price calculation.
    const roomTypeName = selectedHotel.roomTypes?.[0];
    if (!roomTypeName) return 0;

    const roomTypeDef = priceStructure.roomTypes.find(
      (rt) => rt.type === roomTypeName,
    );
    if (!roomTypeDef || typeof roomTypeDef.purchasePrice === "undefined")
      return 0;
    return Math.round(Number(roomTypeDef.purchasePrice || 0));
  }

  // Logic for regular (non-commission) programs
  const { rows: pricings } = await db.query(
    'SELECT * FROM program_pricing WHERE "programId" = $1 AND "userId" = $2',
    [tripId, userId],
  );
  if (pricings.length === 0) return 0;
  const pricing = pricings[0];

  let ticketPriceForVariation = Number(pricing.ticketAirline || 0);
  if (
    pricing.ticketPricesByVariation &&
    pricing.ticketPricesByVariation[variationName]
  ) {
    ticketPriceForVariation = Number(
      pricing.ticketPricesByVariation[variationName],
    );
  }

  const personTypeInfo = (pricing.personTypes || []).find(
    (p) => p.type === personType,
  );
  const ticketPercentage = personTypeInfo
    ? personTypeInfo.ticketPercentage / 100
    : 1;

  const ticketPrice = ticketPriceForVariation * ticketPercentage;
  const visaPrice = Number(pricing.visaFees || 0);
  const guidePrice = Number(pricing.guideFees || 0);
  const transportPrice = Number(pricing.transportFees || 0);

  const nonHotelCosts = ticketPrice + visaPrice + guidePrice + transportPrice;

  let hotelCosts = 0;
  const bookingPackage = (program.packages || []).find(
    (p) => p.name === packageId,
  );

  if (
    bookingPackage &&
    selectedHotel &&
    selectedHotel.hotelNames &&
    selectedHotel.hotelNames.some((h) => h)
  ) {
    const hotelCombination = (selectedHotel.hotelNames || []).join("_");
    const priceStructure = (bookingPackage.prices || []).find(
      (p) => p.hotelCombination === hotelCombination,
    );

    if (priceStructure) {
      const guestMap = new Map(
        priceStructure.roomTypes.map((rt) => [rt.type, rt.guests]),
      );

      hotelCosts = (selectedHotel.cities || []).reduce((total, city, index) => {
        const hotelName = selectedHotel.hotelNames[index];
        const roomTypeName = selectedHotel.roomTypes[index];
        const hotelPricingInfo = (pricing.allHotels || []).find(
          (h) => h.name === hotelName && h.city === city,
        );
        const cityInfo = (variation.cities || []).find((c) => c.name === city);

        if (hotelPricingInfo && cityInfo && roomTypeName) {
          const pricePerNight = Number(
            hotelPricingInfo.PricePerNights?.[roomTypeName] || 0,
          );
          const nights = Number(cityInfo.nights || 0);
          const guests = Number(guestMap.get(roomTypeName) || 1);
          if (guests > 0) {
            return total + (pricePerNight * nights) / guests;
          }
        }
        return total;
      }, 0);
    }
  }

  return Math.round(nonHotelCosts + hotelCosts);
};

// Helper to find configured selling price for a specific room type in a package
const getProgramConfiguredPrice = (program, packageId, selectedHotel) => {
  if (!program.packages || !packageId || !selectedHotel) return 0;

  const pkg = program.packages.find((p) => p.name === packageId);
  if (!pkg) return 0;

  // Build hotel combination key (e.g., "HotelA_HotelB")
  const hotelCombination = (selectedHotel.hotelNames || []).join("_");

  const priceStructure = pkg.prices.find(
    (p) => p.hotelCombination === hotelCombination,
  );
  if (!priceStructure) return 0;

  // Get the selected room type
  const roomTypeName = selectedHotel.roomTypes?.[0];
  if (!roomTypeName) return 0;

  const roomConfig = priceStructure.roomTypes.find(
    (rt) => rt.type === roomTypeName,
  );

  return Number(roomConfig?.sellingPrice || 0);
};

module.exports = {
  calculateBasePrice,
  getProgramConfiguredPrice,
};
