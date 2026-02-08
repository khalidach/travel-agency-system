const BookingService = require("../../services/BookingService");
const AppError = require("../../utils/appError");
const logger = require("../../utils/logger");

exports.createBooking = async (req, res, next) => {
  try {
    const result = await BookingService.createBookings(
      req.db,
      req.user,
      req.body,
    );
    res.status(201).json(result);
  } catch (error) {
    logger.error("Create Booking(s) Error:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
    });
    if (error.message.includes("already booked")) {
      return next(new AppError(error.message, 409)); // 409 Conflict
    }
    if (
      error instanceof AppError &&
      error.message.includes("لقد اكتمل هذا البرنامج")
    ) {
      return next(error);
    }

    next(new AppError("Failed to create booking(s).", 400));
  }
};

exports.updateBooking = async (req, res, next) => {
  const { id } = req.params;
  try {
    const updatedBooking = await BookingService.updateBooking(
      req.db,
      req.user,
      id,
      req.body,
    );
    res.status(200).json(updatedBooking);
  } catch (error) {
    logger.error("Update Booking Error:", {
      message: error.message,
      stack: error.stack,
      bookingId: id,
      body: req.body,
    });
    if (error.message.includes("not authorized")) {
      return next(new AppError(error.message, 403));
    }
    if (error.message.includes("not found")) {
      return next(new AppError(error.message, 404));
    }
    if (
      error instanceof AppError &&
      error.message.includes("لا يمكن نقل الحجز")
    ) {
      return next(error);
    }
    next(new AppError("Failed to update booking.", 400));
  }
};

exports.updateBookingStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    if (!["confirmed", "cancelled"].includes(status)) {
      return next(new AppError("Invalid status provided.", 400));
    }

    const updatedBooking = await BookingService.updateBookingStatus(
      req.db,
      req.user,
      id,
      status,
    );

    res.status(200).json(updatedBooking);
  } catch (error) {
    logger.error("Update Booking Status Error:", {
      message: error.message,
      stack: error.stack,
      bookingId: id,
    });

    if (error.message.includes("Unauthorized")) {
      return next(new AppError(error.message, 403));
    }
    if (error.message.includes("not found")) {
      return next(new AppError(error.message, 404));
    }

    next(new AppError("Failed to update booking status.", 500));
  }
};

exports.deleteBooking = async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await BookingService.deleteBooking(req.db, req.user, id);
    res.status(200).json(result);
  } catch (error) {
    logger.error("Delete Booking Error:", {
      message: error.message,
      stack: error.stack,
      bookingId: id,
    });
    if (error.message.includes("not authorized")) {
      return next(new AppError(error.message, 403));
    }
    next(new AppError("Failed to delete booking.", 500));
  }
};

exports.deleteMultipleBookings = async (req, res, next) => {
  const { bookingIds, filters } = req.body;
  try {
    const result = await BookingService.deleteMultipleBookings(
      req.db,
      req.user,
      bookingIds,
      filters,
    );
    res.status(200).json(result);
  } catch (error) {
    logger.error("Delete Multiple Bookings Error:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
    });
    next(new AppError("Failed to delete bookings.", 500));
  }
};
