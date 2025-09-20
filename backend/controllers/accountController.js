// backend/controllers/accountController.js
const bcrypt = require("bcryptjs");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");

/**
 * Updates account settings for the currently logged-in user.
 * Admins/Owners can update their password and agency name.
 * Employees/Managers can only update their password.
 */
exports.updateAccountSettings = async (req, res, next) => {
  const { id, role, adminId } = req.user;
  const { currentPassword, newPassword, agencyName } = req.body;

  try {
    // Handle Admins and Owners
    if (role === "admin" || role === "owner") {
      const { rows: users } = await req.db.query(
        "SELECT * FROM users WHERE id = $1",
        [id]
      );
      if (users.length === 0) {
        return next(new AppError("User not found.", 404));
      }
      const user = users[0];

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return next(new AppError("Incorrect current password.", 401));
      }

      const updates = [];
      const queryParams = [];

      // Add agencyName to update if provided and user is admin
      if (agencyName && (role === "admin" || role === "owner")) {
        queryParams.push(agencyName);
        updates.push(`"agencyName" = $${queryParams.length}`);
      }

      // Add new password to update if provided
      if (newPassword) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        queryParams.push(hashedPassword);
        updates.push(`password = $${queryParams.length}`);
      }

      // If there are no updates, return success
      if (updates.length === 0) {
        return res.status(200).json({ message: "No changes to save." });
      }

      // Construct and execute the final query
      queryParams.push(id);
      const query = `UPDATE users SET ${updates.join(", ")} WHERE id = $${
        queryParams.length
      }`;

      await req.db.query(query, queryParams);
      return res
        .status(200)
        .json({ message: "Account settings updated successfully." });
    }
    // Handle Employees and Managers
    else if (role === "employee" || role === "manager") {
      if (agencyName) {
        return next(
          new AppError("Employees cannot change the agency name.", 403)
        );
      }
      const { rows: employees } = await req.db.query(
        'SELECT * FROM employees WHERE id = $1 AND "adminId" = $2',
        [id, adminId]
      );
      if (employees.length === 0) {
        return next(new AppError("Employee not found.", 404));
      }
      const employee = employees[0];

      const isMatch = await bcrypt.compare(currentPassword, employee.password);
      if (!isMatch) {
        return next(new AppError("Incorrect current password.", 401));
      }

      if (newPassword) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await req.db.query("UPDATE employees SET password = $1 WHERE id = $2", [
          hashedPassword,
          id,
        ]);
        return res
          .status(200)
          .json({ message: "Password updated successfully." });
      } else {
        return res.status(200).json({ message: "No changes to save." });
      }
    }
    // Handle any other roles
    else {
      return next(new AppError("Unauthorized role.", 403));
    }
  } catch (error) {
    logger.error("Update Account Settings Error:", {
      message: error.message,
      stack: error.stack,
    });
    next(new AppError("Failed to update account settings.", 500));
  }
};
