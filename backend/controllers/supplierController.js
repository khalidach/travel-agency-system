// backend/controllers/supplierController.js
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

exports.getAllSuppliers = async (req, res, next) => {
  try {
    const { withStats } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Base query to get suppliers with pagination
    let query = `
      SELECT s.* FROM suppliers s 
      WHERE s."userId" = $1 
      ORDER BY s.name ASC
      LIMIT $2 OFFSET $3
    `;

    // Count query
    const countQuery = `SELECT COUNT(*) FROM suppliers WHERE "userId" = $1`;

    const [result, countResult] = await Promise.all([
      req.db.query(query, [req.user.id, limit, offset]),
      req.db.query(countQuery, [req.user.id]),
    ]);

    const suppliers = result.rows;
    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    if (withStats === "true") {
      // Calculate stats for each supplier based on expenses
      // We match expenses.beneficiary to supplier.name
      const statsQuery = `
        SELECT 
          LOWER(TRIM(beneficiary)) as norm_beneficiary,
          SUM(amount) as total_amount,
          SUM(amount - "remainingBalance") as total_paid,
          SUM("remainingBalance") as total_remaining
        FROM expenses 
        WHERE "userId" = $1 AND type = 'order_note'
        GROUP BY LOWER(TRIM(beneficiary))
      `;

      const statsResult = await req.db.query(statsQuery, [req.user.id]);
      const statsMap = statsResult.rows.reduce((acc, row) => {
        acc[row.norm_beneficiary] = row;
        return acc;
      }, {});

      // Merge stats into suppliers
      const suppliersWithStats = suppliers.map((s) => {
        const key = s.name.trim().toLowerCase();
        return {
          ...s,
          totalAmount: parseFloat(statsMap[key]?.total_amount || 0),
          totalPaid: parseFloat(statsMap[key]?.total_paid || 0),
          totalRemaining: parseFloat(statsMap[key]?.total_remaining || 0),
        };
      });

      return res.status(200).json({
        suppliers: suppliersWithStats,
        total,
        page,
        totalPages,
      });
    }

    res.status(200).json({
      suppliers,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    logger.error("Get Suppliers Error:", error);
    next(new AppError("Failed to fetch suppliers", 500));
  }
};

exports.getSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 7;
    const offset = (page - 1) * limit;

    const result = await req.db.query(
      `SELECT * FROM suppliers WHERE id = $1 AND "userId" = $2`,
      [id, req.user.id],
    );

    if (result.rowCount === 0) {
      return next(new AppError("Supplier not found", 404));
    }

    const supplier = result.rows[0];

    // Run paginated expenses, count, and aggregation in parallel
    const [expensesResult, countResult, statsResult] = await Promise.all([
      req.db.query(
        `SELECT * FROM expenses 
         WHERE "userId" = $1 AND LOWER(TRIM(beneficiary)) = LOWER(TRIM($2)) 
         ORDER BY date DESC
         LIMIT $3 OFFSET $4`,
        [req.user.id, supplier.name, limit, offset],
      ),
      req.db.query(
        `SELECT COUNT(*) FROM expenses 
         WHERE "userId" = $1 AND LOWER(TRIM(beneficiary)) = LOWER(TRIM($2))`,
        [req.user.id, supplier.name],
      ),
      req.db.query(
        `SELECT 
           COALESCE(SUM(amount), 0) as total_amount,
           COALESCE(SUM(amount - "remainingBalance"), 0) as total_paid,
           COALESCE(SUM("remainingBalance"), 0) as total_remaining
         FROM expenses 
         WHERE "userId" = $1 AND LOWER(TRIM(beneficiary)) = LOWER(TRIM($2))`,
        [req.user.id, supplier.name],
      ),
    ]);

    const expensesTotal = parseInt(countResult.rows[0].count);
    const expensesTotalPages = Math.ceil(expensesTotal / limit);
    const stats = statsResult.rows[0];

    res.status(200).json({
      ...supplier,
      expenses: expensesResult.rows,
      expensesTotal,
      expensesTotalPages,
      expensesPage: page,
      totalAmount: parseFloat(stats.total_amount),
      totalPaid: parseFloat(stats.total_paid),
      totalRemaining: parseFloat(stats.total_remaining),
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

exports.exportSupplierAnalysis = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { lang } = req.query;

    const result = await req.db.query(
      `SELECT * FROM suppliers WHERE id = $1 AND "userId" = $2`,
      [id, req.user.id],
    );

    if (result.rowCount === 0) {
      return next(new AppError("Supplier not found", 404));
    }

    const supplier = result.rows[0];

    // Fetch all expenses for this supplier without pagination limits
    const expensesResult = await req.db.query(
      `SELECT * FROM expenses 
       WHERE "userId" = $1 AND LOWER(TRIM(beneficiary)) = LOWER(TRIM($2)) 
       ORDER BY date ASC`,
      [req.user.id, supplier.name],
    );

    // Fetch all general payments for this supplier
    const paymentsResult = await req.db.query(
      `SELECT * FROM supplier_payments 
       WHERE "supplierId" = $1 AND "userId" = $2 
       ORDER BY date ASC`,
      [id, req.user.id],
    );

    const SupplierExcelService = require("../services/SupplierExcelService");
    const workbook = await SupplierExcelService.generateSupplierExcel(
      supplier,
      expensesResult.rows,
      paymentsResult.rows,
      lang || "ar"
    );

    const sanitizedName = supplier.name.replace(/[\/\\:\*\?"<>\|]/g, "");
    
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
    logger.error("Export Supplier Analysis Error:", error);
    next(new AppError("Failed to export supplier analysis details.", 500));
  }
};

exports.addGeneralPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, currency, amountMAD, bookingType, date, method, labelPaper, chequeNumber, bankName, chequeCashingDate, transferReference, transferPayerName } = req.body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return next(new AppError("Please provide a valid payment amount.", 400));
    }

    // 1. Get the supplier
    const supplierResult = await req.db.query(
      `SELECT name FROM suppliers WHERE id = $1 AND "userId" = $2`,
      [id, req.user.id],
    );

    if (supplierResult.rowCount === 0) {
      return next(new AppError("Supplier not found", 404));
    }

    const supplierName = supplierResult.rows[0].name;

    // 2. Fetch all unpaid/partially paid order notes for this supplier with matching currency
    let query = `
      SELECT * FROM expenses 
      WHERE "userId" = $1 
        AND LOWER(TRIM(beneficiary)) = LOWER(TRIM($2)) 
        AND type = 'order_note' 
        AND "isFullyPaid" = false 
        AND "remainingBalance" > 0
        AND "currency" = $3
    `;
    const params = [req.user.id, supplierName, currency || "MAD"];

    if (bookingType && bookingType !== "all") {
      query += ` AND "bookingType" = $4`;
      params.push(bookingType);
    }

    // Order by date ASC (oldest first) so we pay older ones first
    query += ` ORDER BY date ASC, "createdAt" ASC`;

    const { rows: unpaidExpenses } = await req.db.query(query, params);

    if (unpaidExpenses.length === 0) {
      return next(new AppError("No outstanding balance found for the selected criteria and currency.", 400));
    }

    await req.db.query("BEGIN");

    // 3. Insert the general payment row into supplier_payments
    const insertPaymentQuery = `
      INSERT INTO supplier_payments (
        "userId", "supplierId", amount, currency, "amountMAD", "bookingType",
        date, method, "labelPaper", "chequeNumber", "bankName", "chequeCashingDate",
        "transferReference", "transferPayerName"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    const paymentValues = [
      req.user.id,
      id,
      parsedAmount,
      currency || "MAD",
      parseFloat(amountMAD || amount),
      bookingType || "all",
      date || new Date().toISOString().split("T")[0],
      method || "cash",
      labelPaper || `General Payment - ${supplierName}`,
      chequeNumber || null,
      bankName || null,
      chequeCashingDate || null,
      transferReference || null,
      transferPayerName || null
    ];
    
    const paymentInsertResult = await req.db.query(insertPaymentQuery, paymentValues);
    const supplierPaymentId = paymentInsertResult.rows[0].id;

    // 4. Distribute the payment across the unpaid expenses
    let remainingPaymentToDistribute = parsedAmount;
    const isForeignCurrency = (currency && currency !== "MAD");
    const totalAmountMAD = parseFloat(amountMAD || amount);
    const conversionRate = totalAmountMAD / parsedAmount;

    for (const exp of unpaidExpenses) {
      if (remainingPaymentToDistribute <= 0.01) break;

      const expRemaining = parseFloat(exp.remainingBalance);
      const paymentForThisExp = Math.min(remainingPaymentToDistribute, expRemaining);
      remainingPaymentToDistribute -= paymentForThisExp;

      const newPaymentObject = {
        _id: uuidv4(),
        id: uuidv4(),
        supplierPaymentId: supplierPaymentId,
        date: date || new Date().toISOString().split("T")[0],
        amount: paymentForThisExp,
        amountMAD: isForeignCurrency ? parseFloat((paymentForThisExp * conversionRate).toFixed(2)) : paymentForThisExp,
        currency: currency || "MAD",
        method: method || "cash",
        labelPaper: labelPaper || `General Payment Split - ${supplierName}`,
      };

      const newPaymentsList = [...(exp.advancePayments || []), newPaymentObject];
      const { remainingBalance, isFullyPaid } = calculatePaymentStatus(exp.amount, newPaymentsList);

      await req.db.query(
        `UPDATE expenses 
         SET "advancePayments" = $1, "remainingBalance" = $2, "isFullyPaid" = $3, "updatedAt" = NOW()
         WHERE id = $4`,
        [JSON.stringify(newPaymentsList), remainingBalance, isFullyPaid, exp.id]
      );
    }

    await req.db.query("COMMIT");

    res.status(200).json(paymentInsertResult.rows[0]);
  } catch (error) {
    await req.db.query("ROLLBACK");
    logger.error("Add General Payment Error:", error);
    next(new AppError("Failed to apply general payment", 500));
  }
};

exports.getGeneralPayments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [paymentsResult, countResult] = await Promise.all([
      req.db.query(
        `SELECT * FROM supplier_payments 
         WHERE "supplierId" = $1 AND "userId" = $2 
         ORDER BY date DESC, "createdAt" DESC
         LIMIT $3 OFFSET $4`,
        [id, req.user.id, limit, offset]
      ),
      req.db.query(
        `SELECT COUNT(*) FROM supplier_payments 
         WHERE "supplierId" = $1 AND "userId" = $2`,
        [id, req.user.id]
      )
    ]);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      payments: paymentsResult.rows,
      total,
      page,
      totalPages
    });
  } catch (error) {
    logger.error("Get General Payments Error:", error);
    next(new AppError("Failed to fetch general payments", 500));
  }
};

exports.deleteGeneralPayment = async (req, res, next) => {
  try {
    const { id, paymentId } = req.params;

    await req.db.query("BEGIN");

    // 1. Verify general payment exists
    const checkPayment = await req.db.query(
      `SELECT * FROM supplier_payments WHERE id = $1 AND "supplierId" = $2 AND "userId" = $3`,
      [paymentId, id, req.user.id]
    );
    if (checkPayment.rowCount === 0) {
      await req.db.query("ROLLBACK");
      return next(new AppError("General payment not found", 404));
    }

    // 2. Revert/remove the payment splits from all matching expenses
    const supplierResult = await req.db.query(
      `SELECT name FROM suppliers WHERE id = $1 AND "userId" = $2`,
      [id, req.user.id],
    );
    const supplierName = supplierResult.rows[0].name;

    const allExpensesResult = await req.db.query(
      `SELECT * FROM expenses 
       WHERE "userId" = $1 
         AND LOWER(TRIM(beneficiary)) = LOWER(TRIM($2))
         AND type = 'order_note'`,
      [req.user.id, supplierName]
    );

    for (const exp of allExpensesResult.rows) {
      if (exp.advancePayments && Array.isArray(exp.advancePayments) && exp.advancePayments.some(p => p.supplierPaymentId === parseInt(paymentId))) {
        const cleanPaymentsList = exp.advancePayments.filter(
          (p) => p.supplierPaymentId !== parseInt(paymentId)
        );
        
        const { remainingBalance, isFullyPaid } = calculatePaymentStatus(exp.amount, cleanPaymentsList);

        await req.db.query(
          `UPDATE expenses 
           SET "advancePayments" = $1, "remainingBalance" = $2, "isFullyPaid" = $3, "updatedAt" = NOW()
           WHERE id = $4`,
          [JSON.stringify(cleanPaymentsList), remainingBalance, isFullyPaid, exp.id]
        );
      }
    }

    // 3. Delete the payment row
    await req.db.query(
      `DELETE FROM supplier_payments WHERE id = $1`,
      [paymentId]
    );

    await req.db.query("COMMIT");

    res.status(200).json({ message: "General payment deleted and reverted successfully." });
  } catch (error) {
    await req.db.query("ROLLBACK");
    logger.error("Delete General Payment Error:", error);
    next(new AppError("Failed to delete general payment", 500));
  }
};

exports.updateGeneralPayment = async (req, res, next) => {
  try {
    const { id, paymentId } = req.params;
    const { amount, currency, amountMAD, bookingType, date, method, labelPaper, chequeNumber, bankName, chequeCashingDate, transferReference, transferPayerName } = req.body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return next(new AppError("Please provide a valid payment amount.", 400));
    }

    await req.db.query("BEGIN");

    // 1. Verify general payment exists
    const checkPayment = await req.db.query(
      `SELECT * FROM supplier_payments WHERE id = $1 AND "supplierId" = $2 AND "userId" = $3`,
      [paymentId, id, req.user.id]
    );
    if (checkPayment.rowCount === 0) {
      await req.db.query("ROLLBACK");
      return next(new AppError("General payment not found", 404));
    }

    // 2. Revert the old payment distribution from all matching expenses
    const supplierResult = await req.db.query(
      `SELECT name FROM suppliers WHERE id = $1 AND "userId" = $2`,
      [id, req.user.id],
    );
    const supplierName = supplierResult.rows[0].name;

    const allExpensesResult = await req.db.query(
      `SELECT * FROM expenses 
       WHERE "userId" = $1 
         AND LOWER(TRIM(beneficiary)) = LOWER(TRIM($2))
         AND type = 'order_note'`,
      [req.user.id, supplierName]
    );

    for (const exp of allExpensesResult.rows) {
      if (exp.advancePayments && Array.isArray(exp.advancePayments) && exp.advancePayments.some(p => p.supplierPaymentId === parseInt(paymentId))) {
        const cleanPaymentsList = exp.advancePayments.filter(
          (p) => p.supplierPaymentId !== parseInt(paymentId)
        );
        
        const { remainingBalance, isFullyPaid } = calculatePaymentStatus(exp.amount, cleanPaymentsList);

        await req.db.query(
          `UPDATE expenses 
           SET "advancePayments" = $1, "remainingBalance" = $2, "isFullyPaid" = $3, "updatedAt" = NOW()
           WHERE id = $4`,
          [JSON.stringify(cleanPaymentsList), remainingBalance, isFullyPaid, exp.id]
        );
      }
    }

    // 3. Fetch all unpaid/partially paid order notes for this supplier with matching currency
    let query = `
      SELECT * FROM expenses 
      WHERE "userId" = $1 
        AND LOWER(TRIM(beneficiary)) = LOWER(TRIM($2)) 
        AND type = 'order_note' 
        AND "isFullyPaid" = false 
        AND "remainingBalance" > 0
        AND "currency" = $3
    `;
    const params = [req.user.id, supplierName, currency || "MAD"];

    if (bookingType && bookingType !== "all") {
      query += ` AND "bookingType" = $4`;
      params.push(bookingType);
    }

    query += ` ORDER BY date ASC, "createdAt" ASC`;

    const { rows: unpaidExpenses } = await req.db.query(query, params);

    if (unpaidExpenses.length === 0) {
      await req.db.query("ROLLBACK");
      return next(new AppError("No outstanding balance found for the selected criteria and currency to re-apply the updated payment.", 400));
    }

    // 4. Update the supplier_payments row
    const updatePaymentQuery = `
      UPDATE supplier_payments 
      SET amount = $1, currency = $2, "amountMAD" = $3, "bookingType" = $4,
          date = $5, method = $6, "labelPaper" = $7, "chequeNumber" = $8, "bankName" = $9, "chequeCashingDate" = $10,
          "transferReference" = $11, "transferPayerName" = $12, "updatedAt" = NOW()
      WHERE id = $13 AND "userId" = $14
      RETURNING *
    `;
    const updateValues = [
      parsedAmount,
      currency || "MAD",
      parseFloat(amountMAD || amount),
      bookingType || "all",
      date || new Date().toISOString().split("T")[0],
      method || "cash",
      labelPaper || `General Payment - ${supplierName}`,
      chequeNumber || null,
      bankName || null,
      chequeCashingDate || null,
      transferReference || null,
      transferPayerName || null,
      paymentId,
      req.user.id
    ];
    
    const paymentUpdateResult = await req.db.query(updatePaymentQuery, updateValues);

    // 5. Distribute the updated payment across the unpaid expenses
    let remainingPaymentToDistribute = parsedAmount;
    const isForeignCurrency = (currency && currency !== "MAD");
    const totalAmountMAD = parseFloat(amountMAD || amount);
    const conversionRate = totalAmountMAD / parsedAmount;

    for (const exp of unpaidExpenses) {
      if (remainingPaymentToDistribute <= 0.01) break;

      const expRemaining = parseFloat(exp.remainingBalance);
      const paymentForThisExp = Math.min(remainingPaymentToDistribute, expRemaining);
      remainingPaymentToDistribute -= paymentForThisExp;

      const newPaymentObject = {
        _id: uuidv4(),
        id: uuidv4(),
        supplierPaymentId: parseInt(paymentId),
        date: date || new Date().toISOString().split("T")[0],
        amount: paymentForThisExp,
        amountMAD: isForeignCurrency ? parseFloat((paymentForThisExp * conversionRate).toFixed(2)) : paymentForThisExp,
        currency: currency || "MAD",
        method: method || "cash",
        labelPaper: labelPaper || `General Payment Split - ${supplierName}`,
      };

      const newPaymentsList = [...(exp.advancePayments || []), newPaymentObject];
      const { remainingBalance, isFullyPaid } = calculatePaymentStatus(exp.amount, newPaymentsList);

      await req.db.query(
        `UPDATE expenses 
         SET "advancePayments" = $1, "remainingBalance" = $2, "isFullyPaid" = $3, "updatedAt" = NOW()
         WHERE id = $4`,
        [JSON.stringify(newPaymentsList), remainingBalance, isFullyPaid, exp.id]
      );
    }

    await req.db.query("COMMIT");

    res.status(200).json(paymentUpdateResult.rows[0]);
  } catch (error) {
    await req.db.query("ROLLBACK");
    logger.error("Update General Payment Error:", error);
    next(new AppError("Failed to update general payment", 500));
  }
};

