// backend/controllers/programPricingController.js

const getGuestsPerRoom = (roomType) => {
  if (!roomType) return 2;
  switch (roomType.toLowerCase()) {
    case "double": return 2;
    case "triple": return 3;
    case "quad": return 4;
    case "quintuple": return 5;
    default: return 2;
  }
};

exports.getAllProgramPricing = async (req, res) => {
try {
  const { rows } = await req.db.query('SELECT * FROM program_pricing WHERE "userId" = $1', [req.user.id]);
  res.json(rows);
} catch (error) {
  console.error('Get All Pricing Error:', error);
  res.status(500).json({ message: error.message });
}
};

exports.createProgramPricing = async (req, res) => {
  const { programId, selectProgram, ticketAirline, visaFees, guideFees, allHotels } = req.body;
try {
  const { rows } = await req.db.query(
      'INSERT INTO program_pricing ("userId", "programId", "selectProgram", "ticketAirline", "visaFees", "guideFees", "allHotels") VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.user.id, programId, selectProgram, ticketAirline, visaFees, guideFees, JSON.stringify(allHotels)]
  );
  res.status(201).json(rows[0]);
} catch (error) {
  console.error('Create Pricing Error:', error);
  res.status(400).json({ message: error.message });
}
};

exports.updateProgramPricing = async (req, res) => {
  const { id } = req.params;
  const { programId, selectProgram, ticketAirline, visaFees, guideFees, allHotels } = req.body;
try {
  const { rows: updatedPricingRows } = await req.db.query(
      'UPDATE program_pricing SET "programId" = $1, "selectProgram" = $2, "ticketAirline" = $3, "visaFees" = $4, "guideFees" = $5, "allHotels" = $6, "updatedAt" = NOW() WHERE id = $7 AND "userId" = $8 RETURNING *',
      [programId, selectProgram, ticketAirline, visaFees, guideFees, JSON.stringify(allHotels), id, req.user.id]
  );

  if (updatedPricingRows.length === 0) {
      return res.status(404).json({ message: 'Program pricing not found or user not authorized' });
  }

  const updatedProgramPricing = updatedPricingRows[0];
  const { rows: relatedBookings } = await req.db.query('SELECT * FROM bookings WHERE "tripId" = $1 AND "userId" = $2', [updatedProgramPricing.programId, req.user.id]);

  if (relatedBookings.length > 0) {
      const updatePromises = relatedBookings.map(booking => {
          const hotelCosts = booking.selectedHotel.cities.reduce((total, city, index) => {
              const hotelName = booking.selectedHotel.hotelNames[index];
              const roomType = booking.selectedHotel.roomType;
              const hotelPricingInfo = updatedProgramPricing.allHotels.find(h => h.name === hotelName && h.city === city);
              if (hotelPricingInfo) {
                  const pricePerNight = hotelPricingInfo.PricePerNights[roomType.toLowerCase()];
                  const nights = hotelPricingInfo.nights;
                  if(pricePerNight != null && nights) {
                      return total + (pricePerNight * nights) / getGuestsPerRoom(roomType);
                  }
              }
              return total;
          }, 0);
          const newBasePrice = Math.round(updatedProgramPricing.ticketAirline + updatedProgramPricing.visaFees + updatedProgramPricing.guideFees + hotelCosts);
          const newProfit = booking.sellingPrice - newBasePrice;
          return req.db.query('UPDATE bookings SET "basePrice" = $1, profit = $2 WHERE id = $3', [newBasePrice, newProfit, booking.id]);
      });
      await Promise.all(updatePromises);
  }
  res.json(updatedProgramPricing);
} catch (error) {
  console.error('Update Pricing Error:', error);
  res.status(400).json({ message: error.message });
}
};

exports.deleteProgramPricing = async (req, res) => {
const { id } = req.params;
try {
  const { rowCount } = await req.db.query('DELETE FROM program_pricing WHERE id = $1 AND "userId" = $2', [id, req.user.id]);
  if (rowCount === 0) {
      return res.status(404).json({ message: 'Program pricing not found or user not authorized' });
  }
  res.json({ message: 'Program pricing deleted successfully' });
} catch (error) {
  console.error('Delete Pricing Error:', error);
  res.status(500).json({ message: error.message });
}
};
