// backend/controllers/roomManagementController.js
const RoomManagementService = require("../services/RoomManagementService");

exports.getRoomsByProgramAndHotel = async (req, res) => {
  try {
    const { programId, hotelName } = req.params;
    const { adminId } = req.user;
    const rooms = await RoomManagementService.getRooms(
      req.db,
      adminId,
      programId,
      hotelName
    );
    res.json(rooms);
  } catch (error) {
    console.error("Get Rooms Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.saveRooms = async (req, res) => {
  try {
    const { programId, hotelName } = req.params;
    const rooms = req.body.rooms;
    const { adminId } = req.user;

    const savedRooms = await RoomManagementService.saveRooms(
      req.db,
      adminId,
      programId,
      hotelName,
      rooms
    );
    res.status(200).json(savedRooms);
  } catch (error) {
    console.error("Save Rooms Error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.searchUnassignedOccupants = async (req, res) => {
  try {
    const { programId, hotelName } = req.params;
    const { searchTerm = "" } = req.query;
    const { adminId } = req.user;
    const occupants = await RoomManagementService.searchUnassignedOccupants(
      req.db,
      adminId,
      programId,
      hotelName,
      searchTerm
    );
    res.json(occupants);
  } catch (error) {
    console.error("Search Unassigned Occupants Error:", error);
    res.status(500).json({ message: error.message });
  }
};
