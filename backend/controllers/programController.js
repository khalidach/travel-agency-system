// backend/controllers/programController.js
const ProgramUpdateService = require("../services/ProgramUpdateService");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");

exports.getAllPrograms = async (req, res, next) => {
  try {
    const { adminId } = req.user;
    const {
      searchTerm,
      filterType,
      page = 1,
      noPaginate = "false",
      view = "list",
    } = req.query;
    let { limit = 10 } = req.query;

    let baseQuery = "FROM programs p";
    let whereConditions = ['p."userId" = $1'];
    const queryParams = [adminId];
    let paramIndex = 2;

    if (searchTerm) {
      whereConditions.push(`p.name ILIKE $${paramIndex++}`);
      queryParams.push(`%${searchTerm}%`);
    }

    if (filterType && filterType !== "all") {
      whereConditions.push(`p.type = $${paramIndex++}`);
      queryParams.push(filterType);
    }

    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    let dataQueryFields = `
        p.*,
        (SELECT COUNT(*) FROM bookings b WHERE b."tripId"::int = p.id) as "totalBookings"
    `;

    if (view === "pricing" || view === "full") {
      dataQueryFields += `,
            (SELECT row_to_json(pp) FROM program_pricing pp WHERE pp."programId" = p.id LIMIT 1) as pricing
        `;
    }

    if (view === "rooms" || view === "full") {
      dataQueryFields += `,
            (
                SELECT COALESCE(jsonb_agg(stats), '[]'::jsonb)
                FROM (
                    SELECT
                        defined_hotels.hotel_name as "hotelName",
                        COALESCE(jsonb_array_length(rm.rooms), 0) as "roomCount"
                    FROM (
                        SELECT DISTINCT hotel_name
                        FROM
                            jsonb_array_elements(p.packages) AS package,
                            jsonb_each(package->'hotels') AS city_hotels,
                            jsonb_array_elements_text(city_hotels.value) AS hotel_name
                        WHERE hotel_name IS NOT NULL AND hotel_name != ''
                    ) AS defined_hotels(hotel_name)
                    LEFT JOIN room_managements rm ON rm."programId" = p.id AND rm."hotelName" = defined_hotels.hotel_name
                ) as stats
            ) as "hotelRoomCounts",
            (
                SELECT COUNT(DISTINCT (occupant->>'id')::int)
                FROM room_managements rm_inner,
                     jsonb_array_elements(rm_inner.rooms) AS r,
                     jsonb_array_elements(r->'occupants') AS occupant
                WHERE rm_inner."programId" = p.id AND occupant::text != 'null'
            ) as "totalOccupants"
        `;
    }

    if (noPaginate === "true") {
      const dataQuery = `
          SELECT ${dataQueryFields}
          ${baseQuery}
          ${whereClause}
          ORDER BY p."createdAt" DESC
        `;
      const programsResult = await req.db.query(dataQuery, queryParams);
      return res.status(200).json({ data: programsResult.rows });
    }

    const countQuery = `SELECT COUNT(*) ${baseQuery} ${whereClause}`;
    const totalCountResult = await req.db.query(countQuery, queryParams);
    const totalCount = parseInt(totalCountResult.rows[0].count, 10);

    const dataQuery = `
        SELECT ${dataQueryFields}
        ${baseQuery}
        ${whereClause}
        ORDER BY p."createdAt" DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const offset = (page - 1) * limit;
    queryParams.push(limit, offset);

    const programsResult = await req.db.query(dataQuery, queryParams);

    res.status(200).json({
      data: programsResult.rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    logger.error("Get All Programs Error:", {
      message: error.message,
      stack: error.stack,
    });
    next(new AppError("Failed to retrieve programs.", 500));
  }
};

exports.getProgramById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adminId } = req.user;
    const { rows } = await req.db.query(
      'SELECT * FROM programs WHERE id = $1 AND "userId" = $2',
      [id, adminId]
    );

    if (rows.length === 0) {
      return next(
        new AppError("Program not found or you are not authorized.", 404)
      );
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    logger.error("Get Program by ID Error:", {
      message: error.message,
      stack: error.stack,
      programId: req.params.id,
    });
    next(new AppError("Failed to retrieve program.", 500));
  }
};

exports.createProgram = async (req, res, next) => {
  try {
    const { name, type, duration, cities, packages } = req.body;
    const userId = req.user.adminId;
    const employeeId = req.user.role !== "admin" ? req.user.id : null;

    const { rows } = await req.db.query(
      'INSERT INTO programs ("userId", "employeeId", name, type, duration, cities, packages) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [
        userId,
        employeeId,
        name,
        type,
        duration,
        JSON.stringify(cities),
        JSON.stringify(packages),
      ]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    logger.error("Create Program Error:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
    });
    next(new AppError("Failed to create program.", 400));
  }
};

exports.updateProgram = async (req, res, next) => {
  const { id } = req.params;
  const { name, type, duration, cities, packages } = req.body;
  const client = await req.db.connect();

  try {
    await client.query("BEGIN");

    const oldProgramResult = await client.query(
      'SELECT * FROM programs WHERE id = $1 AND "userId" = $2',
      [id, req.user.adminId]
    );

    if (oldProgramResult.rows.length === 0) {
      throw new AppError("Program not found or you are not authorized.", 404);
    }
    const oldProgram = oldProgramResult.rows[0];

    if (req.user.role !== "admin" && oldProgram.employeeId !== req.user.id) {
      throw new AppError(
        "You can only edit programs that you have created.",
        403
      );
    }

    const { rows: updatedProgramRows } = await client.query(
      'UPDATE programs SET name = $1, type = $2, duration = $3, cities = $4, packages = $5, "updatedAt" = NOW() WHERE id = $6 RETURNING *',
      [
        name,
        type,
        duration,
        JSON.stringify(cities),
        JSON.stringify(packages),
        id,
      ]
    );
    const updatedProgram = updatedProgramRows[0];

    await ProgramUpdateService.handleCascadingUpdates(
      client,
      oldProgram,
      updatedProgram
    );

    await client.query("COMMIT");
    res.status(200).json(updatedProgram);
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Update Program Error:", {
      message: error.message,
      stack: error.stack,
      programId: id,
    });
    next(new AppError("Failed to update program.", 400));
  } finally {
    client.release();
  }
};

exports.deleteProgram = async (req, res, next) => {
  const { id } = req.params;
  const client = await req.db.connect();

  try {
    await client.query("BEGIN");

    const programResult = await client.query(
      'SELECT * FROM programs WHERE id = $1 AND "userId" = $2',
      [id, req.user.adminId]
    );

    if (programResult.rows.length === 0) {
      throw new AppError("Program not found or you are not authorized.", 404);
    }

    const program = programResult.rows[0];

    if (req.user.role !== "admin" && program.employeeId !== req.user.id) {
      throw new AppError(
        "You can only delete programs that you have created.",
        403
      );
    }

    await client.query('DELETE FROM program_pricing WHERE "programId" = $1', [
      id,
    ]);
    await client.query('DELETE FROM bookings WHERE "tripId" = $1', [id]);
    await client.query("DELETE FROM programs WHERE id = $1", [id]);

    await client.query("COMMIT");

    res.status(200).json({
      message: "Program and all associated data deleted successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Delete Program Error:", {
      message: error.message,
      stack: error.stack,
      programId: id,
    });
    next(new AppError("Failed to delete program.", 500));
  } finally {
    client.release();
  }
};
