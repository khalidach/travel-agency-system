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

const signupValidation = [
  body("ownerName").notEmpty().withMessage("Owner name is required."),
  body("agencyName").notEmpty().withMessage("Agency name is required."),
  body("phoneNumber").notEmpty().withMessage("Phone number is required."),
  body("email").isEmail().withMessage("Please provide a valid email."),
  body("username").notEmpty().withMessage("Username is required."),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long."),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Passwords do not match.");
    }
    return true;
  }),
];

const loginValidation = [
  body("username").notEmpty().withMessage("Username is required."),
  body("password").notEmpty().withMessage("Password is required."),
];

const accountSettingsValidation = [
  body("agencyName")
    .optional()
    .isString()
    .withMessage("Agency name must be a string."),
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required."),
  body("newPassword")
    .optional({ checkFalsy: true })
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long."),
  body("confirmPassword").custom((value, { req }) => {
    if (req.body.newPassword && value !== req.body.newPassword) {
      throw new Error("Passwords do not match.");
    }
    return true;
  }),
];

const programValidation = [
  body("name").notEmpty().trim().withMessage("Program name is required."),
  body("type")
    .isIn(["Hajj", "Umrah", "Tourism", "Ramadan"]) // تم إضافة "Ramadan" هنا
    .withMessage("Invalid program type."),
  body("variations")
    .isArray({ min: 1 })
    .withMessage("At least one program variation is required."),
  body("variations.*.name")
    .notEmpty()
    .trim()
    .withMessage("Variation name is required."),
  body("variations.*.duration")
    .isInt({ gte: 0 })
    .withMessage("Duration must be a non-negative integer."),
  body("variations.*.cities")
    .isArray({ min: 1 })
    .withMessage("At least one city is required for each variation."),
  body("variations.*.cities.*.name")
    .notEmpty()
    .trim()
    .withMessage("City name is required."),
  body("variations.*.cities.*.nights")
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
  body("clients")
    .isArray({ min: 1 })
    .withMessage("At least one client is required."),
  body("clients.*.clientNameFr.lastName")
    .notEmpty()
    .trim()
    .withMessage("Client last name (French) is required."),
  body("clients.*.clientNameFr.firstName").trim(),
  body("clients.*.clientNameAr").trim(),
  body("clients.*.personType")
    .isIn(["adult", "child", "infant"])
    .withMessage("Invalid person type."),
  body("clients.*.passportNumber")
    .notEmpty()
    .trim()
    .escape()
    .withMessage("Passport number is required."),
  body("clients.*.gender")
    .isIn(["male", "female"])
    .withMessage("Invalid gender."),
  body("clients.*.phoneNumber").optional({ checkFalsy: true }).trim().escape(),
  body("clients.*.dateOfBirth")
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      if (/^\d{4}-\d{2}-\d{2}$/.test(value) || /^XX\/XX\/\d{4}$/.test(value)) {
        return true;
      }
      throw new Error(
        "Invalid date of birth format. Use YYYY-MM-DD or XX/XX/YYYY."
      );
    }),
  body("clients.*.passportExpirationDate")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate()
    .withMessage("Invalid passport expiration date."),

  body("tripId").notEmpty().withMessage("A travel program must be selected."),
  body("sellingPrice")
    .isFloat({ gte: 0 })
    .withMessage("Selling price must be a positive number."),
  body("packageId").optional({ checkFalsy: true }).trim(),
];

const bookingUpdateValidation = [
  body("clientNameFr.lastName")
    .notEmpty()
    .trim()
    .withMessage("Client last name (French) is required."),
  body("clientNameFr.firstName").trim(),
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
  body("gender").isIn(["male", "female"]).withMessage("Invalid gender."),
  body("phoneNumber").optional({ checkFalsy: true }).trim().escape(),
  body("dateOfBirth")
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      if (/^\d{4}-\d{2}-\d{2}$/.test(value) || /^XX\/XX\/\d{4}$/.test(value)) {
        return true;
      }
      throw new Error(
        "Invalid date of birth format. Use YYYY-MM-DD or XX/XX/YYYY."
      );
    }),
  body("passportExpirationDate")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate()
    .withMessage("Invalid passport expiration date."),
  body("tripId").notEmpty().withMessage("A travel program must be selected."),
  body("sellingPrice")
    .isFloat({ gte: 0 })
    .withMessage("Selling price must be a positive number."),
  body("packageId").optional({ checkFalsy: true }).trim(),
];

const paymentValidation = [
  body("amount")
    .isFloat({ gt: 0 })
    .withMessage("Payment amount must be a positive number."),
  body("method")
    .isIn(["cash", "cheque", "transfer", "card"])
    .withMessage("Invalid payment method."),
  body("date").isISO8601().toDate().withMessage("Invalid payment date."),
  body("chequeNumber").optional({ checkFalsy: true }).trim().escape(),
  body("bankName").optional({ checkFalsy: true }).trim().escape(),
  body("chequeCashingDate")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate()
    .withMessage("Invalid cheque cashing date."),
  body("transferReference").optional({ checkFalsy: true }).trim().escape(),
  body("transferPayerName").optional({ checkFalsy: true }).trim().escape(),
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
  body("advancePayments")
    .optional()
    .isArray()
    .withMessage("Payments must be an array."),
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
  signupValidation,
  loginValidation,
  accountSettingsValidation,
  programValidation,
  programPricingValidation,
  bookingValidation,
  bookingUpdateValidation,
  paymentValidation,
  dailyServiceValidation,
  idValidation,
  usernameValidation,
  paginationValidation,
  bookingFilterValidation,
};
