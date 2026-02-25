const BookingService = require("../../services/BookingService");
const AppError = require("../../utils/appError");
const logger = require("../../utils/logger");

exports.addPayment = async (req, res, next) => {
  try {
    const updatedBooking = await BookingService.addPayment(
      req.db,
      req.user,
      req.params.bookingId,
      req.body,
    );
    res.status(200).json(updatedBooking);
  } catch (error) {
    logger.error("Add Payment Error:", {
      message: error.message,
      stack: error.stack,
      bookingId: req.params.bookingId,
    });
    next(new AppError("Failed to add payment.", 400));
  }
};

exports.updatePayment = async (req, res, next) => {
  try {
    const updatedBooking = await BookingService.updatePayment(
      req.db,
      req.user,
      req.params.bookingId,
      req.params.paymentId,
      req.body,
    );
    res.status(200).json(updatedBooking);
  } catch (error) {
    logger.error("Update Payment Error:", {
      message: error.message,
      stack: error.stack,
      bookingId: req.params.bookingId,
      paymentId: req.params.paymentId,
    });
    next(new AppError("Failed to update payment.", 400));
  }
};

exports.deletePayment = async (req, res, next) => {
  try {
    const updatedBooking = await BookingService.deletePayment(
      req.db,
      req.user,
      req.params.bookingId,
      req.params.paymentId,
    );
    res.status(200).json(updatedBooking);
  } catch (error) {
    logger.error("Delete Payment Error:", {
      message: error.message,
      stack: error.stack,
      bookingId: req.params.bookingId,
      paymentId: req.params.paymentId,
    });
    next(new AppError("Failed to delete payment.", 500));
  }
};

exports.addGroupPayment = async (req, res, next) => {
  try {
    const updatedBookings = await BookingService.addGroupPayment(
      req.db,
      req.user,
      req.params.bookingId,
      req.body,
    );
    res.status(200).json(updatedBookings);
  } catch (error) {
    logger.error("Add Group Payment Error:", {
      message: error.message,
      stack: error.stack,
      bookingId: req.params.bookingId,
    });
    next(new AppError("Failed to add group payment.", 400));
  }
};

exports.updateGroupPayment = async (req, res, next) => {
  try {
    const updatedBookings = await BookingService.updateGroupPayment(
      req.db,
      req.user,
      req.params.bookingId,
      req.params.paymentId,
      req.body,
    );
    res.status(200).json(updatedBookings);
  } catch (error) {
    logger.error("Update Group Payment Error:", {
      message: error.message,
      stack: error.stack,
      bookingId: req.params.bookingId,
      paymentId: req.params.paymentId,
    });
    next(new AppError("Failed to update group payment.", 400));
  }
};

exports.deleteGroupPayment = async (req, res, next) => {
  try {
    const updatedBookings = await BookingService.deleteGroupPayment(
      req.db,
      req.user,
      req.params.bookingId,
      req.params.paymentId,
    );
    res.status(200).json(updatedBookings);
  } catch (error) {
    logger.error("Delete Group Payment Error:", {
      message: error.message,
      stack: error.stack,
      bookingId: req.params.bookingId,
      paymentId: req.params.paymentId,
    });
    next(new AppError("Failed to delete group payment.", 500));
  }
};
