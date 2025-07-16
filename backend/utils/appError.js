// backend/utils/appError.js

/**
 * @class AppError
 * @extends {Error}
 * A custom error class for handling operational errors in the application.
 * It allows for specifying a status code and a user-friendly message.
 */
class AppError extends Error {
  /**
   * Creates an instance of AppError.
   * @param {string} message - The user-friendly error message.
   * @param {number} statusCode - The HTTP status code for the error.
   */
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true; // Mark as an operational error

    // Capture the stack trace, excluding the constructor call from it.
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
