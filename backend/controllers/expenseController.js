// backend/controllers/expenseController.js
const { v4: uuidv4 } = require("uuid");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");
const { applyExcelPageSetup } = require("../utils/excelHelper");

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

/**
 * Checks if a supplier has unused balance from general payments (solde is minus / money in wallet).
 * If so, automatically creates splits from those general payments and applies them to this expense.
 */
const autoAllocateSupplierWallet = async (
  db,
  userId,
  { beneficiary, amount, currency = "MAD", bookingType, advancePayments = [] },
  excludeExpenseId = null,
) => {
  if (!beneficiary || !beneficiary.trim()) {
    const status = calculatePaymentStatus(amount, advancePayments);
    return {
      advancePayments,
      remainingBalance: status.remainingBalance,
      isFullyPaid: status.isFullyPaid,
    };
  }

  // 1. Find supplier by name
  const supplierResult = await db.query(
    `SELECT id, name FROM suppliers WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND "userId" = $2`,
    [beneficiary, userId],
  );
  if (supplierResult.rowCount === 0) {
    const status = calculatePaymentStatus(amount, advancePayments);
    return {
      advancePayments,
      remainingBalance: status.remainingBalance,
      isFullyPaid: status.isFullyPaid,
    };
  }

  const supplier = supplierResult.rows[0];

  // 2. Fetch all general payments for this supplier
  const paymentsResult = await db.query(
    `SELECT * FROM supplier_payments 
     WHERE "supplierId" = $1 AND "userId" = $2 
     ORDER BY date ASC, "createdAt" ASC`,
    [supplier.id, userId],
  );
  if (paymentsResult.rowCount === 0) {
    const status = calculatePaymentStatus(amount, advancePayments);
    return {
      advancePayments,
      remainingBalance: status.remainingBalance,
      isFullyPaid: status.isFullyPaid,
    };
  }

  // 3. Fetch all other expenses for this supplier to calculate already used amounts of each general payment
  let otherExpensesQuery = `
    SELECT id, "advancePayments" FROM expenses 
    WHERE "userId" = $1 AND LOWER(TRIM(beneficiary)) = LOWER(TRIM($2)) AND type = 'order_note'
  `;
  const otherExpensesParams = [userId, supplier.name];
  if (excludeExpenseId) {
    otherExpensesQuery += ` AND id != $3`;
    otherExpensesParams.push(excludeExpenseId);
  }
  const otherExpensesResult = await db.query(otherExpensesQuery, otherExpensesParams);

  const allocatedMap = {};
  for (const exp of otherExpensesResult.rows) {
    const payments = exp.advancePayments || [];
    if (Array.isArray(payments)) {
      for (const p of payments) {
        if (p.supplierPaymentId) {
          const spId = parseInt(p.supplierPaymentId);
          allocatedMap[spId] = (allocatedMap[spId] || 0) + parseFloat(p.amount || 0);
        }
      }
    }
  }

  // Also include any supplierPaymentId already in current advancePayments
  if (Array.isArray(advancePayments)) {
    for (const p of advancePayments) {
      if (p.supplierPaymentId) {
        const spId = parseInt(p.supplierPaymentId);
        allocatedMap[spId] = (allocatedMap[spId] || 0) + parseFloat(p.amount || 0);
      }
    }
  }

  let updatedPayments = [...advancePayments];
  let currentStatus = calculatePaymentStatus(amount, updatedPayments);
  let remainingToPay = currentStatus.remainingBalance;

  if (remainingToPay <= 0.01) {
    return {
      advancePayments: updatedPayments,
      remainingBalance: currentStatus.remainingBalance,
      isFullyPaid: currentStatus.isFullyPaid,
    };
  }

  // 4. For each general payment, check matching currency & bookingType and allocate unallocated amount
  for (const sp of paymentsResult.rows) {
    if (remainingToPay <= 0.01) break;

    // Currency check
    const spCurrency = sp.currency || "MAD";
    const expCurrency = currency || "MAD";
    if (spCurrency !== expCurrency) continue;

    // Booking type check
    const spBookingType = sp.bookingType || "all";
    if (spBookingType !== "all") {
      if (spBookingType === "Visa/Transfer") {
        if (!["Visa", "Transfer"].includes(bookingType)) continue;
      } else if (bookingType && spBookingType !== bookingType) {
        continue;
      }
    }

    const spAmount = parseFloat(sp.amount || 0);
    const spUsed = allocatedMap[sp.id] || 0;
    const unallocated = spAmount - spUsed;

    if (unallocated <= 0.01) continue;

    const paymentForThisExp = Math.min(unallocated, remainingToPay);
    if (paymentForThisExp <= 0.001) continue;

    const isForeignCurrency = (expCurrency !== "MAD");
    const totalAmountMAD = parseFloat(sp.amountMAD || sp.amount);
    const conversionRate = totalAmountMAD / spAmount;

    const newPaymentObject = {
      _id: uuidv4(),
      id: uuidv4(),
      supplierPaymentId: sp.id,
      date: sp.date || new Date().toISOString().split("T")[0],
      amount: parseFloat(paymentForThisExp.toFixed(2)),
      amountMAD: isForeignCurrency
        ? parseFloat((paymentForThisExp * conversionRate).toFixed(2))
        : parseFloat(paymentForThisExp.toFixed(2)),
      currency: expCurrency,
      method: sp.method || "cash",
      labelPaper: sp.labelPaper || `General Payment Split - ${supplier.name}`,
    };

    updatedPayments.push(newPaymentObject);
    allocatedMap[sp.id] = spUsed + paymentForThisExp;
    remainingToPay -= paymentForThisExp;
  }

  const finalStatus = calculatePaymentStatus(amount, updatedPayments);
  return {
    advancePayments: updatedPayments,
    remainingBalance: finalStatus.remainingBalance,
    isFullyPaid: finalStatus.isFullyPaid,
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

    const branchIdFilter = req.user.role === 'admin' || req.user.role === 'owner' ? req.query.branchId : req.user.branchId;
    if (branchIdFilter && branchIdFilter !== 'all') {
      query += ` AND "branchId" = $${params.length + 1}`;
      countQuery += ` AND "branchId" = $${params.length + 1}`;
      params.push(branchIdFilter);
    }

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
      query += ` AND LOWER(TRIM(beneficiary)) = LOWER(TRIM($${params.length + 1}))`;
      countQuery += ` AND LOWER(TRIM(beneficiary)) = LOWER(TRIM($${params.length + 1}))`;
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
      branchId,
    } = req.body;

    const branchIdToSave = req.user.role === "employee" || req.user.role === "manager" ? (req.user.branchId || null) : (branchId || null);

    let advancePayments = [];
    let remainingBalance = amount;
    let isFullyPaid = false;

    if (type === "regular") {
      isFullyPaid = true;
      remainingBalance = 0;
      advancePayments = [
        {
          _id: uuidv4(),
          id: uuidv4(),
          date: date,
          amount: amount,
          amountMAD: amount,
          currency: "MAD",
          method: paymentMethod || "cash",
          labelPaper: "Auto-payment for Regular Expense",
        },
      ];
    } else if (type === "order_note" && beneficiary) {
      const walletAllocation = await autoAllocateSupplierWallet(
        req.db,
        req.user.id,
        {
          beneficiary,
          amount,
          currency: currency || "MAD",
          bookingType,
          advancePayments: [],
        },
      );
      advancePayments = walletAllocation.advancePayments;
      remainingBalance = walletAllocation.remainingBalance;
      isFullyPaid = walletAllocation.isFullyPaid;
    }

    const { rows } = await req.db.query(
      `INSERT INTO expenses 
      ("userId", "employeeId", type, category, description, beneficiary, amount, 
       "advancePayments", "remainingBalance", "isFullyPaid", date, items, currency, 
       "bookingType", "reservationNumber", "branchId")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
        branchIdToSave,
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
      branchId,
    } = req.body;

    const existing = await req.db.query(
      `SELECT * FROM expenses WHERE id = $1 AND "userId" = $2`,
      [id, req.user.id],
    );

    if (existing.rowCount === 0)
      return next(new AppError("Expense not found", 404));

    await req.db.query("BEGIN");

    const expense = existing.rows[0];
    let advancePayments = expense.advancePayments || [];
    let remainingBalance;
    let isFullyPaid;

    const targetBeneficiary = beneficiary !== undefined ? beneficiary : expense.beneficiary;
    const targetCurrency = currency || expense.currency || "MAD";
    const targetBookingType = bookingType !== undefined ? bookingType : expense.bookingType;
    const newAmount = parseFloat(amount);

    if (expense.type === "regular") {
      advancePayments = [
        {
          _id: uuidv4(),
          id: uuidv4(),
          date: date,
          amount: newAmount,
          amountMAD: newAmount,
          currency: "MAD",
          method: paymentMethod || "cash",
          labelPaper: "Auto-payment (Updated)",
        },
      ];
      remainingBalance = 0;
      isFullyPaid = true;
    } else {
      const totalPaid = advancePayments.reduce(
        (sum, p) => sum + (parseFloat(p.amount || 0) || parseFloat(p.amountMAD || 0)),
        0,
      );

      if (totalPaid > 0 && newAmount < totalPaid) {
        // Price was reduced below total payments made.
        // Trim excess from the most recent payments.
        let remainingToTrim = parseFloat((totalPaid - newAmount).toFixed(2));
        const trimmedSplits = [];

        for (let i = advancePayments.length - 1; i >= 0; i--) {
          if (remainingToTrim <= 0.001) break;
          const p = advancePayments[i];
          const pAmt = parseFloat(p.amount || 0);

          if (pAmt <= remainingToTrim + 0.001) {
            trimmedSplits.push({ ...p, trimmedAmount: pAmt });
            remainingToTrim = parseFloat((remainingToTrim - pAmt).toFixed(2));
            advancePayments.splice(i, 1);
          } else {
            const trimPortion = parseFloat(remainingToTrim.toFixed(2));
            const keepPortion = parseFloat((pAmt - trimPortion).toFixed(2));
            trimmedSplits.push({ ...p, trimmedAmount: trimPortion });
            p.amount = keepPortion;
            if (p.amountMAD && pAmt > 0) {
              p.amountMAD = parseFloat((keepPortion * (parseFloat(p.amountMAD) / pAmt)).toFixed(2));
            }
            remainingToTrim = 0;
          }
        }

        // Find or create supplier in suppliers table for targetBeneficiary
        let supplier = null;
        if (targetBeneficiary && targetBeneficiary.trim()) {
          const supplierResult = await req.db.query(
            `SELECT id, name FROM suppliers WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND "userId" = $2`,
            [targetBeneficiary, req.user.id],
          );
          if (supplierResult.rowCount > 0) {
            supplier = supplierResult.rows[0];
          } else {
            const insertSup = await req.db.query(
              `INSERT INTO suppliers ("userId", name) VALUES ($1, $2) RETURNING id, name`,
              [req.user.id, targetBeneficiary.trim()],
            );
            supplier = insertSup.rows[0];
          }
        }

        // For direct payments that were trimmed, insert them into supplier_payments
        for (const trimmedSplit of trimmedSplits) {
          if (!trimmedSplit.supplierPaymentId && supplier) {
            const isForeign = (trimmedSplit.currency && trimmedSplit.currency !== "MAD");
            const splitAmountMAD = trimmedSplit.amountMAD
              ? parseFloat(trimmedSplit.amountMAD)
              : (isForeign ? parseFloat((trimmedSplit.trimmedAmount * 1).toFixed(2)) : trimmedSplit.trimmedAmount);

            const insertSpResult = await req.db.query(
              `INSERT INTO supplier_payments (
                "userId", "supplierId", amount, currency, "amountMAD", "bookingType",
                date, method, "labelPaper"
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              RETURNING id`,
              [
                req.user.id,
                supplier.id,
                trimmedSplit.trimmedAmount,
                trimmedSplit.currency || targetCurrency,
                splitAmountMAD,
                "all",
                trimmedSplit.date || date || new Date().toISOString().split("T")[0],
                trimmedSplit.method || "cash",
                `فائض دفعة من المصروف #${id} - ${(expense.description || "").substring(0, 50)}`,
              ],
            );
            trimmedSplit.supplierPaymentId = insertSpResult.rows[0].id;
          }
        }

        // Try to allocate excess to any other unpaid expenses for the same supplier
        if (targetBeneficiary && targetBeneficiary.trim()) {
          const otherExpensesResult = await req.db.query(
            `SELECT * FROM expenses 
             WHERE "userId" = $1 
               AND LOWER(TRIM(beneficiary)) = LOWER(TRIM($2)) 
               AND type = 'order_note' 
               AND id != $3
               AND "isFullyPaid" = false 
               AND "remainingBalance" > 0.01
             ORDER BY date ASC, "createdAt" ASC`,
            [req.user.id, targetBeneficiary, id],
          );
          const otherExpenses = otherExpensesResult.rows;

          for (const trimmedSplit of trimmedSplits) {
            if (!trimmedSplit.supplierPaymentId) continue;
            let unallocatedInSplit = trimmedSplit.trimmedAmount;
            const splitCurrency = trimmedSplit.currency || targetCurrency;

            for (const otherExp of otherExpenses) {
              if (unallocatedInSplit <= 0.001) break;
              if (otherExp.currency !== splitCurrency) continue;

              const otherRemaining = parseFloat(otherExp.remainingBalance || 0);
              if (otherRemaining <= 0.001) continue;

              const toPay = Math.min(unallocatedInSplit, otherRemaining);
              if (toPay <= 0.001) continue;

              const isForeignOther = (otherExp.currency && otherExp.currency !== "MAD");
              const totalAmountMAD = parseFloat(trimmedSplit.amountMAD || trimmedSplit.trimmedAmount);
              const conversionRate = totalAmountMAD / trimmedSplit.trimmedAmount;

              const newPaymentObj = {
                _id: uuidv4(),
                id: uuidv4(),
                supplierPaymentId: trimmedSplit.supplierPaymentId,
                date: trimmedSplit.date || new Date().toISOString().split("T")[0],
                amount: parseFloat(toPay.toFixed(2)),
                amountMAD: isForeignOther
                  ? parseFloat((toPay * conversionRate).toFixed(2))
                  : parseFloat(toPay.toFixed(2)),
                currency: otherExp.currency,
                method: trimmedSplit.method || "cash",
                labelPaper: `تحويل فائض من المصروف #${id} - ${targetBeneficiary}`,
              };

              const updatedOtherPayments = [...(otherExp.advancePayments || []), newPaymentObj];
              const status = calculatePaymentStatus(otherExp.amount, updatedOtherPayments);
              otherExp.advancePayments = updatedOtherPayments;
              otherExp.remainingBalance = status.remainingBalance;
              otherExp.isFullyPaid = status.isFullyPaid;

              await req.db.query(
                `UPDATE expenses 
                 SET "advancePayments" = $1, "remainingBalance" = $2, "isFullyPaid" = $3, "updatedAt" = NOW()
                 WHERE id = $4`,
                [
                  JSON.stringify(updatedOtherPayments),
                  status.remainingBalance,
                  status.isFullyPaid,
                  otherExp.id,
                ],
              );

              unallocatedInSplit = parseFloat((unallocatedInSplit - toPay).toFixed(2));
            }
          }
        }

        remainingBalance = 0;
        isFullyPaid = true;
      } else {
        const walletAllocation = await autoAllocateSupplierWallet(
          req.db,
          req.user.id,
          {
            beneficiary: targetBeneficiary,
            amount: newAmount,
            currency: targetCurrency,
            bookingType: targetBookingType,
            advancePayments,
          },
          id,
        );

        advancePayments = walletAllocation.advancePayments;
        remainingBalance = walletAllocation.remainingBalance;
        isFullyPaid = walletAllocation.isFullyPaid;
      }
    }

    const branchIdToSave =
      req.user.role === "employee" || req.user.role === "manager"
        ? expense.branchId
        : branchId !== undefined
        ? branchId
        : expense.branchId;

    const { rows } = await req.db.query(
      `UPDATE expenses 
      SET category = $1, description = $2, beneficiary = $3, amount = $4, date = $5, 
          "advancePayments" = $6, "remainingBalance" = $7, "isFullyPaid" = $8, 
          items = $9, currency = $10, 
          "bookingType" = $11, "reservationNumber" = $12, "branchId" = $13,
          "updatedAt" = NOW()
      WHERE id = $14 AND "userId" = $15
      RETURNING *`,
      [
        category,
        description,
        targetBeneficiary,
        newAmount,
        date,
        JSON.stringify(advancePayments),
        remainingBalance,
        isFullyPaid,
        JSON.stringify(items || []),
        targetCurrency,
        targetBookingType || null,
        reservationNumber || null,
        branchIdToSave,
        id,
        req.user.id,
      ],
    );

    await req.db.query("COMMIT");
    res.status(200).json(rows[0]);
  } catch (error) {
    try {
      await req.db.query("ROLLBACK");
    } catch (rbErr) {
      // ignore rollback failure
    }
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

    const payment = { ...req.body, _id: uuidv4() };

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

exports.exportSingleExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { lang } = req.query;

    const result = await req.db.query(
      `SELECT * FROM expenses WHERE id = $1 AND "userId" = $2`,
      [id, req.user.id],
    );

    if (result.rowCount === 0) {
      return next(new AppError("Expense not found", 404));
    }

    const expense = result.rows[0];

    const ExpenseExcelService = require("../services/ExpenseExcelService");
    const workbook = await ExpenseExcelService.generateExpenseExcel(
      expense,
      lang || "ar"
    );

    const sanitizedName = (expense.description || "expense").replace(/[\/\\:\*\?"<>\|]/g, "");
    
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(sanitizedName)}.xlsx"; filename*=UTF-8''${encodeURIComponent(sanitizedName)}.xlsx`
    );

    applyExcelPageSetup(workbook);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error("Export Single Expense Error:", error);
    next(new AppError("Failed to export expense details.", 500));
  }
};

