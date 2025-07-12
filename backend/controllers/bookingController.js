// backend/controllers/bookingController.js
const BookingService = require("../services/BookingService");
const ExcelService = require("../services/ExcelService");
const BookingExcelService = require("../services/BookingExcelService");
const ExcelListService = require("../services/ExcelListService"); // Import the new service

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
    const { adminId, role, id: userId } = req.user;

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
      whereConditions.push(
        'b."isFullyPaid" = false AND COALESCE(jsonb_array_length(b."advancePayments"), 0) > 0'
      );
    } else if (statusFilter === "notPaid") {
      whereConditions.push(
        'b."isFullyPaid" = false AND COALESCE(jsonb_array_length(b."advancePayments"), 0) = 0'
      );
    }

    if (role === "admin" || role === "manager") {
      if (employeeFilter !== "all" && /^\d+$/.test(employeeFilter)) {
        whereConditions.push(`b."employeeId" = $${paramIndex}`);
        queryParams.push(employeeFilter);
        paramIndex++;
      }
    } else if (role === "employee") {
      whereConditions.push(`b."employeeId" = $${paramIndex}`);
      queryParams.push(userId);
      paramIndex++;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // --- Logic for Family Sort ---
    if (sortOrder === "family") {
      const allBookingsQuery = `
            SELECT b.*, e.username as "employeeName"
            FROM bookings b
            LEFT JOIN employees e ON b."employeeId" = e.id
            ${whereClause}
        `;
      const allBookingsResult = await req.db.query(
        allBookingsQuery,
        queryParams
      );
      const allBookings = allBookingsResult.rows;

      const bookingsMap = new Map(allBookings.map((b) => [b.id, b]));
      const memberIds = new Set();
      allBookings.forEach((booking) => {
        if (booking.relatedPersons && Array.isArray(booking.relatedPersons)) {
          booking.relatedPersons.forEach((p) => {
            if (p && p.ID) {
              memberIds.add(p.ID);
            }
          });
        }
      });

      const familyLeaders = allBookings
        .filter((b) => !memberIds.has(b.id))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const sortedBookings = [];
      const processedIds = new Set();

      familyLeaders.forEach((leader) => {
        if (!processedIds.has(leader.id)) {
          sortedBookings.push({ ...leader, isRelated: false });
          processedIds.add(leader.id);
          if (leader.relatedPersons && Array.isArray(leader.relatedPersons)) {
            leader.relatedPersons.forEach((person) => {
              const member = bookingsMap.get(person.ID);
              if (member && !processedIds.has(member.id)) {
                sortedBookings.push({ ...member, isRelated: true });
                processedIds.add(member.id);
              }
            });
          }
        }
      });

      const totalCount = sortedBookings.length;
      const offset = (page - 1) * limit;
      const paginatedBookings = sortedBookings.slice(
        offset,
        offset + parseInt(limit, 10)
      );

      const statsQuery = `
            SELECT
                COALESCE(SUM("sellingPrice"), 0) as "totalRevenue",
                COALESCE(SUM("basePrice"), 0) as "totalCost",
                COALESCE(SUM(profit), 0) as "totalProfit",
                COALESCE(SUM("sellingPrice" - "remainingBalance"), 0) as "totalPaid"
            FROM bookings b
            ${whereClause}
        `;
      const statsResult = await req.db.query(statsQuery, queryParams);
      const summaryStats = statsResult.rows[0];
      const totalRevenue = parseFloat(summaryStats.totalRevenue);
      const totalPaid = parseFloat(summaryStats.totalPaid);

      res.json({
        data: paginatedBookings,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
        summary: {
          totalBookings: totalCount,
          totalRevenue: totalRevenue,
          totalCost: parseFloat(summaryStats.totalCost),
          totalProfit: parseFloat(summaryStats.totalProfit),
          totalPaid: totalPaid,
          totalRemaining: totalRevenue - totalPaid,
        },
      });
    } else {
      let orderByClause;
      switch (sortOrder) {
        case "oldest":
          orderByClause = 'ORDER BY b."createdAt" ASC, b.id ASC';
          break;
        case "newest":
        default:
          orderByClause = 'ORDER BY b."createdAt" DESC, b.id DESC';
          break;
      }

      const combinedQuery = `
          WITH FilteredBookings AS (
            SELECT b.*
            FROM bookings b
            ${whereClause}
          )
          SELECT
            (SELECT json_agg(t) FROM (
              SELECT b.*, e.username as "employeeName"
              FROM FilteredBookings b
              LEFT JOIN employees e ON b."employeeId" = e.id
              ${orderByClause}
              LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            ) t) as bookings,
            (SELECT COUNT(*) FROM FilteredBookings) as "totalCount",
            (SELECT COALESCE(SUM("sellingPrice"), 0) FROM FilteredBookings) as "totalRevenue",
            (SELECT COALESCE(SUM("basePrice"), 0) FROM FilteredBookings) as "totalCost",
            (SELECT COALESCE(SUM(profit), 0) FROM FilteredBookings) as "totalProfit",
            (SELECT COALESCE(SUM("sellingPrice" - "remainingBalance"), 0) FROM FilteredBookings) as "totalPaid"
        `;

      queryParams.push(limit, (page - 1) * limit);

      const { rows } = await req.db.query(combinedQuery, queryParams);
      const result = rows[0];
      const bookings = (result.bookings || []).map((b) => ({
        ...b,
        isRelated: false,
      }));
      const totalCount = parseInt(result.totalCount, 10);
      const totalRevenue = parseFloat(result.totalRevenue);
      const totalPaid = parseFloat(result.totalPaid);

      res.json({
        data: bookings,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
        summary: {
          totalBookings: totalCount,
          totalRevenue: totalRevenue,
          totalCost: parseFloat(result.totalCost),
          totalProfit: parseFloat(result.totalProfit),
          totalPaid: totalPaid,
          totalRemaining: totalRevenue - totalPaid,
        },
      });
    }
  } catch (error) {
    console.error("Get Bookings By Program Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getBookingIdsByProgram = async (req, res) => {
  try {
    const { programId } = req.params;
    const {
      searchTerm = "",
      statusFilter = "all",
      employeeFilter = "all",
    } = req.query;
    const { adminId, role, id: userId } = req.user;

    let whereConditions = ['"userId" = $1', '"tripId" = $2'];
    const queryParams = [adminId, programId];
    let paramIndex = 3;

    if (searchTerm) {
      whereConditions.push(
        `("clientNameFr" ILIKE $${paramIndex} OR "clientNameAr" ILIKE $${paramIndex} OR "passportNumber" ILIKE $${paramIndex})`
      );
      queryParams.push(`%${searchTerm}%`);
      paramIndex++;
    }

    if (statusFilter === "paid") {
      whereConditions.push('"isFullyPaid" = true');
    } else if (statusFilter === "pending") {
      whereConditions.push(
        '"isFullyPaid" = false AND COALESCE(jsonb_array_length("advancePayments"), 0) > 0'
      );
    } else if (statusFilter === "notPaid") {
      whereConditions.push(
        '"isFullyPaid" = false AND COALESCE(jsonb_array_length("advancePayments"), 0) = 0'
      );
    }

    if (role === "admin") {
      if (employeeFilter !== "all" && /^\d+$/.test(employeeFilter)) {
        whereConditions.push(`"employeeId" = $${paramIndex}`);
        queryParams.push(employeeFilter);
        paramIndex++;
      }
    } else if (role === "employee" || role === "manager") {
      whereConditions.push(`"employeeId" = $${paramIndex}`);
      queryParams.push(userId);
      paramIndex++;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const idsQuery = `SELECT id FROM bookings ${whereClause}`;

    const { rows } = await req.db.query(idsQuery, queryParams);
    const ids = rows.map((row) => row.id);

    res.json({ ids });
  } catch (error) {
    console.error("Get Booking Ids By Program Error:", error);
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

exports.deleteMultipleBookings = async (req, res) => {
  const { bookingIds, filters } = req.body;
  try {
    const result = await BookingService.deleteMultipleBookings(
      req.db,
      req.user,
      bookingIds,
      filters
    );
    res.json(result);
  } catch (error) {
    console.error("Delete Multiple Bookings Error:", error);
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

    const workbook = await BookingExcelService.generateBookingsExcel(
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

exports.exportFlightListToExcel = async (req, res) => {
  try {
    const { programId } = req.params;
    const { adminId, agencyName } = req.user;

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

    const program = { ...programs[0], agencyName };

    const { rows: bookings } = await req.db.query(
      'SELECT * FROM bookings WHERE "tripId" = $1 AND "userId" = $2 ORDER BY "clientNameFr"',
      [programId, adminId]
    );

    if (bookings.length === 0) {
      return res
        .status(404)
        .json({ message: "No bookings found for this program." });
    }

    const workbook = await ExcelListService.generateFlightListExcel(
      bookings,
      program
    );

    const fileName = `${(program.name || "Untitled_Program").replace(
      /[\s\W]/g,
      "_"
    )}_flight_list.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Failed to export flight list to Excel:", error);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ message: "Failed to export flight list to Excel." });
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
