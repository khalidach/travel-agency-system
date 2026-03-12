// backend/controllers/incomeController.js
const { v4: uuidv4 } = require("uuid");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");

const calculatePaymentStatus = (amount, payments) => {
    const totalPaid = payments.reduce(
        (sum, p) => sum + parseFloat(p.amount || 0),
        0
    );
    const remaining = parseFloat(amount) - totalPaid;
    return {
        remainingBalance: remaining > 0.1 ? remaining : 0,
        isFullyPaid: remaining <= 0.1,
    };
};

exports.getAllIncomes = async (req, res, next) => {
    try {
        const {
            type,
            startDate,
            endDate,
            page = 1,
            limit = 10,
            searchTerm,
            client,
        } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        let query = `SELECT * FROM incomes WHERE "userId" = $1`;
        let countQuery = `SELECT COUNT(*) FROM incomes WHERE "userId" = $1`;
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
            query += ` AND (description ILIKE $${params.length + 1} OR client ILIKE $${params.length + 1} OR "deliveryNoteNumber" ILIKE $${params.length + 1})`;
            countQuery += ` AND (description ILIKE $${params.length + 1} OR client ILIKE $${params.length + 1} OR "deliveryNoteNumber" ILIKE $${params.length + 1})`;
            params.push(`%${searchTerm}%`);
        }



        if (client) {
            query += ` AND client ILIKE $${params.length + 1}`;
            countQuery += ` AND client ILIKE $${params.length + 1}`;
            params.push(`%${client}%`);
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
            incomes: result.rows,
            total,
            page: pageNum,
            totalPages,
        });
    } catch (error) {
        logger.error("Get Incomes Error:", error);
        next(new AppError("Failed to fetch incomes", 500));
    }
};

