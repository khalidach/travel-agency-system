// backend/controllers/programController.js
const ProgramUpdateService = require("../services/ProgramUpdateService");

exports.getAllPrograms = async (req, res) => {
  try {
    const { adminId } = req.user;
    const {
      searchTerm,
      filterType,
      page = 1,
      noPaginate = "false",
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

    // Updated data fields with more detailed room management stats
    const dataQueryFields = `
        p.*,
        (SELECT COUNT(*) FROM bookings b WHERE b."tripId"::int = p.id) as "totalBookings",
        (SELECT row_to_json(pp) FROM program_pricing pp WHERE pp."programId" = p.id LIMIT 1) as pricing,
        (
            SELECT COALESCE(jsonb_agg(stats), '[]'::jsonb)
            FROM (
                SELECT
                    defined_hotels.hotel_name as "hotelName",
                    COALESCE(jsonb_array_length(rm.rooms), 0) as "roomCount"
                FROM (
                    -- Extract all unique hotel names from the program's packages
                    SELECT DISTINCT hotel_name
                    FROM
                        jsonb_array_elements(p.packages) AS package,
                        jsonb_each(package->'hotels') AS city_hotels,
                        jsonb_array_elements_text(city_hotels.value) AS hotel_name
                    WHERE hotel_name IS NOT NULL AND hotel_name != ''
                ) AS defined_hotels(hotel_name)
                -- Left join with room managements to get the count of rooms if they exist
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

    if (noPaginate === "true") {
      const dataQuery = `
          SELECT ${dataQueryFields}
          ${baseQuery}
          ${whereClause}
          ORDER BY p."createdAt" DESC
        `;
      const programsResult = await req.db.query(dataQuery, queryParams);
      return res.json({ data: programsResult.rows });
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

    res.json({
      data: programsResult.rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Get All Programs Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// --- Other functions (getProgramById, createProgram, etc.) remain unchanged ---

exports.getProgramById = async (req, res) => {
  const { id } = req.params;
  const { adminId } = req.user;
  try {
    const { rows } = await req.db.query(
      'SELECT * FROM programs WHERE id = $1 AND "userId" = $2',
      [id, adminId]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Program not found or you are not authorized" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Get Program by ID Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.createProgram = async (req, res) => {
  const { name, type, duration, cities, packages } = req.body;
  const userId = req.user.adminId;
  const employeeId = req.user.role !== "admin" ? req.user.id : null;

  try {
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
    console.error("Create Program Error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.updateProgram = async (req, res) => {
  const { id } = req.params;
  const { name, type, duration, cities, packages } = req.body;
  const client = await req.db.connect(); // Use a client for the transaction

  try {
    await client.query("BEGIN"); // Start transaction

    const oldProgramResult = await client.query(
      'SELECT * FROM programs WHERE id = $1 AND "userId" = $2',
      [id, req.user.adminId]
    );

    if (oldProgramResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Program not found or you are not authorized to access it.",
      });
    }
    const oldProgram = oldProgramResult.rows[0];

    if (req.user.role !== "admin" && oldProgram.employeeId !== req.user.id) {
      await client.query("ROLLBACK");
      return res
        .status(403)
        .json({ message: "You can only edit programs that you have created." });
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
    res.json(updatedProgram);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update Program Error:", error);
    res.status(400).json({ message: error.message });
  } finally {
    client.release();
  }
};

exports.deleteProgram = async (req, res) => {
  const { id } = req.params;
  const client = await req.db.connect();

  try {
    await client.query("BEGIN");

    const programResult = await client.query(
      'SELECT * FROM programs WHERE id = $1 AND "userId" = $2',
      [id, req.user.adminId]
    );

    if (programResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Program not found or you are not authorized to access it.",
      });
    }

    const program = programResult.rows[0];

    if (req.user.role !== "admin" && program.employeeId !== req.user.id) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        message: "You can only delete programs that you have created.",
      });
    }

    await client.query('DELETE FROM program_pricing WHERE "programId" = $1', [
      id,
    ]);
    await client.query('DELETE FROM bookings WHERE "tripId" = $1', [id]);
    await client.query("DELETE FROM programs WHERE id = $1", [id]);

    await client.query("COMMIT");

    res.json({
      message: "Program and all associated data deleted successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Delete Program Error:", error);
    res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
};
