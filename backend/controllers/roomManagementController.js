// backend/controllers/roomManagementController.js
const RoomManagementService = require("../services/RoomManagementService");
const ExcelRoomService = require("../services/excelRoomService.js");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");

exports.getRoomsByProgramAndHotel = async (req, res, next) => {
  try {
    const { programId, hotelName } = req.params;
    const { adminId } = req.user;
    const rooms = await RoomManagementService.getRooms(
      req.db,
      adminId,
      programId,
      hotelName
    );
    res.status(200).json(rooms);
  } catch (error) {
    logger.error("Get Rooms Error:", {
      message: error.message,
      stack: error.stack,
      params: req.params,
    });
    next(new AppError("Failed to retrieve rooms.", 500));
  }
};

exports.saveRooms = async (req, res, next) => {
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
    logger.error("Save Rooms Error:", {
      message: error.message,
      stack: error.stack,
      params: req.params,
    });
    next(new AppError("Failed to save rooms.", 400));
  }
};

exports.searchUnassignedOccupants = async (req, res, next) => {
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
    res.status(200).json(occupants);
  } catch (error) {
    logger.error("Search Unassigned Occupants Error:", {
      message: error.message,
      stack: error.stack,
      params: req.params,
    });
    next(new AppError("Failed to search for occupants.", 500));
  }
};

exports.exportRoomsToExcel = async (req, res, next) => {
  try {
    const { programId } = req.params;
    const { adminId } = req.user;

    const programResult = await req.db.query(
      'SELECT * FROM programs WHERE id = $1 AND "userId" = $2',
      [programId, adminId]
    );
    if (programResult.rows.length === 0) {
      return next(new AppError("Program not found.", 404));
    }
    const program = programResult.rows[0];

    const roomDataResult = await req.db.query(
      'SELECT * FROM room_managements WHERE "programId" = $1 AND "userId" = $2',
      [programId, adminId]
    );
    const roomData = roomDataResult.rows;

    if (roomData.length === 0) {
      return next(
        new AppError("No room data found for this program to export.", 404)
      );
    }

    const workbook = await ExcelRoomService.generateRoomingListExcel(
      program,
      roomData
    );

    const fileName = `${(program.name || "Rooming_List").replace(
      /[\s\W]/g,
      "_"
    )}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error("Failed to export rooming list to Excel:", {
      message: error.message,
      stack: error.stack,
    });
    if (!res.headersSent) {
      next(new AppError("Failed to export rooming list.", 500));
    }
  }
};