exports.exportIataWallet = async (req, res, next) => {
  try {
    const { lang } = req.query;

    let query = `SELECT * FROM expenses WHERE "userId" = $1`;
    const params = [req.user.id];

    const branchIdFilter = req.user.role === 'admin' || req.user.role === 'owner' ? req.query.branchId : req.user.branchId;
    if (branchIdFilter && branchIdFilter !== 'all') {
      query += ` AND "branchId" = $${params.length + 1}`;
      params.push(branchIdFilter);
    }

    query += ` ORDER BY date ASC, "createdAt" ASC`;

    const { rows } = await req.db.query(query, params);

    const IataWalletExcelService = require("../services/IataWalletExcelService");
    const workbook = await IataWalletExcelService.generateIataWalletExcel(
      rows,
      lang || "ar"
    );

    const fileName = lang === "ar" || !lang ? "كشف_حساب_محفظة_إياتا" : "iata_easypay_ledger";

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileName)}.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}.xlsx`
    );

    applyExcelPageSetup(workbook);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error("Export IATA Wallet Error:", error);
    next(new AppError("Failed to export IATA wallet statement.", 500));
  }
};

exports.exportExpensesList = async (req, res, next) => {
  try {
    const {
      type,
      startDate,
      endDate,
      searchTerm,
      bookingType,
      beneficiary,
      lang,
    } = req.query;

    let query = `SELECT * FROM expenses WHERE "userId" = $1`;
    const params = [req.user.id];

    const branchIdFilter = req.user.role === 'admin' || req.user.role === 'owner' ? req.query.branchId : req.user.branchId;
    if (branchIdFilter && branchIdFilter !== 'all') {
      query += ` AND "branchId" = $${params.length + 1}`;
      params.push(branchIdFilter);
    }

    if (type) {
      query += ` AND type = $${params.length + 1}`;
      params.push(type);
    }

    if (startDate && endDate) {
      query += ` AND date BETWEEN $${params.length + 1} AND $${params.length + 2}`;
      params.push(startDate, endDate);
    }

    if (searchTerm) {
      query += ` AND (description ILIKE $${params.length + 1} OR beneficiary ILIKE $${params.length + 1})`;
      params.push(`%${searchTerm}%`);
    }

    if (bookingType) {
      query += ` AND "bookingType" = $${params.length + 1}`;
      params.push(bookingType);
    }

    if (beneficiary) {
      query += ` AND LOWER(TRIM(beneficiary)) = LOWER(TRIM($${params.length + 1}))`;
      params.push(beneficiary);
    }

    query += ` ORDER BY date DESC, "createdAt" DESC`;

    const { rows } = await req.db.query(query, params);

    const ExpenseExcelService = require("../services/ExpenseExcelService");
    const workbook = await ExpenseExcelService.generateExpensesListExcel(
      rows,
      type || "regular",
      lang || "ar"
    );

    const fileName = type === "regular"
      ? (lang === "ar" || !lang ? "تقرير_المصاريف_العادية" : "regular_expenses_report")
      : (lang === "ar" || !lang ? "تقرير_مذكرات_الطلب" : "order_notes_report");

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileName)}.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}.xlsx`
    );

    applyExcelPageSetup(workbook);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error("Export Expenses List Error:", error);
    next(new AppError("Failed to export expenses list.", 500));
  }
};

