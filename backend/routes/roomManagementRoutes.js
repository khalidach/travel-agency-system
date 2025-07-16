// backend/routes/roomManagementRoutes.js
const express = require("express");
const router = express.Router();
const roomManagementController = require("../controllers/roomManagementController");
const { protect } = require("../middleware/authMiddleware");
const { param, query } = require("express-validator");
const {
  handleValidationErrors,
} = require("../middleware/validationMiddleware");

router.use(protect);

const hotelRoomValidation = [
  param("programId").isInt().withMessage("Program ID must be an integer."),
  param("hotelName").notEmpty().trim().escape(),
];

router.get(
  "/program/:programId/hotel/:hotelName",
  hotelRoomValidation,
  handleValidationErrors,
  roomManagementController.getRoomsByProgramAndHotel
);

router.get(
  "/program/:programId/hotel/:hotelName/search-unassigned",
  [...hotelRoomValidation, query("searchTerm").optional().trim().escape()],
  handleValidationErrors,
  roomManagementController.searchUnassignedOccupants
);

router.post(
  "/program/:programId/hotel/:hotelName",
  hotelRoomValidation,
  handleValidationErrors,
  roomManagementController.saveRooms
);

// New route for Excel export
router.get(
  "/program/:programId/export-excel",
  param("programId").isInt().withMessage("Program ID must be an integer."),
  handleValidationErrors,
  roomManagementController.exportRoomsToExcel
);

module.exports = router;
