// backend/middleware/errorHandler.js
const logger = require("../utils/logger");
const AppError = require("../utils/appError");

/**
 * Handles development errors by sending a detailed response.
 * @param {Error} err - The error object.
 * @param {object} res - The Express response object.
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

/**
 * Handles production errors by sending a user-friendly, non-detailed response.
 * @param {Error} err - The error object.
 * @param {object} res - The Express response object.
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // 1) Log error for developers
    logger.error("PRODUCTION ERROR 💥", err);

    // 2) Send generic message
    res.status(500).json({
      status: "error",
      message: "An unexpected error occurred. Please try again later.",
    });
  }
};

/**
 * Global error handling middleware for Express.
 * Catches errors and sends an appropriate response based on the environment.
 */
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = { ...err, message: err.message };

    // Handle specific error types to make them operational
    if (error.name === "CastError")
      error = new AppError(`Invalid ${error.path}: ${error.value}.`, 400);
    if (error.code === 11000)
      error = new AppError(
        "Duplicate field value. Please use another value!",
        400
      );
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((el) => el.message);
      const message = `Invalid input data. ${errors.join(". ")}`;
      error = new AppError(message, 400);
    }
    if (error.name === "JsonWebTokenError")
      error = new AppError("Invalid token. Please log in again!", 401);
    if (error.name === "TokenExpiredError")
      error = new AppError("Your token has expired! Please log in again.", 401);

    sendErrorProd(error, res);
  }
};
