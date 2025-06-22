// backend/controllers/bookingController.js
const BookingService = require("../services/BookingService");
const ExcelService = require("../services/ExcelService");

exports.getAllBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const { role, id, adminId } = req.user;

    // Admin and manager see all bookings for the agency
    // Employee only sees their own bookings
    const queryUserId = role === "employee" ? id : adminId;
    const idColumn = role === "employee" ? "employeeId" : "userId";

    const { bookings, totalCount } = await BookingService.getAllBookings(
      req.db,
      queryUserId,
      page,
      limit,
      idColumn
    );

    res.json({
      data: bookings,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Get All Bookings Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getBookingsByProgram = async (req, res) => {
  try {
    const { programId } = req.params;
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10000", 10); // Default to a high limit
    const { role, id, adminId } = req.user;

    let query = `
            SELECT b.*, e.username as "employeeName"
            FROM bookings b
            LEFT JOIN employees e ON b."employeeId" = e.id
            WHERE b."userId" = $1 AND b."tripId" = $2
        `;
    const params = [adminId, programId];

    if (role === "employee") {
      query += ` AND b."employeeId" = $3`;
      params.push(id);
    }

    const countQuery = `SELECT COUNT(*) FROM (${query}) as count_table`;
    const totalCountResult = await req.db.query(countQuery, params);
    const totalCount = parseInt(totalCountResult.rows[0].count, 10);

    const offset = (page - 1) * limit;

    // Add limit and offset to params array dynamically
    const limitParamIndex = params.length + 1;
    const offsetParamIndex = params.length + 2;
    query += ` ORDER BY b."createdAt" DESC LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`;
    params.push(limit, offset);

    const { rows: bookings } = await req.db.query(query, params);

    res.json({
      data: bookings,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Get Bookings By Program Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const newBooking = await BookingService.createBooking(
      req.db,
      req.user, // Pass the whole user object
      req.body
    );
    res.status(201).json(newBooking);
  } catch (error) {
    console.error("Create Booking Error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.updateBooking = async (req, res) => {
  const { id } = req.params;
  try {
    const updatedBooking = await BookingService.updateBooking(
      req.db,
      req.user, // Pass the whole user object
      id,
      req.body
    );
    res.json(updatedBooking);
  } catch (error) {
    console.error("Update Booking Error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.deleteBooking = async (req, res) => {
  const { id } = req.params;
  try {
    // Allow admin/manager to delete any booking in their agency
    // An employee can only delete their own.
    const result = await BookingService.deleteBooking(req.db, req.user, id);
    res.json(result);
  } catch (error) {
    console.error("Delete Booking Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// --- Payment, Excel, and other functions remain largely the same ---
// But their parent booking operations will now respect the new roles.

exports.addPayment = async (req, res) => {
  try {
    const updatedBooking = await BookingService.addPayment(
      req.db,
      req.user,
      req.params.bookingId,
      req.body
    );
    res.json(updatedBooking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updatePayment = async (req, res) => {
  try {
    const updatedBooking = await BookingService.updatePayment(
      req.db,
      req.user,
      req.params.bookingId,
      req.params.paymentId,
      req.body
    );
    res.json(updatedBooking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const updatedBooking = await BookingService.deletePayment(
      req.db,
      req.user,
      req.params.bookingId,
      req.params.paymentId
    );
    res.json(updatedBooking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.exportBookingsToExcel = async (req, res) => {
  try {
    const { programId } = req.params;
    const { adminId, role } = req.user; // Destructure role from user object

    if (!programId || programId === "all") {
      return res
        .status(400)
        .json({ message: "A specific program must be selected for export." });
    }

    const { rows: bookings } = await req.db.query(
      'SELECT * FROM bookings WHERE "tripId" = $1 AND "userId" = $2 ORDER BY "phoneNumber", "clientNameFr"',
      [programId, adminId]
    );
    if (bookings.length === 0) {
      return res
        .status(404)
        .json({ message: "No bookings found for this program." });
    }

    const { rows: programs } = await req.db.query(
      "SELECT * FROM programs WHERE id = $1",
      [programId]
    );
    if (!programs[0]) {
      return res.status(404).json({ message: "Program not found." });
    }

    // Pass the user's role to the Excel generation service
    const workbook = await ExcelService.generateBookingsExcel(
      bookings,
      programs[0],
      role // Pass the role
    );

    const fileName = `${programs[0].name.replace(/\s/g, "_")}_bookings.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Failed to export to Excel:", error);
    res.status(500).json({ message: "Failed to export bookings to Excel." });
  }
};

exports.exportBookingTemplate = async (req, res) => {
  try {
    const { rows: programs } = await req.db.query(
      'SELECT * FROM programs WHERE "userId" = $1',
      [req.user.adminId]
    );
    const workbook = await ExcelService.generateBookingTemplateExcel(programs);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Booking_Template.xlsx"
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Failed to export template:", error);
    res.status(500).json({ message: "Failed to export booking template." });
  }
};

exports.importBookingsFromExcel = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded." });

  try {
    const result = await ExcelService.parseBookingsFromExcel(
      req.file,
      req.user, // pass full user object
      req.db
    );
    res.status(201).json(result);
  } catch (error) {
    console.error("Excel import error:", error);
    res.status(500).json({ message: error.message });
  }
};
