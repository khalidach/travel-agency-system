// backend/controllers/programPricingController.js
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

// Get all program pricing for the logged-in user
exports.getAllProgramPricing = async (req, res) => {
  try {
    const programPricing = await ProgramPricing.find({ user: req.user.id });
    res.json(programPricing);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new program pricing for the logged-in user
exports.createProgramPricing = async (req, res) => {
  try {
    const programPricing = new ProgramPricing({
      ...req.body,
      user: req.user.id
    });
    const newProgramPricing = await programPricing.save();
    res.status(201).json(newProgramPricing);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update a program pricing and all associated bookings
exports.updateProgramPricing = async (req, res) => {
  try {
    const pricing = await ProgramPricing.findById(req.params.id);

    if (!pricing) {
        return res.status(404).json({ message: 'Program pricing not found' });
    }

    if (pricing.user.toString() !== req.user.id) {
        return res.status(401).json({ message: 'User not authorized' });
    }
    
    const updatedProgramPricing = await ProgramPricing.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // After updating the pricing, find and update all related bookings
    const programId = updatedProgramPricing.programId.toString();
    const relatedBookings = await Booking.find({ tripId: programId, user: req.user.id });
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
    const programPricing = await ProgramPricing.findById(req.params.id);
    if (!programPricing) {
      return res.status(404).json({ message: 'Program pricing not found' });
    }
    
    if (programPricing.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await programPricing.remove();
    res.json({ message: 'Program pricing deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};