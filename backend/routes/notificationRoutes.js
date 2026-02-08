// backend/routes/notificationRoutes.js
const express = require("express");
const notificationController = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", notificationController.getMyNotifications);
router.patch("/mark-all-read", notificationController.markAllAsRead);
router.patch("/:id/read", notificationController.markAsRead);

// <NEW CODE>
router.delete("/clear-all", notificationController.deleteAllNotifications);
router.delete("/:id", notificationController.deleteNotification);
// </NEW CODE>

module.exports = router;
