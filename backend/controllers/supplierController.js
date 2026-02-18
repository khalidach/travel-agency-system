// backend/controllers/supplierController.js
const AppError = require("../utils/appError");
const logger = require("../utils/logger");

exports.getAllSuppliers = async (req, res, next) => {
  try {
    const { withStats } = req.query;

    // Base query to get suppliers
    let query = `
      SELECT s.* FROM suppliers s 
      WHERE s."userId" = $1 
      ORDER BY s.name ASC
    `;

    const result = await req.db.query(query, [req.user.id]);
    const suppliers = result.rows;

    if (withStats === "true") {
      // Calculate stats for each supplier based on expenses
      // We match expenses.beneficiary to supplier.name
      const statsQuery = `
        SELECT 
          beneficiary,
          SUM(amount) as total_amount,
          SUM(amount - "remainingBalance") as total_paid,
          SUM("remainingBalance") as total_remaining
        FROM expenses 
        WHERE "userId" = $1 AND type = 'order_note'
        GROUP BY beneficiary
      `;

      const statsResult = await req.db.query(statsQuery, [req.user.id]);
      const statsMap = statsResult.rows.reduce((acc, row) => {
        acc[row.beneficiary] = row;
        return acc;
      }, {});

      // Merge stats into suppliers
      const suppliersWithStats = suppliers.map((s) => ({
        ...s,
        totalAmount: parseFloat(statsMap[s.name]?.total_amount || 0),
        totalPaid: parseFloat(statsMap[s.name]?.total_paid || 0),
        totalRemaining: parseFloat(statsMap[s.name]?.total_remaining || 0),
      }));

      return res.status(200).json(suppliersWithStats);
    }

    res.status(200).json(suppliers);
  } catch (error) {
    logger.error("Get Suppliers Error:", error);
    next(new AppError("Failed to fetch suppliers", 500));
  }
};

exports.getSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await req.db.query(
      `SELECT * FROM suppliers WHERE id = $1 AND "userId" = $2`,
      [id, req.user.id],
    );

    if (result.rowCount === 0) {
      return next(new AppError("Supplier not found", 404));
    }

    const supplier = result.rows[0];

    // Get expense history for this supplier
    const expensesResult = await req.db.query(
      `SELECT * FROM expenses 
       WHERE "userId" = $1 AND beneficiary = $2 
       ORDER BY date DESC`,
      [req.user.id, supplier.name],
    );

    res.status(200).json({
      ...supplier,
      expenses: expensesResult.rows,
    });
  } catch (error) {
    logger.error("Get Supplier Error:", error);
    next(new AppError("Failed to fetch supplier details", 500));
  }
};

exports.createSupplier = async (req, res, next) => {
  try {
    const { name, email, phone, landline } = req.body;

    // Check if name exists
    const existing = await req.db.query(
      `SELECT id FROM suppliers WHERE name = $1 AND "userId" = $2`,
      [name, req.user.id],
    );

    if (existing.rowCount > 0) {
      return next(new AppError("Supplier with this name already exists", 400));
    }

    const { rows } = await req.db.query(
      `INSERT INTO suppliers ("userId", name, email, phone, landline)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, name, email, phone, landline],
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    logger.error("Create Supplier Error:", error);
    next(new AppError("Failed to create supplier", 500));
  }
};

exports.updateSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone, landline } = req.body;

    // We also need to update the beneficiary name in expenses if the supplier name changes
    // to maintain the link.
    const oldSupplierResult = await req.db.query(
      `SELECT name FROM suppliers WHERE id = $1 AND "userId" = $2`,
      [id, req.user.id],
    );

    if (oldSupplierResult.rowCount === 0) {
      return next(new AppError("Supplier not found", 404));
    }

    const oldName = oldSupplierResult.rows[0].name;

    await req.db.query("BEGIN");

    const { rows } = await req.db.query(
      `UPDATE suppliers 
       SET name = $1, email = $2, phone = $3, landline = $4, "updatedAt" = NOW()
       WHERE id = $5 AND "userId" = $6
       RETURNING *`,
      [name, email, phone, landline, id, req.user.id],
    );

    if (oldName !== name) {
      await req.db.query(
        `UPDATE expenses SET beneficiary = $1 WHERE beneficiary = $2 AND "userId" = $3`,
        [name, oldName, req.user.id],
      );
    }

    await req.db.query("COMMIT");

    res.status(200).json(rows[0]);
  } catch (error) {
    await req.db.query("ROLLBACK");
    logger.error("Update Supplier Error:", error);
    next(new AppError("Failed to update supplier", 500));
  }
};

exports.deleteSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await req.db.query(
      `DELETE FROM suppliers WHERE id = $1 AND "userId" = $2 RETURNING id`,
      [id, req.user.id],
    );

    if (result.rowCount === 0)
      return next(new AppError("Supplier not found", 404));

    res.status(200).json({ message: "Supplier deleted" });
  } catch (error) {
    logger.error("Delete Supplier Error:", error);
    next(new AppError("Failed to delete supplier", 500));
  }
};
