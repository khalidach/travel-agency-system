// backend/controllers/expenseController.js
const { v4: uuidv4 } = require("uuid");
const { getNextPaymentId } = require("../services/sequence.service");
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
    const {
      type,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      searchTerm,
      bookingType,
      beneficiary,
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let query = `SELECT * FROM expenses WHERE "userId" = $1`;
    let countQuery = `SELECT COUNT(*) FROM expenses WHERE "userId" = $1`;
    const params = [req.user.id];

    if (type) {
      query += ` AND type = $${params.length + 1}`;
      countQuery += ` AND type = $${params.length + 1}`;
      params.push(type);
    }

    if (startDate && endDate) {
      query += ` AND date BETWEEN $${params.length + 1} AND $${params.length + 2}`;
      countQuery += ` AND date BETWEEN $${params.length + 1} AND $${params.length + 2}`;
      params.push(startDate, endDate);
    }

    if (searchTerm) {
      query += ` AND (description ILIKE $${params.length + 1} OR beneficiary ILIKE $${params.length + 1})`;
      countQuery += ` AND (description ILIKE $${params.length + 1} OR beneficiary ILIKE $${params.length + 1})`;
      params.push(`%${searchTerm}%`);
    }

    if (bookingType) {
      query += ` AND "bookingType" = $${params.length + 1}`;
      countQuery += ` AND "bookingType" = $${params.length + 1}`;
      params.push(bookingType);
    }

    if (beneficiary) {
      query += ` AND beneficiary = $${params.length + 1}`;
      countQuery += ` AND beneficiary = $${params.length + 1}`;
      params.push(beneficiary);
    }

    query += ` ORDER BY date DESC, "createdAt" DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const queryParams = [...params, limitNum, offset];

    const [result, countResult] = await Promise.all([
      req.db.query(query, queryParams),
      req.db.query(countQuery, params),
    ]);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      expenses: result.rows,
      total,
      page: pageNum,
      totalPages,
    });
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
      description,
      items,
      currency,
      beneficiary,
      amount,
      date,
      paymentMethod,
      bookingType,
      reservationNumber,
    } = req.body;

    let advancePayments = [];
    let remainingBalance = amount;
    let isFullyPaid = false;

    if (type === "regular") {
      isFullyPaid = true;
      remainingBalance = 0;
      const paymentId = await getNextPaymentId(req.db, req.user.id);
      advancePayments = [
        {
          _id: uuidv4(),
          id: uuidv4(),
          paymentID: paymentId,
          date: date,
          amount: amount,
          amountMAD: amount,
          currency: "MAD",
          method: paymentMethod || "cash",
          labelPaper: "Auto-payment for Regular Expense",
        },
      ];
    }

    const { rows } = await req.db.query(
      `INSERT INTO expenses 
      ("userId", "employeeId", type, category, description, beneficiary, amount, 
       "advancePayments", "remainingBalance", "isFullyPaid", date, items, currency, 
       "bookingType", "reservationNumber")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
        bookingType || null,
        reservationNumber || null,
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
      bookingType,
      reservationNumber,
    } = req.body;

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
      const paymentId = await getNextPaymentId(req.db, req.user.id);
      advancePayments = [
        {
          _id: uuidv4(),
          id: uuidv4(),
          paymentID: paymentId,
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
      const status = calculatePaymentStatus(amount, advancePayments);
      remainingBalance = status.remainingBalance;
      isFullyPaid = status.isFullyPaid;
    }

    const { rows } = await req.db.query(
      `UPDATE expenses 
      SET category = $1, description = $2, beneficiary = $3, amount = $4, date = $5, 
          "advancePayments" = $6, "remainingBalance" = $7, "isFullyPaid" = $8, 
          items = $9, currency = $10, 
          "bookingType" = $11, "reservationNumber" = $12, 
          "updatedAt" = NOW()
      WHERE id = $13 AND "userId" = $14
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
        bookingType || null,
        reservationNumber || null,
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

exports.bulkDeleteExpenses = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return next(new AppError("Please provide an array of expense IDs", 400));
    }

    const result = await req.db.query(
      `DELETE FROM expenses WHERE id = ANY($1::int[]) AND "userId" = $2 RETURNING id`,
      [ids, req.user.id],
    );

    res.status(200).json({
      message: `${result.rowCount} expense(s) deleted`,
      deletedCount: result.rowCount,
    });
  } catch (error) {
    logger.error("Bulk Delete Expenses Error:", error);
    next(new AppError("Failed to bulk delete expenses", 500));
  }
};

exports.addPayment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const check = await req.db.query(
      `SELECT type FROM expenses WHERE id = $1`,
      [id],
    );
    if (check.rows.length > 0 && check.rows[0].type === "regular") {
      return next(
        new AppError("Cannot manually add payments to regular expenses.", 400),
      );
    }

    const paymentId = await getNextPaymentId(req.db, req.user.id);
    const payment = { ...req.body, _id: uuidv4(), paymentID: paymentId };

    const { rows } = await req.db.query(
      `SELECT * FROM expenses WHERE id = $1 AND "userId" = $2`,
      [id, req.user.id],
    );

    if (rows.length === 0) return next(new AppError("Expense not found", 404));

    const expense = rows[0];
    const newPayments = [...(expense.advancePayments || []), payment];

    const { remainingBalance, isFullyPaid } = calculatePaymentStatus(
      expense.amount,
      newPayments,
    );

    if (remainingBalance < -0.1) {
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

// --- NEW: Update Payment Function ---
exports.updatePayment = async (req, res, next) => {
  try {
    const { id, paymentId } = req.params;
    const { amount, date, method, ...otherFields } = req.body;

    const check = await req.db.query(
      `SELECT type FROM expenses WHERE id = $1`,
      [id],
    );
    if (check.rows.length > 0 && check.rows[0].type === "regular") {
      return next(
        new AppError(
          "Cannot manually edit payments for regular expenses.",
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
    const payments = expense.advancePayments || [];

    const paymentIndex = payments.findIndex(
      (p) => p.id === paymentId || p._id === paymentId,
    );
    if (paymentIndex === -1)
      return next(new AppError("Payment not found", 404));

    const oldPayment = payments[paymentIndex];
    const updatedPayment = {
      ...oldPayment,
      ...req.body,
      amount: parseFloat(amount),
      // Preserve IDs
      id: oldPayment.id,
      _id: oldPayment._id,
    };

    const newPayments = [...payments];
    newPayments[paymentIndex] = updatedPayment;

    const { remainingBalance, isFullyPaid } = calculatePaymentStatus(
      expense.amount,
      newPayments,
    );

    if (remainingBalance < -0.1) {
      return next(
        new AppError("Payment amount exceeds total expense amount", 400),
      );
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
    logger.error("Update Payment Error:", error);
    next(new AppError("Failed to update payment", 500));
  }
};

exports.deletePayment = async (req, res, next) => {
  try {
    const { id, paymentId } = req.params;

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
