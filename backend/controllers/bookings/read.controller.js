const BookingService = require("../../services/BookingService");
const AppError = require("../../utils/appError");
const logger = require("../../utils/logger");

exports.getAllBookings = async (req, res, next) => {
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
      idColumn,
    );

    res.status(200).json({
      data: bookings,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    logger.error("Get All Bookings Error:", {
      message: error.message,
      stack: error.stack,
    });
    next(new AppError("Failed to retrieve bookings.", 500));
  }
};

exports.getBookingsByProgram = async (req, res, next) => {
  try {
    const { programId } = req.params;
    const {
      page = 1,
      limit = 10,
      searchTerm = "",
      sortOrder = "newest",
      statusFilter = "all",
      employeeFilter = "all",
      variationFilter = "all",
    } = req.query;
    const { adminId, role, id: userId } = req.user;

    // --- Building the WHERE clause ---
    let whereConditions = ['b."userId" = $1', 'b."tripId" = $2'];
    const queryParams = [adminId, programId];
    let paramIndex = 3;

    if (searchTerm) {
      whereConditions.push(
        `("clientNameFr"->>'lastName' ILIKE $${paramIndex} OR "clientNameFr"->>'firstName' ILIKE $${paramIndex} OR b."clientNameAr" ILIKE $${paramIndex} OR b."passportNumber" ILIKE $${paramIndex})`,
      );
      queryParams.push(`%${searchTerm}%`);
      paramIndex++;
    }

    if (statusFilter === "paid") {
      whereConditions.push('b."isFullyPaid" = true');
    } else if (statusFilter === "pending") {
      whereConditions.push(
        'b."isFullyPaid" = false AND COALESCE(jsonb_array_length(b."advancePayments"), 0) > 0',
      );
    } else if (statusFilter === "notPaid") {
      whereConditions.push(
        'b."isFullyPaid" = false AND COALESCE(jsonb_array_length(b."advancePayments"), 0) = 0',
      );
    }

    if (variationFilter && variationFilter !== "all") {
      whereConditions.push(`b."variationName" = $${paramIndex}`);
      queryParams.push(variationFilter);
      paramIndex++;
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
        queryParams,
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
          const familyMembers = [leader];
          if (leader.relatedPersons && Array.isArray(leader.relatedPersons)) {
            leader.relatedPersons.forEach((person) => {
              const member = bookingsMap.get(person.ID);
              if (member) {
                familyMembers.push(member);
              }
            });
          }

          const familySummary = familyMembers.reduce(
            (summary, member) => {
              const sellingPrice = Number(member.sellingPrice) || 0;
              const remainingBalance = Number(member.remainingBalance) || 0;
              summary.totalPrice += sellingPrice;
              summary.totalPaid += sellingPrice - remainingBalance;
              summary.totalRemaining += remainingBalance;
              return summary;
            },
            { totalPrice: 0, totalPaid: 0, totalRemaining: 0 },
          );

          const leaderWithSummary = {
            ...leader,
            isRelated: false,
            familySummary,
          };
          sortedBookings.push(leaderWithSummary);
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
        offset + parseInt(limit, 10),
      );

      const statsQuery = `
            SELECT
                COALESCE(SUM(CASE WHEN status = 'confirmed' THEN "sellingPrice" ELSE 0 END), 0) as "totalRevenue",
                COALESCE(SUM(CASE WHEN status = 'confirmed' THEN ("sellingPrice" - "remainingBalance") ELSE 0 END), 0) as "totalPaid"
            FROM bookings b
            ${whereClause.replace(/b\."/g, '"')}
        `;
      const statsResult = await req.db.query(statsQuery, queryParams);
      const summaryStats = statsResult.rows[0];
      const totalRevenue = parseFloat(summaryStats.totalRevenue);
      const totalPaid = parseFloat(summaryStats.totalPaid);

      // Get program-level cost from program_costs table
      const costResult = await req.db.query(
        'SELECT COALESCE("totalCost", 0) as "totalCost" FROM program_costs WHERE "programId" = $1 AND "userId" = $2',
        [programId, adminId]
      );
      const programTotalCost = costResult.rows.length > 0 ? parseFloat(costResult.rows[0].totalCost) : 0;

      res.status(200).json({
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
          totalCost: programTotalCost,
          totalProfit: totalRevenue - programTotalCost,
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
            (SELECT COALESCE(SUM(CASE WHEN status = 'confirmed' THEN "sellingPrice" ELSE 0 END), 0) FROM FilteredBookings) as "totalRevenue",
            (SELECT COALESCE(SUM(CASE WHEN status = 'confirmed' THEN ("sellingPrice" - "remainingBalance") ELSE 0 END), 0) FROM FilteredBookings) as "totalPaid"
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

      // Get program-level cost from program_costs table
      const costResult = await req.db.query(
        'SELECT COALESCE("totalCost", 0) as "totalCost" FROM program_costs WHERE "programId" = $1 AND "userId" = $2',
        [programId, adminId]
      );
      const programTotalCost = costResult.rows.length > 0 ? parseFloat(costResult.rows[0].totalCost) : 0;

      res.status(200).json({
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
          totalCost: programTotalCost,
          totalProfit: totalRevenue - programTotalCost,
          totalPaid: totalPaid,
          totalRemaining: totalRevenue - totalPaid,
        },
      });
    }
  } catch (error) {
    logger.error("Get Bookings By Program Error:", {
      message: error.message,
      stack: error.stack,
    });
    next(new AppError("Failed to retrieve bookings for the program.", 500));
  }
};

