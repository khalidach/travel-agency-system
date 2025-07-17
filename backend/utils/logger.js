// backend/utils/logger.js
const winston = require("winston");
const path = require("path");
const fs = require("fs");

// Define different logging levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

// Add the colors to winston
winston.addColors(colors);

// Define the format for the logs
const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define the transports (console, file, etc.)
const transports = [
  // Always log to the console
  new winston.transports.Console(),
];

// Only add file transports if not in a production environment (like Vercel)
// Vercel automatically sets NODE_ENV to 'production'
if (process.env.NODE_ENV !== "production") {
  const logDir = "logs";

  // Create the log directory if it does not exist
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }

  transports.push(
    // Log errors to a file
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
    }),
    // Log all messages to another file
    new winston.transports.File({ filename: path.join(logDir, "all.log") })
  );
}

// Create the logger instance
const logger = winston.createLogger({
  level: "debug", // Log all levels up to debug
  levels,
  format,
  transports,
});

module.exports = logger;
