// backend/controllers/settingsController.js
const AppError = require("../utils/appError");
const logger = require("../utils/logger");

const getSettings = async (req, res) => {
  res.status(200).json(req.user.facturationSettings || {});
};

const updateSettings = async (req, res, next) => {
  try {
    const { id } = req.user;
    const settings = req.body;

    const { rows } = await req.db.query(
      'UPDATE users SET "facturationSettings" = $1 WHERE id = $2 RETURNING "facturationSettings"',
      [JSON.stringify(settings), id]
    );

    if (rows.length === 0) {
      return next(new AppError("User not found.", 404));
    }
    res.status(200).json(rows[0].facturationSettings);
  } catch (error) {
    logger.error("Update Settings Error:", {
      message: error.message,
      stack: error.stack,
      userId: req.user.id,
    });
    next(new AppError("Failed to update settings.", 500));
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