exports.getBookingIdsByProgram = async (req, res, next) => {
  try {
    const { programId } = req.params;
    const {
      searchTerm = "",
      statusFilter = "all",
      employeeFilter = "all",
      variationFilter = "all",
    } = req.query;
    const { adminId, role, id: userId } = req.user;

    let whereConditions = ['"userId" = $1', '"tripId" = $2'];
    const queryParams = [adminId, programId];
    let paramIndex = 3;

    if (searchTerm) {
      whereConditions.push(
        `("clientNameFr"->>'lastName' ILIKE $${paramIndex} OR "clientNameFr"->>'firstName' ILIKE $${paramIndex} OR "clientNameAr" ILIKE $${paramIndex} OR "passportNumber" ILIKE $${paramIndex})`,
      );
      queryParams.push(`%${searchTerm}%`);
      paramIndex++;
    }

    if (statusFilter === "paid") {
      whereConditions.push('"isFullyPaid" = true');
    } else if (statusFilter === "pending") {
      whereConditions.push(
        '"isFullyPaid" = false AND COALESCE(jsonb_array_length("advancePayments"), 0) > 0',
      );
    } else if (statusFilter === "notPaid") {
      whereConditions.push(
        '"isFullyPaid" = false AND COALESCE(jsonb_array_length("advancePayments"), 0) = 0',
      );
    }

    if (variationFilter && variationFilter !== "all") {
      whereConditions.push(`"variationName" = $${paramIndex}`);
      queryParams.push(variationFilter);
      paramIndex++;
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

    res.status(200).json({ ids });
  } catch (error) {
    logger.error("Get Booking Ids By Program Error:", {
      message: error.message,
      stack: error.stack,
    });
    next(new AppError("Failed to retrieve booking IDs.", 500));
  }
};

exports.getGroupBookings = async (req, res, next) => {
  try {
    const bookings = await BookingService.getGroupBookings(req.db, req.user, req.params.bookingId);
    res.status(200).json(bookings);
  } catch (error) {
    logger.error("Get Group Bookings Error:", {
      message: error.message,
      stack: error.stack,
      bookingId: req.params.bookingId,
    });
    next(new AppError("Failed to retrieve group bookings.", 500));
  }
};
