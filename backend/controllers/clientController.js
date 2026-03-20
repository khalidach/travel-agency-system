// backend/controllers/clientController.js
const AppError = require("../utils/appError");
const logger = require("../utils/logger");

exports.getAllClients = async (req, res, next) => {
  try {
    const { withStats } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Base query to get clients with pagination
    let query = `
      SELECT c.* FROM clients c 
      WHERE c."userId" = $1 
      ORDER BY c.name ASC
      LIMIT $2 OFFSET $3
    `;

    // Count query
    const countQuery = `SELECT COUNT(*) FROM clients WHERE "userId" = $1`;

    const [result, countResult] = await Promise.all([
      req.db.query(query, [req.user.id, limit, offset]),
      req.db.query(countQuery, [req.user.id]),
    ]);

    const clients = result.rows;
    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    if (withStats === "true") {
      // Calculate stats for each client based on incomes
      // We match incomes.client to clients.name
      const statsQuery = `
        SELECT 
          client,
          SUM(amount) as total_amount,
          SUM(amount - "remainingBalance") as total_paid,
          SUM("remainingBalance") as total_remaining
        FROM incomes 
        WHERE "userId" = $1
        GROUP BY client
      `;

      const statsResult = await req.db.query(statsQuery, [req.user.id]);
      const statsMap = statsResult.rows.reduce((acc, row) => {
        acc[row.client] = row;
        return acc;
      }, {});

      // Merge stats into clients
      const clientsWithStats = clients.map((c) => ({
        ...c,
        totalAmount: parseFloat(statsMap[c.name]?.total_amount || 0),
        totalPaid: parseFloat(statsMap[c.name]?.total_paid || 0),
        totalRemaining: parseFloat(statsMap[c.name]?.total_remaining || 0),
      }));

      return res.status(200).json({
        clients: clientsWithStats,
        total,
        page,
        totalPages,
      });
    }

    res.status(200).json({
      clients,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    logger.error("Get Clients Error:", error);
    next(new AppError("Failed to fetch clients", 500));
  }
};

exports.getClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 7;
    const offset = (page - 1) * limit;

    const result = await req.db.query(
      `SELECT * FROM clients WHERE id = $1 AND "userId" = $2`,
      [id, req.user.id],
    );

    if (result.rowCount === 0) {
      return next(new AppError("Client not found", 404));
    }

    const client = result.rows[0];

    // Run paginated incomes, count, and aggregation in parallel
    const [incomesResult, countResult, statsResult] = await Promise.all([
      req.db.query(
        `SELECT * FROM incomes 
         WHERE "userId" = $1 AND client = $2 
         ORDER BY date DESC
         LIMIT $3 OFFSET $4`,
        [req.user.id, client.name, limit, offset],
      ),
      req.db.query(
        `SELECT COUNT(*) FROM incomes 
         WHERE "userId" = $1 AND client = $2`,
        [req.user.id, client.name],
      ),
      req.db.query(
        `SELECT 
           COALESCE(SUM(amount), 0) as total_amount,
           COALESCE(SUM(amount - "remainingBalance"), 0) as total_paid,
           COALESCE(SUM("remainingBalance"), 0) as total_remaining
         FROM incomes 
         WHERE "userId" = $1 AND client = $2`,
        [req.user.id, client.name],
      ),
    ]);

    const incomesTotal = parseInt(countResult.rows[0].count);
    const incomesTotalPages = Math.ceil(incomesTotal / limit);
    const stats = statsResult.rows[0];

    res.status(200).json({
      ...client,
      incomes: incomesResult.rows,
      incomesTotal,
      incomesTotalPages,
      incomesPage: page,
      totalAmount: parseFloat(stats.total_amount),
      totalPaid: parseFloat(stats.total_paid),
      totalRemaining: parseFloat(stats.total_remaining),
    });
  } catch (error) {
    logger.error("Get Client Error:", error);
    next(new AppError("Failed to fetch client details", 500));
  }
};

exports.createClient = async (req, res, next) => {
  try {
    const { name, email, phone, address, ice } = req.body;

    // Check if name exists
    const existing = await req.db.query(
      `SELECT id FROM clients WHERE name = $1 AND "userId" = $2`,
      [name, req.user.id],
    );

    if (existing.rowCount > 0) {
      return next(new AppError("Client with this name already exists", 400));
    }

    const { rows } = await req.db.query(
      `INSERT INTO clients ("userId", name, email, phone, address, ice)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, name, email, phone, address, ice],
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    logger.error("Create Client Error:", error);
    next(new AppError("Failed to create client", 500));
  }
};

exports.updateClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, ice } = req.body;

    // We also need to update the client name in incomes if the client name changes
    // to maintain the link.
    const oldClientResult = await req.db.query(
      `SELECT name FROM clients WHERE id = $1 AND "userId" = $2`,
      [id, req.user.id],
    );

    if (oldClientResult.rowCount === 0) {
      return next(new AppError("Client not found", 404));
    }

    const oldName = oldClientResult.rows[0].name;

    await req.db.query("BEGIN");

    const { rows } = await req.db.query(
      `UPDATE clients 
       SET name = $1, email = $2, phone = $3, address = $4, ice = $5, "updatedAt" = NOW()
       WHERE id = $6 AND "userId" = $7
       RETURNING *`,
      [name, email, phone, address, ice, id, req.user.id],
    );

    if (oldName !== name) {
      await req.db.query(
        `UPDATE incomes SET client = $1 WHERE client = $2 AND "userId" = $3`,
        [name, oldName, req.user.id],
      );
    }

    await req.db.query("COMMIT");

    res.status(200).json(rows[0]);
  } catch (error) {
    await req.db.query("ROLLBACK");
    logger.error("Update Client Error:", error);
    next(new AppError("Failed to update client", 500));
  }
};

exports.deleteClient = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await req.db.query(
      `DELETE FROM clients WHERE id = $1 AND "userId" = $2 RETURNING id`,
      [id, req.user.id],
    );

    if (result.rowCount === 0)
      return next(new AppError("Client not found", 404));

    res.status(200).json({ message: "Client deleted" });
  } catch (error) {
    logger.error("Delete Client Error:", error);
    next(new AppError("Failed to delete client", 500));
  }
};
