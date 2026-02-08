// backend/controllers/notificationController.js
const NotificationService = require("../services/NotificationService");
const AppError = require("../utils/appError");

exports.getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await NotificationService.getUserNotifications(
      req.db,
      req.user.id,
    );
    res.status(200).json(notifications);
  } catch (error) {
    next(new AppError("Failed to fetch notifications.", 500));
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    await NotificationService.markAsRead(req.db, req.params.id, req.user.id);
    res.status(200).json({ message: "Marked as read" });
  } catch (error) {
    next(new AppError("Failed to update notification.", 500));
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await NotificationService.markAllAsRead(req.db, req.user.id);
    res.status(200).json({ message: "All marked as read" });
  } catch (error) {
    next(new AppError("Failed to update notifications.", 500));
  }
};

// <NEW CODE>
exports.deleteNotification = async (req, res, next) => {
  try {
    await NotificationService.deleteNotification(
      req.db,
      req.params.id,
      req.user.id,
    );
    res.status(204).send();
  } catch (error) {
    next(new AppError("Failed to delete notification.", 500));
  }
};

exports.deleteAllNotifications = async (req, res, next) => {
  try {
    await NotificationService.deleteAllNotifications(req.db, req.user.id);
    res.status(204).send();
  } catch (error) {
    next(new AppError("Failed to delete notifications.", 500));
  }
};
// </NEW CODE>
