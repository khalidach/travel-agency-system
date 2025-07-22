// backend/middleware/validationMiddleware.js
const { body, param, query, validationResult } = require("express-validator");

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
  body("name").notEmpty().trim().withMessage("Program name is required."),
  body("type")
    .isIn(["Hajj", "Umrah", "Tourism"])
    .withMessage("Invalid program type."),
  body("duration")
    .isInt({ gte: 0 })
    .withMessage("Duration must be a non-negative integer."),
  body("cities")
    .isArray({ min: 1 })
    .withMessage("At least one city is required."),
  body("cities.*.name").notEmpty().trim().withMessage("City name is required."),
  body("cities.*.nights")
    .isInt({ gte: 0 })
    .withMessage("Nights must be a non-negative integer."),
  body("packages").isArray().withMessage("Packages must be an array."),
];

const programPricingValidation = [
  body("programId").isInt().withMessage("Program ID must be an integer."),
  body("ticketAirline")
    .optional()
    .isFloat({ gte: 0 })
    .withMessage("Ticket price must be a non-negative number."),
  body("ticketPricesByVariation")
    .optional()
    .isObject()
    .withMessage("Ticket prices by variation must be an object."),
  body("ticketPricesByVariation.*")
    .isFloat({ gte: 0 })
    .withMessage("Variation ticket price must be a non-negative number."),
  body("transportFees")
    .optional()
    .isFloat({ gte: 0 })
    .withMessage("Transport fees must be a non-negative number."),
  body("visaFees")
    .optional()
    .isFloat({ gte: 0 })
    .withMessage("Visa fees must be a non-negative number."),
  body("guideFees")
    .optional()
    .isFloat({ gte: 0 })
    .withMessage("Guide fees must be a non-negative number."),
  body("allHotels").isArray().withMessage("Hotels must be an array."),
];

const bookingValidation = [
  body("clientNameFr")
    .notEmpty()
    .trim()
    .withMessage("Client name (French) is required."),
  body("clientNameAr")
    .notEmpty()
    .trim()
    .withMessage("Client name (Arabic) is required."),
  body("personType")
    .isIn(["adult", "child", "infant"])
    .withMessage("Invalid person type."),
  body("passportNumber")
    .notEmpty()
    .trim()
    .escape()
    .withMessage("Passport number is required."),
  body("dateOfBirth")
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true; // Optional field
      // Regex to match YYYY, YYYY-MM-DD, or XX/XX/YYYY
      if (
        /^\d{4}$/.test(value) ||
        /^\d{4}-\d{2}-\d{2}$/.test(value) ||
        /^XX\/XX\/\d{4}$/.test(value)
      ) {
        return true;
      }
      throw new Error(
        "Invalid date of birth format. Use YYYY, YYYY-MM-DD, or XX/XX/YYYY."
      );
    }),
  body("passportExpirationDate")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate()
    .withMessage("Invalid passport expiration date."),
  body("gender")
    .notEmpty()
    .isIn(["male", "female"])
    .withMessage("Invalid gender."),
  body("phoneNumber")
    .optional() // This field is now optional
    .trim()
    .escape(),
  body("tripId").notEmpty().withMessage("A travel program must be selected."),
  body("packageId").optional({ checkFalsy: true }).trim(),
  body("sellingPrice")
    .isFloat({ gte: 0 })
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

const dailyServiceValidation = [
  body("type")
    .isIn(["airline-ticket", "hotel-reservation", "reservation-ticket", "visa"])
    .withMessage("Invalid service type."),
  body("serviceName")
    .notEmpty()
    .trim()
    .withMessage("Service name is required."),
  body("originalPrice")
    .isFloat({ gte: 0 })
    .withMessage("Original price must be a non-negative number."),
  body("totalPrice")
    .isFloat({ gte: 0 })
    .withMessage("Total price must be a non-negative number.")
    .custom((value, { req }) => {
      if (value < req.body.originalPrice) {
        throw new Error("Total price cannot be less than the original price.");
      }
      return true;
    }),
  body("date").isISO8601().toDate().withMessage("Invalid service date."),
];

const idValidation = [
  param("id").isInt().withMessage("ID must be an integer."),
];

const usernameValidation = [
  param("username")
    .notEmpty()
    .withMessage("Username is required.")
    .isAlphanumeric()
    .withMessage("Username must be alphanumeric."),
];

const paginationValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer."),
  query("limit")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Limit must be a positive integer."),
];

const bookingFilterValidation = [
  ...paginationValidation,
  query("searchTerm").optional().trim().escape(),
  query("sortOrder")
    .optional()
    .isIn(["newest", "oldest", "family"])
    .withMessage("Invalid sort order."),
  query("statusFilter")
    .optional()
    .isIn(["all", "paid", "pending", "notPaid"])
    .withMessage("Invalid status filter."),
  query("employeeFilter").optional().trim().escape(),
];

module.exports = {
  handleValidationErrors,
  loginValidation,
  programValidation,
  programPricingValidation,
  bookingValidation,
  paymentValidation,
  dailyServiceValidation,
  idValidation,
  usernameValidation,
  paginationValidation,
  bookingFilterValidation,
};
