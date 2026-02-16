// backend/controllers/expenseController.js
const { v4: uuidv4 } = require("uuid");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");

const calculatePaymentStatus = (amount, payments) => {
  const totalPaid = payments.reduce(
    (sum, p) => sum + parseFloat(p.amount || 0),
    0,
  );
  const remaining = parseFloat(amount) - totalPaid;
  return {
    remainingBalance: remaining > 0.1 ? remaining : 0, // 0.1 tolerance for float math
    isFullyPaid: remaining <= 0.1,
  };
};

exports.getAllExpenses = async (req, res, next) => {
  try {
    const { type, startDate, endDate } = req.query;
    let query = `SELECT * FROM expenses WHERE "userId" = $1`;
    const params = [req.user.id];

    if (type) {
      query += ` AND type = $${params.length + 1}`;
      params.push(type);
    }

    if (startDate && endDate) {
      query += ` AND date BETWEEN $${params.length + 1} AND $${params.length + 2}`;
      params.push(startDate, endDate);
    }

    query += ` ORDER BY date DESC`;

    const result = await req.db.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    logger.error("Get Expenses Error:", error);
    next(new AppError("Failed to fetch expenses", 500));
  }
};

exports.createExpense = async (req, res, next) => {
  try {
    const {
      type,
      category,
      description, // For Order Note, this might be a summary or empty if items exist
      items, // NEW: Array of items
      currency, // NEW: Currency code
      beneficiary,
      amount,
      date,
      paymentMethod,
    } = req.body;

    let advancePayments = [];
    let remainingBalance = amount;
    let isFullyPaid = false;

    // --- NEW LOGIC: Regular expenses are paid immediately ---
    if (type === "regular") {
      isFullyPaid = true;
      remainingBalance = 0;
      // Create a full payment record automatically
      advancePayments = [
        {
          _id: uuidv4(),
          id: uuidv4(),
          date: date,
          amount: amount,
          amountMAD: amount, // Assume MAD for regular expenses
          currency: "MAD",
          method: paymentMethod || "cash",
          labelPaper: "Auto-payment for Regular Expense",
        },
      ];
    }

    const { rows } = await req.db.query(
      `INSERT INTO expenses 
      ("userId", "employeeId", type, category, description, beneficiary, amount, "advancePayments", "remainingBalance", "isFullyPaid", date, items, currency)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        req.user.id,
        req.user.role === "employee" ? req.user.id : null,
        type,
        category,
        description,
        beneficiary,
        amount,
        JSON.stringify(advancePayments),
        remainingBalance,
        isFullyPaid,
        date,
        JSON.stringify(items || []),
        currency || "MAD",
      ],
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    logger.error("Create Expense Error:", error);
    next(new AppError("Failed to create expense", 500));
  }
};

exports.updateExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      category,
      description,
      items,
      currency,
      beneficiary,
      amount,
      date,
      paymentMethod,
    } = req.body;

    // Fetch existing
    const existing = await req.db.query(
      `SELECT * FROM expenses WHERE id = $1 AND "userId" = $2`,
      [id, req.user.id],
    );

    if (existing.rowCount === 0)
      return next(new AppError("Expense not found", 404));

    const expense = existing.rows[0];
    let advancePayments = expense.advancePayments || [];
    let remainingBalance;
    let isFullyPaid;

    if (expense.type === "regular") {
      // For regular expenses, ensure the single payment matches the new amount
      advancePayments = [
        {
          _id: uuidv4(),
          id: uuidv4(),
          date: date,
          amount: amount,
          amountMAD: amount,
          currency: "MAD",
          method: paymentMethod || "cash",
          labelPaper: "Auto-payment (Updated)",
        },
      ];
      remainingBalance = 0;
      isFullyPaid = true;
    } else {
      // For order notes, preserve payments but recalculate balance
      const status = calculatePaymentStatus(amount, advancePayments);
      remainingBalance = status.remainingBalance;
      isFullyPaid = status.isFullyPaid;
    }

    const { rows } = await req.db.query(
      `UPDATE expenses 
      SET category = $1, description = $2, beneficiary = $3, amount = $4, date = $5, 
          "advancePayments" = $6, "remainingBalance" = $7, "isFullyPaid" = $8, 
          items = $9, currency = $10, "updatedAt" = NOW()
      WHERE id = $11 AND "userId" = $12
      RETURNING *`,
      [
        category,
        description,
        beneficiary,
        amount,
        date,
        JSON.stringify(advancePayments),
        remainingBalance,
        isFullyPaid,
        JSON.stringify(items || []),
        currency || "MAD",
        id,
        req.user.id,
      ],
    );

    res.status(200).json(rows[0]);
  } catch (error) {
    logger.error("Update Expense Error:", error);
    next(new AppError("Failed to update expense", 500));
  }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await req.db.query(
      `DELETE FROM expenses WHERE id = $1 AND "userId" = $2 RETURNING id`,
      [id, req.user.id],
    );

    if (result.rowCount === 0)
      return next(new AppError("Expense not found", 404));

    res.status(200).json({ message: "Expense deleted" });
  } catch (error) {
    logger.error("Delete Expense Error:", error);
    next(new AppError("Failed to delete expense", 500));
  }
};

exports.addPayment = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check type first
    const check = await req.db.query(
      `SELECT type FROM expenses WHERE id = $1`,
      [id],
    );
    if (check.rows.length > 0 && check.rows[0].type === "regular") {
      return next(
        new AppError("Cannot manually add payments to regular expenses.", 400),
      );
    }

    // payment object includes amount (foreign), amountMAD (local), etc.
    const payment = { ...req.body, _id: uuidv4(), id: uuidv4() };

    const { rows } = await req.db.query(
      `SELECT * FROM expenses WHERE id = $1 AND "userId" = $2`,
      [id, req.user.id],
    );

    if (rows.length === 0) return next(new AppError("Expense not found", 404));

    const expense = rows[0];
    const newPayments = [...(expense.advancePayments || []), payment];

    // Calculate status based on foreign currency amount
    const { remainingBalance, isFullyPaid } = calculatePaymentStatus(
      expense.amount,
      newPayments,
    );

    if (remainingBalance < -0.1) {
      // Small float tolerance
      return next(new AppError("Payment exceeds remaining balance", 400));
    }

    const updated = await req.db.query(
      `UPDATE expenses 
       SET "advancePayments" = $1, "remainingBalance" = $2, "isFullyPaid" = $3, "updatedAt" = NOW()
       WHERE id = $4
       RETURNING *`,
      [JSON.stringify(newPayments), remainingBalance, isFullyPaid, id],
    );

    res.status(200).json(updated.rows[0]);
  } catch (error) {
    logger.error("Add Payment Error:", error);
    next(new AppError("Failed to add payment", 500));
  }
};

exports.deletePayment = async (req, res, next) => {
  try {
    const { id, paymentId } = req.params;

    // Check type first
    const check = await req.db.query(
      `SELECT type FROM expenses WHERE id = $1`,
      [id],
    );
    if (check.rows.length > 0 && check.rows[0].type === "regular") {
      return next(
        new AppError(
          "Cannot manually delete payments from regular expenses.",
          400,
        ),
      );
    }

    const { rows } = await req.db.query(
      `SELECT * FROM expenses WHERE id = $1 AND "userId" = $2`,
      [id, req.user.id],
    );

    if (rows.length === 0) return next(new AppError("Expense not found", 404));

    const expense = rows[0];
    const newPayments = (expense.advancePayments || []).filter(
      (p) => p._id !== paymentId && p.id !== paymentId,
    );
    const { remainingBalance, isFullyPaid } = calculatePaymentStatus(
      expense.amount,
      newPayments,
    );

    const updated = await req.db.query(
      `UPDATE expenses 
       SET "advancePayments" = $1, "remainingBalance" = $2, "isFullyPaid" = $3, "updatedAt" = NOW()
       WHERE id = $4
       RETURNING *`,
      [JSON.stringify(newPayments), remainingBalance, isFullyPaid, id],
    );

    res.status(200).json(updated.rows[0]);
  } catch (error) {
    logger.error("Delete Payment Error:", error);
    next(new AppError("Failed to delete payment", 500));
  }
};
