const ProgramPricing = require('../models/programPricingModel');
const Booking = require('../models/bookingModel');
const Program = require('../models/programModel');

// Helper function to get the number of guests per room type
const getGuestsPerRoom = (roomType) => {
    switch (roomType.toLowerCase()) {
      case "double": return 2;
      case "triple": return 3;
      case "quad": return 4;
      case "quintuple": return 5;
      default: return 2;
    }
};

// Get all program pricing
exports.getAllProgramPricing = async (req, res) => {
  try {
    const programPricing = await ProgramPricing.find();
    res.json(programPricing);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new program pricing
exports.createProgramPricing = async (req, res) => {
  try {
    const programPricing = new ProgramPricing(req.body);
    const newProgramPricing = await programPricing.save();
    res.status(201).json(newProgramPricing);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update a program pricing and all associated bookings
exports.updateProgramPricing = async (req, res) => {
  try {
    const updatedProgramPricing = await ProgramPricing.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedProgramPricing) {
      return res.status(404).json({ message: 'Program pricing not found' });
    }

    // After updating the pricing, find and update all related bookings
    const programId = updatedProgramPricing.programId.toString();
    const relatedBookings = await Booking.find({ tripId: programId });
    const program = await Program.findById(programId);

    if (program && relatedBookings.length > 0) {
        const updatePromises = relatedBookings.map(booking => {
            // Recalculate hotel costs for the booking
            const hotelCosts = booking.selectedHotel.cities.reduce((total, city, index) => {
                const hotelName = booking.selectedHotel.hotelNames[index];
                const roomType = booking.selectedHotel.roomType.toLowerCase();
                const hotelPricingInfo = updatedProgramPricing.allHotels.find(h => h.name === hotelName && h.city === city);
                
                if (hotelPricingInfo) {
                    const pricePerNight = hotelPricingInfo.PricePerNights[roomType];
                    const nights = hotelPricingInfo.nights;
                    if(pricePerNight && nights) {
                        const guestsPerRoom = getGuestsPerRoom(roomType);
                        return total + (pricePerNight * nights) / guestsPerRoom;
                    }
                }
                return total;
            }, 0);

            // Recalculate the total base price
            const newBasePrice = Math.round(
                updatedProgramPricing.ticketAirline +
                updatedProgramPricing.visaFees +
                updatedProgramPricing.guideFees +
                hotelCosts
            );

            // Update booking fields
            booking.basePrice = newBasePrice;
            booking.profit = booking.sellingPrice - newBasePrice;
            
            // The pre-save hook on the Booking model will handle remainingBalance
            return booking.save();
        });

        await Promise.all(updatePromises);
    }
    
    res.json(updatedProgramPricing);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


// Delete a program pricing
exports.deleteProgramPricing = async (req, res) => {
  try {
    const programPricing = await ProgramPricing.findByIdAndDelete(req.params.id);
    if (!programPricing) {
      return res.status(404).json({ message: 'Program pricing not found' });
    }
    res.json({ message: 'Program pricing deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};