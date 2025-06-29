// backend/controllers/bookingController.js
const BookingService = require("../services/BookingService");
const ExcelService = require("../services/ExcelService");

exports.getAllBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const { role, id, adminId } = req.user;

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
    const {
      page = 1,
      limit = 10,
      searchTerm = "",
      sortOrder = "newest",
      statusFilter = "all",
      employeeFilter = "all",
    } = req.query;
    const { adminId } = req.user;

    // --- Building the WHERE clause ---
    let whereConditions = ['b."userId" = $1', 'b."tripId" = $2'];
    const queryParams = [adminId, programId];
    let paramIndex = 3;

    if (searchTerm) {
      whereConditions.push(
        `(b."clientNameFr" ILIKE $${paramIndex} OR b."clientNameAr" ILIKE $${paramIndex} OR b."passportNumber" ILIKE $${paramIndex})`
      );
      queryParams.push(`%${searchTerm}%`);
      paramIndex++;
    }

    if (statusFilter === "paid") {
      whereConditions.push('b."isFullyPaid" = true');
    } else if (statusFilter === "pending") {
      whereConditions.push('b."isFullyPaid" = false');
    }

    if (employeeFilter !== "all" && /^\d+$/.test(employeeFilter)) {
      whereConditions.push(`b."employeeId" = $${paramIndex}`);
      queryParams.push(employeeFilter);
      paramIndex++;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // --- Summary Stats Query (on the whole filtered set) ---
    const summaryQuery = `
      SELECT
        COUNT(*) as "totalBookings",
        COALESCE(SUM(b."sellingPrice"), 0) as "totalRevenue",
        COALESCE(SUM(b."basePrice"), 0) as "totalCost",
        COALESCE(SUM(b.profit), 0) as "totalProfit",
        COALESCE(SUM(b."sellingPrice" - b."remainingBalance"), 0) as "totalPaid"
      FROM bookings b
      ${whereClause}
    `;
    const summaryResult = await req.db.query(summaryQuery, queryParams);
    const summaryStats = summaryResult.rows[0];
    summaryStats.totalRemaining =
      summaryStats.totalRevenue - summaryStats.totalPaid;

    // --- Paginated Data Query ---
    const totalCount = parseInt(summaryStats.totalBookings, 10);
    const offset = (page - 1) * limit;

    let orderByClause;
    switch (sortOrder) {
      case "oldest":
        orderByClause = 'ORDER BY b."createdAt" ASC';
        break;
      case "family":
        // This is complex to do purely in SQL without CTEs or complex logic,
        // often better handled client-side if the dataset per page is small.
        // For now, we'll sort by phone number then name to group potential families.
        orderByClause = 'ORDER BY b."phoneNumber" ASC, b."createdAt" DESC';
        break;
      case "newest":
      default:
        orderByClause = 'ORDER BY b."createdAt" DESC';
        break;
    }

    const dataQuery = `
      SELECT b.*, e.username as "employeeName"
      FROM bookings b
      LEFT JOIN employees e ON b."employeeId" = e.id
      ${whereClause}
      ${orderByClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);

    const { rows: bookings } = await req.db.query(dataQuery, queryParams);

    res.json({
      data: bookings,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      summaryStats: {
        totalBookings: parseInt(summaryStats.totalBookings, 10),
        totalRevenue: parseFloat(summaryStats.totalRevenue),
        totalCost: parseFloat(summaryStats.totalCost),
        totalProfit: parseFloat(summaryStats.totalProfit),
        totalPaid: parseFloat(summaryStats.totalPaid),
        totalRemaining: parseFloat(summaryStats.totalRemaining),
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
      req.user,
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
      req.user,
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
    const result = await BookingService.deleteBooking(req.db, req.user, id);
    res.json(result);
  } catch (error) {
    console.error("Delete Booking Error:", error);
    res.status(500).json({ message: error.message });
  }
};

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
    const { adminId, role } = req.user;

    if (!programId || programId === "undefined") {
      return res
        .status(400)
        .json({ message: "A program must be selected for export." });
    }

    const { rows: programs } = await req.db.query(
      'SELECT * FROM programs WHERE id = $1 AND "userId" = $2',
      [programId, adminId]
    );

    if (programs.length === 0) {
      return res.status(404).json({ message: "Program not found." });
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

    const workbook = await ExcelService.generateBookingsExcel(
      bookings,
      programs[0],
      role
    );

    const fileName = `${(programs[0].name || "Untitled_Program").replace(
      /[\s\W]/g,
      "_"
    )}_bookings.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
  } catch (error) {
    console.error("Failed to export to Excel:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to export bookings to Excel." });
    }
  }
};

exports.exportBookingTemplateForProgram = async (req, res) => {
  try {
    const { programId } = req.params;

    if (!programId || programId === "undefined") {
      return res.status(400).json({ message: "Invalid Program ID provided." });
    }

    const { rows: programs } = await req.db.query(
      'SELECT * FROM programs WHERE id = $1 AND "userId" = $2',
      [programId, req.user.adminId]
    );

    if (programs.length === 0) {
      return res.status(404).json({ message: "Program not found." });
    }

    const program = programs[0];
    const workbook = await ExcelService.generateBookingTemplateForProgramExcel(
      program
    );

    const fileName = `${(program.name || "Untitled_Program").replace(
      /[\s\W]/g,
      "_"
    )}_Template.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
  } catch (error) {
    console.error("Failed to export template:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to export booking template." });
    }
  }
};

exports.importBookingsFromExcel = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded." });
  const { programId } = req.params;
  if (!programId)
    return res.status(400).json({ message: "Program ID is required." });

  try {
    const result = await ExcelService.parseBookingsFromExcel(
      req.file,
      req.user,
      req.db,
      programId
    );
    res.status(201).json(result);
  } catch (error) {
    console.error("Excel import error:", error);
    res.status(500).json({ message: error.message });
  }
};
