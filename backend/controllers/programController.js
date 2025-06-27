// backend/controllers/programController.js

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

    let query = 'SELECT * FROM programs WHERE "userId" = $1';
    const queryParams = [adminId];
    let paramIndex = 2;

    if (searchTerm) {
      query += ` AND name ILIKE $${paramIndex++}`;
      queryParams.push(`%${searchTerm}%`);
    }

    if (filterType && filterType !== "all") {
      query += ` AND type = $${paramIndex++}`;
      queryParams.push(filterType);
    }

    // If noPaginate is true, return all matching results without pagination
    if (noPaginate === "true") {
      query += ` ORDER BY "createdAt" DESC`;
      const programsResult = await req.db.query(query, queryParams);
      // The response is shaped to match what the frontend expects { data: [...] }
      return res.json({ data: programsResult.rows });
    }

    // --- Pagination Logic ---
    // First, get the total count of matching records for pagination info
    const countQuery = `SELECT COUNT(*) FROM (${query.replace(
      "SELECT *",
      "SELECT id"
    )}) as count_table`;
    const countParams = [...queryParams]; // Clone params for the count query
    const totalCountResult = await req.db.query(countQuery, countParams);
    const totalCount = parseInt(totalCountResult.rows[0].count, 10);

    // Then, add LIMIT and OFFSET for the actual data query
    query += ` ORDER BY "createdAt" DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    const offset = (page - 1) * limit;
    queryParams.push(limit, offset);

    const programsResult = await req.db.query(query, queryParams);

    res.json({
      data: programsResult.rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    console.error("Get All Programs Error:", error);
    res.status(500).json({ message: error.message });
  }
};

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

  try {
    const programResult = await req.db.query(
      'SELECT * FROM programs WHERE id = $1 AND "userId" = $2',
      [id, req.user.adminId]
    );

    if (programResult.rows.length === 0) {
      return res.status(404).json({
        message: "Program not found or you are not authorized to access it.",
      });
    }

    const program = programResult.rows[0];

    // An admin can edit any program. An employee/manager can only edit their own.
    if (req.user.role !== "admin" && program.employeeId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only edit programs that you have created." });
    }

    const { rows } = await req.db.query(
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
    res.json(rows[0]);
  } catch (error) {
    console.error("Update Program Error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.deleteProgram = async (req, res) => {
  const { id } = req.params;
  const client = await req.db.connect(); // Use a client for transaction

  try {
    await client.query("BEGIN"); // Start transaction

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

    // Authorization check
    if (req.user.role !== "admin" && program.employeeId !== req.user.id) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        message: "You can only delete programs that you have created.",
      });
    }

    // --- CASCADING DELETE LOGIC ---
    // 1. Delete associated program pricing
    await client.query('DELETE FROM program_pricing WHERE "programId" = $1', [
      id,
    ]);

    // 2. Delete associated bookings
    await client.query('DELETE FROM bookings WHERE "tripId" = $1', [id]);

    // 3. Delete the program itself
    await client.query("DELETE FROM programs WHERE id = $1", [id]);

    await client.query("COMMIT"); // Commit the transaction

    res.json({
      message: "Program and all associated data deleted successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK"); // Rollback on error
    console.error("Delete Program Error:", error);
    res.status(500).json({ message: error.message });
  } finally {
    client.release(); // Release the client back to the pool
  }
};
