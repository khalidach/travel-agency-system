// backend/middleware/validationMiddleware.js
const { body, validationResult } = require("express-validator");

/**
 * Middleware to handle the result of express-validator validations.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// --- Validation Chains ---

const loginValidation = [
  body("username").notEmpty().withMessage("Username is required."),
  body("password").notEmpty().withMessage("Password is required."),
];

const programValidation = [
  body("name")
    .notEmpty()
    .trim()
    .escape()
    .withMessage("Program name is required."),
  body("type")
    .isIn(["Hajj", "Umrah", "Tourism"])
    .withMessage("Invalid program type."),
  body("duration")
    .isInt({ gt: 0 })
    .withMessage("Duration must be a positive integer."),
  body("cities")
    .isArray({ min: 1 })
    .withMessage("At least one city is required."),
  body("cities.*.name")
    .notEmpty()
    .trim()
    .escape()
    .withMessage("City name is required."),
  body("cities.*.nights")
    .isInt({ gt: 0 })
    .withMessage("Nights must be a positive integer."),
  body("packages")
    .isArray({ min: 1 })
    .withMessage("At least one package is required."),
];

const programPricingValidation = [
  body("programId").isInt().withMessage("Program ID must be an integer."),
  body("ticketAirline")
    .isFloat({ gt: 0 })
    .withMessage("Ticket price must be a positive number."),
  body("visaFees")
    .isFloat({ gte: 0 }) // Changed from gt to gte
    .withMessage("Visa fees must be a non-negative number."), // Updated message for clarity
  body("guideFees")
    .isFloat({ gte: 0 }) // Changed from gt to gte
    .withMessage("Guide fees must be a non-negative number."), // Updated message for clarity
  body("allHotels").isArray().withMessage("Hotels must be an array."),
];

const bookingValidation = [
  body("clientNameFr")
    .notEmpty()
    .trim()
    .escape()
    .withMessage("Client name (French) is required."),
  body("clientNameAr")
    .notEmpty()
    .trim()
    .escape()
    .withMessage("Client name (Arabic) is required."),
  body("passportNumber")
    .notEmpty()
    .trim()
    .escape()
    .withMessage("Passport number is required."),
  body("phoneNumber")
    .notEmpty()
    .trim()
    .escape()
    .withMessage("Phone number is required."),
  body("tripId").notEmpty().withMessage("A travel program must be selected."),
  body("packageId").notEmpty().withMessage("A package must be selected."),
  body("sellingPrice")
    .isFloat({ gt: 0 })
    .withMessage("Selling price must be a positive number."),
];

const paymentValidation = [
  body("amount")
    .isFloat({ gt: 0 })
    .withMessage("Payment amount must be a positive number."),
  body("method")
    .isIn(["cash", "cheque", "transfer", "card"])
    .withMessage("Invalid payment method."),
  body("date").isISO8601().toDate().withMessage("Invalid payment date."),
];

module.exports = {
  handleValidationErrors,
  loginValidation,
  programValidation,
  programPricingValidation,
  bookingValidation,
  paymentValidation,
};
