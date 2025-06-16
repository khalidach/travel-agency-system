// backend/controllers/programPricingController.js

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
      [req.user.id, programId, selectProgram, ticketAirline, visaFees, guideFees, JSON.stringify(allHotels || [])]
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
  const client = await req.db.connect();

  try {
    await client.query('BEGIN');

    const { rows: updatedPricingRows } = await client.query(
      'UPDATE program_pricing SET "programId" = $1, "selectProgram" = $2, "ticketAirline" = $3, "visaFees" = $4, "guideFees" = $5, "allHotels" = $6, "updatedAt" = NOW() WHERE id = $7 AND "userId" = $8 RETURNING *',
      [programId, selectProgram, ticketAirline, visaFees, guideFees, JSON.stringify(allHotels || []), id, req.user.id]
    );

    if (updatedPricingRows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ message: 'Program pricing not found or user not authorized' });
    }

    const updatedProgramPricing = updatedPricingRows[0];

    // Fetch the full program details to get guest counts
    const { rows: programs } = await client.query('SELECT * FROM programs WHERE id = $1 AND "userId" = $2', [programId, req.user.id]);
    const program = programs[0];

    if (!program) {
        // This case should ideally not happen if data is consistent
        await client.query('ROLLBACK');
        client.release();
        return res.status(404).json({ message: 'Associated program not found.' });
    }

    const { rows: relatedBookings } = await client.query('SELECT * FROM bookings WHERE "tripId" = $1 AND "userId" = $2', [updatedProgramPricing.programId, req.user.id]);

    if (relatedBookings.length > 0) {
      const updatePromises = relatedBookings.map(booking => {
        // Find the correct package and price structure for this specific booking
        const bookingPackage = (program.packages || []).find(p => p.name === booking.packageId);
        if (!bookingPackage) return Promise.resolve(); // Skip if package not found

        const hotelCombination = (booking.selectedHotel.hotelNames || []).join('_');
        const priceStructure = (bookingPackage.prices || []).find(p => p.hotelCombination === hotelCombination);
        if (!priceStructure) return Promise.resolve(); // Skip if hotel combination not found

        // Create a map of room types to guest counts for this specific structure
        const guestMap = new Map(priceStructure.roomTypes.map(rt => [rt.type, rt.guests]));

        const hotelCosts = (booking.selectedHotel.cities || []).reduce((total, city, index) => {
          const hotelName = booking.selectedHotel.hotelNames[index];
          const roomTypeName = booking.selectedHotel.roomTypes[index];

          const hotelPricingInfo = (updatedProgramPricing.allHotels || []).find(h => h.name === hotelName && h.city === city);
          const cityInfo = (program.cities || []).find(c => c.name === city);
          
          if (hotelPricingInfo && cityInfo && roomTypeName) {
            const pricePerNight = Number(hotelPricingInfo.PricePerNights?.[roomTypeName] || 0);
            const nights = Number(cityInfo.nights || 0);
            const guests = Number(guestMap.get(roomTypeName) || 1);

            if (guests > 0) {
              return total + (pricePerNight * nights) / guests;
            }
          }
          return total;
        }, 0);

        const ticketPrice = Number(updatedProgramPricing.ticketAirline || 0);
        const visaPrice = Number(updatedProgramPricing.visaFees || 0);
        const guidePrice = Number(updatedProgramPricing.guideFees || 0);

        const newBasePrice = Math.round(ticketPrice + visaPrice + guidePrice + hotelCosts);
        const newProfit = Number(booking.sellingPrice || 0) - newBasePrice;
        const totalPaid = (booking.advancePayments || []).reduce((sum, p) => sum + p.amount, 0);
        const newRemainingBalance = Number(booking.sellingPrice || 0) - totalPaid;

        return client.query(
          'UPDATE bookings SET "basePrice" = $1, profit = $2, "remainingBalance" = $3 WHERE id = $4',
          [newBasePrice, newProfit, newRemainingBalance, booking.id]
        );
      });
      await Promise.all(updatePromises);
    }
    
    await client.query('COMMIT');
    res.json(updatedProgramPricing);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update Pricing Error:', error);
    res.status(400).json({ message: error.message });
  } finally {
    client.release();
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