exports.createIncome = async (req, res, next) => {
    try {
        const {
            type,
            category,
            description,
            items,
            client,
            amount,
            date,
            deliveryNoteNumber,
            paymentMethod,
        } = req.body;

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
                    method: paymentMethod || "cash",
                    labelPaper: "Auto-payment for Regular Income",
                },
            ];
        } else {
            // Handle initial advance payments if provided for Delivery Note
            if (req.body.advancePayments && req.body.advancePayments.length > 0) {
                advancePayments = req.body.advancePayments.map(p => ({
                    ...p,
                    _id: p._id || uuidv4(),
                    id: p.id || uuidv4()
                }));
                const status = calculatePaymentStatus(amount, advancePayments);
                remainingBalance = status.remainingBalance;
                isFullyPaid = status.isFullyPaid;
            }
        }
        if (type === "delivery_note" && !deliveryNoteNumber) {
            const currentYear = new Date(date).getFullYear();
            const yearPrefix = `${currentYear}-`;
            
            const lastIncomeRes = await req.db.query(
                `SELECT "deliveryNoteNumber" FROM incomes 
                 WHERE "userId" = $1 AND type = 'delivery_note' 
                 AND "deliveryNoteNumber" LIKE $2
                 ORDER BY id DESC LIMIT 1`,
                [req.user.id, `${yearPrefix}%`]
            );

            let nextNumber = 1;
            if (lastIncomeRes.rows.length > 0) {
                const lastNum = lastIncomeRes.rows[0].deliveryNoteNumber;
                const parts = lastNum.split("-");
                if (parts.length > 1) {
                    const lastCount = parseInt(parts[parts.length - 1], 10);
                    if (!isNaN(lastCount)) {
                        nextNumber = lastCount + 1;
                    }
                }
            }
            req.body.deliveryNoteNumber = `${yearPrefix}${nextNumber.toString().padStart(4, "0")}`;
        }

        const { rows } = await req.db.query(
            `INSERT INTO incomes 
      ("userId", "employeeId", type, category, description, client, amount, 
       "advancePayments", "remainingBalance", "isFullyPaid", date, items, "deliveryNoteNumber")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
            [
                req.user.id,
                req.user.role === "employee" ? req.user.id : null,
                type,
                category,
                description,
                client,
                amount,
                JSON.stringify(advancePayments),
                remainingBalance,
                isFullyPaid,
                date,
                JSON.stringify(items || []),
                req.body.deliveryNoteNumber || deliveryNoteNumber,
            ]
        );

        res.status(201).json(rows[0]);
    } catch (error) {
        logger.error("Create Income Error:", error);
        next(new AppError("Failed to create income", 500));
    }
};

exports.updateIncome = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            category,
            description,
            items,
            client,
            amount,
            date,
            deliveryNoteNumber,
            paymentMethod,
        } = req.body;

        const existing = await req.db.query(
            `SELECT * FROM incomes WHERE id = $1 AND "userId" = $2`,
            [id, req.user.id]
        );

        if (existing.rowCount === 0)
            return next(new AppError("Income not found", 404));

        const income = existing.rows[0];
        let advancePayments = income.advancePayments || [];
        let remainingBalance;
        let isFullyPaid;

        if (income.type === "regular") {
            advancePayments = [
                {
                    _id: uuidv4(),
                    id: uuidv4(),
                    date: date,
                    amount: amount,
                    amountMAD: amount,
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
            `UPDATE incomes 
      SET category = $1, description = $2, client = $3, amount = $4, date = $5, 
          "advancePayments" = $6, "remainingBalance" = $7, "isFullyPaid" = $8, 
          items = $9, "deliveryNoteNumber" = $10,
          "updatedAt" = NOW()
      WHERE id = $11 AND "userId" = $12
      RETURNING *`,
            [
                category,
                description,
                client,
                amount,
                date,
                JSON.stringify(advancePayments),
                remainingBalance,
                isFullyPaid,
                JSON.stringify(items || []),
                deliveryNoteNumber,
                id,
                req.user.id,
            ]
        );

        res.status(200).json(rows[0]);
    } catch (error) {
        logger.error("Update Income Error:", error);
        next(new AppError("Failed to update income", 500));
    }
};

exports.deleteIncome = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await req.db.query(
            `DELETE FROM incomes WHERE id = $1 AND "userId" = $2 RETURNING id`,
            [id, req.user.id]
        );

        if (result.rowCount === 0)
            return next(new AppError("Income not found", 404));

        res.status(200).json({ message: "Income deleted" });
    } catch (error) {
        logger.error("Delete Income Error:", error);
        next(new AppError("Failed to delete income", 500));
    }
};

exports.bulkDeleteIncomes = async (req, res, next) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return next(new AppError("Please provide an array of income IDs", 400));
        }

        const result = await req.db.query(
            `DELETE FROM incomes WHERE id = ANY($1::int[]) AND "userId" = $2 RETURNING id`,
            [ids, req.user.id]
        );

        res.status(200).json({
            message: `${result.rowCount} income(s) deleted`,
            deletedCount: result.rowCount,
        });
    } catch (error) {
        logger.error("Bulk Delete Incomes Error:", error);
        next(new AppError("Failed to bulk delete incomes", 500));
    }
};

exports.addPayment = async (req, res, next) => {
    try {
        const { id } = req.params;

        const check = await req.db.query(
            `SELECT type FROM incomes WHERE id = $1`,
            [id]
        );
        if (check.rows.length > 0 && check.rows[0].type === "regular") {
            return next(
                new AppError("Cannot manually add payments to regular incomes.", 400)
            );
        }

        const payment = { ...req.body, _id: uuidv4() };

        const { rows } = await req.db.query(
            `SELECT * FROM incomes WHERE id = $1 AND "userId" = $2`,
            [id, req.user.id]
        );

        if (rows.length === 0) return next(new AppError("Income not found", 404));

        const income = rows[0];
        const newPayments = [...(income.advancePayments || []), payment];

        const { remainingBalance, isFullyPaid } = calculatePaymentStatus(
            income.amount,
            newPayments
        );

        if (remainingBalance < -0.1) {
            return next(new AppError("Payment exceeds remaining balance", 400));
        }

        const updated = await req.db.query(
            `UPDATE incomes 
       SET "advancePayments" = $1, "remainingBalance" = $2, "isFullyPaid" = $3, "updatedAt" = NOW()
       WHERE id = $4
       RETURNING *`,
            [JSON.stringify(newPayments), remainingBalance, isFullyPaid, id]
        );

        res.status(200).json(updated.rows[0]);
    } catch (error) {
        logger.error("Add Payment Error:", error);
        next(new AppError("Failed to add payment", 500));
    }
};

exports.updatePayment = async (req, res, next) => {
    try {
        const { id, paymentId } = req.params;
        const { amount, date, method, ...otherFields } = req.body;

        const check = await req.db.query(
            `SELECT type FROM incomes WHERE id = $1`,
            [id]
        );
        if (check.rows.length > 0 && check.rows[0].type === "regular") {
            return next(
                new AppError("Cannot manually edit payments for regular incomes.", 400)
            );
        }

        const { rows } = await req.db.query(
            `SELECT * FROM incomes WHERE id = $1 AND "userId" = $2`,
            [id, req.user.id]
        );

        if (rows.length === 0) return next(new AppError("Income not found", 404));

        const income = rows[0];
        const payments = income.advancePayments || [];

        const paymentIndex = payments.findIndex(
            (p) => p.id === paymentId || p._id === paymentId
        );
        if (paymentIndex === -1)
            return next(new AppError("Payment not found", 404));

        const oldPayment = payments[paymentIndex];
        const updatedPayment = {
            ...oldPayment,
            ...req.body,
            amount: parseFloat(amount),
            id: oldPayment.id,
            _id: oldPayment._id,
        };

        const newPayments = [...payments];
        newPayments[paymentIndex] = updatedPayment;

        const { remainingBalance, isFullyPaid } = calculatePaymentStatus(
            income.amount,
            newPayments
        );

        if (remainingBalance < -0.1) {
            return next(
                new AppError("Payment amount exceeds total income amount", 400)
            );
        }

        const updated = await req.db.query(
            `UPDATE incomes 
       SET "advancePayments" = $1, "remainingBalance" = $2, "isFullyPaid" = $3, "updatedAt" = NOW()
       WHERE id = $4
       RETURNING *`,
            [JSON.stringify(newPayments), remainingBalance, isFullyPaid, id]
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
            `SELECT type FROM incomes WHERE id = $1`,
            [id]
        );
        if (check.rows.length > 0 && check.rows[0].type === "regular") {
            return next(
                new AppError(
                    "Cannot manually delete payments from regular incomes.",
                    400
                )
            );
        }

        const { rows } = await req.db.query(
            `SELECT * FROM incomes WHERE id = $1 AND "userId" = $2`,
            [id, req.user.id]
        );

        if (rows.length === 0) return next(new AppError("Income not found", 404));

        const income = rows[0];
        const newPayments = (income.advancePayments || []).filter(
            (p) => p._id !== paymentId && p.id !== paymentId
        );
        const { remainingBalance, isFullyPaid } = calculatePaymentStatus(
            income.amount,
            newPayments
        );

        const updated = await req.db.query(
            `UPDATE incomes 
       SET "advancePayments" = $1, "remainingBalance" = $2, "isFullyPaid" = $3, "updatedAt" = NOW()
       WHERE id = $4
       RETURNING *`,
            [JSON.stringify(newPayments), remainingBalance, isFullyPaid, id]
        );

        res.status(200).json(updated.rows[0]);
    } catch (error) {
        logger.error("Delete Payment Error:", error);
        next(new AppError("Failed to delete payment", 500));
    }
};

exports.convertToFacture = async (req, res, next) => {
    const dbClient = await req.db.connect();
    try {
        const { id } = req.params;
        const { adminId, id: employeeId, role } = req.user;

        await dbClient.query("BEGIN");

        // Fetch the income
        const { rows } = await dbClient.query(
            `SELECT * FROM incomes WHERE id = $1 AND "userId" = $2 AND type = 'delivery_note'`,
            [id, adminId]
        );

        if (rows.length === 0) {
            await dbClient.query("ROLLBACK");
            return next(new AppError("Delivery note not found", 404));
        }

        const income = rows[0];

        if (income.factureId) {
            await dbClient.query("ROLLBACK");
            return next(new AppError("This delivery note has already been converted to a facture.", 400));
        }

        const currentYear = new Date(income.date).getFullYear();
        const yearPrefix = `${currentYear}-`;

        // Get next facture number
        const lastFactureRes = await dbClient.query(
            `SELECT facture_number FROM factures 
             WHERE "userId" = $1 AND facture_number LIKE $2 
             ORDER BY id DESC LIMIT 1`,
            [adminId, `${yearPrefix}%`]
        );

        let nextFactureNumber = 1;
        if (lastFactureRes.rows.length > 0) {
            const lastNum = lastFactureRes.rows[0].facture_number;
            const parts = lastNum.split("-");
            if (parts.length > 1) {
                const lastCount = parseInt(parts[parts.length - 1], 10);
                if (!isNaN(lastCount)) {
                    nextFactureNumber = lastCount + 1;
                }
            }
        }
        const formattedFactureNumber = `${yearPrefix}${nextFactureNumber.toString().padStart(4, "0")}`;

        // Prepare Facture data from Delivery Note
        // A Delivery Note has "items" typically structured similarly to facture items.

        // Default calculating fields for facture based on income items
        let prixTotalHorsFrais = income.amount;
        let totalFraisServiceHT = 0;
        let tva = 0;
        let total = income.amount;

        // Create Facture
        const factureInsertRes = await dbClient.query(
            `INSERT INTO factures 
       ("userId", "employeeId", "clientName", "clientAddress", "clientICE", date, items, type, "showMargin", "prixTotalHorsFrais", "totalFraisServiceHT", tva, total, notes, facture_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
       RETURNING *`,
            [
                adminId,
                role === "admin" ? null : employeeId,
                income.client,
                "", // Address usually not on delivery note directly
                "",
                income.date,
                JSON.stringify(income.items || []),
                "facture", // Assuming standard type
                true,
                prixTotalHorsFrais,
                totalFraisServiceHT,
                tva,
                total,
                `Converted from Delivery Note #${income.deliveryNoteNumber || id}`,
                formattedFactureNumber,
            ]
        );

        const newFacture = factureInsertRes.rows[0];

        // Link the Facture to the Income
        await dbClient.query(
            `UPDATE incomes SET "factureId" = $1 WHERE id = $2`,
            [newFacture.id, id]
        );

        await dbClient.query("COMMIT");
        res.status(201).json({
            message: "Successfully converted to facture",
            facture: newFacture,
        });
    } catch (error) {
        await dbClient.query("ROLLBACK");
        logger.error("Convert to Facture Error:", error);
        next(new AppError("Failed to convert delivery note to facture", 500));
    } finally {
        dbClient.release();
    }
};
