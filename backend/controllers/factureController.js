// backend/controllers/factureController.js
const AppError = require("../utils/appError");
const logger = require("../utils/logger");
const { applyExcelPageSetup } = require("../utils/excelHelper");

const getFactures = async (req, res, next) => {
  try {
    const { adminId } = req.user;
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    let queryStr = 'SELECT * FROM factures WHERE "userId" = $1';
    let countQueryStr = 'SELECT COUNT(*) FROM factures WHERE "userId" = $1';
    const params = [adminId];

    const branchIdFilter = req.user.role === 'admin' || req.user.role === 'owner' ? req.query.branchId : req.user.branchId;
    if (branchIdFilter && branchIdFilter !== 'all') {
      queryStr += ` AND "branchId" = $${params.length + 1}`;
      countQueryStr += ` AND "branchId" = $${params.length + 1}`;
      params.push(branchIdFilter);
    }

    queryStr += ` ORDER BY "createdAt" DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    const facturesPromise = req.db.query(queryStr, [...params, limit, offset]);
    const totalCountPromise = req.db.query(countQueryStr, params);

    const [facturesResult, totalCountResult] = await Promise.all([
      facturesPromise,
      totalCountPromise,
    ]);

    const totalCount = parseInt(totalCountResult.rows[0].count, 10);

    res.status(200).json({
      data: facturesResult.rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    logger.error("Get Factures Error:", {
      message: error.message,
      stack: error.stack,
    });
    next(new AppError("Failed to retrieve factures.", 500));
  }
};

const createFacture = async (req, res, next) => {
  const client = await req.db.connect();
  try {
    await client.query("BEGIN");

    const { adminId, id: employeeId, role } = req.user;
    const {
      clientName,
      clientAddress,
      clientICE,
      date,
      items,
      type,
      showMargin,
      prixTotalHorsFrais,
      totalFraisServiceHT,
      tva,
      total,
      notes,
      facture_number,
      branchId,
    } = req.body;

    const branchIdToSave = role === "employee" || role === "manager" ? (req.user.branchId || null) : (branchId || null);

    let formattedFactureNumber = facture_number;

    if (!formattedFactureNumber) {
      const currentYear = new Date(date).getFullYear();
      const yearPrefix = `${currentYear}-`;

      const lastFactureRes = await client.query(
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

      formattedFactureNumber = `${yearPrefix}${nextFactureNumber
        .toString()
        .padStart(4, "0")}`;
    }

    const { rows } = await client.query(
      `INSERT INTO factures ("userId", "employeeId", "clientName", "clientAddress", "clientICE", date, items, type, "showMargin", "prixTotalHorsFrais", "totalFraisServiceHT", tva, total, notes, facture_number, "branchId")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
      [
        adminId,
        role === "admin" ? null : employeeId,
        clientName,
        clientAddress,
        clientICE,
        date,
        JSON.stringify(items),
        type,
        showMargin,
        prixTotalHorsFrais,
        totalFraisServiceHT,
        tva,
        total,
        notes,
        formattedFactureNumber,
        branchIdToSave,
      ]
    );
    await client.query("COMMIT");
    res.status(201).json(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Create Facture Error:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
    });
    if (error.code === "23505") {
      return next(
        new AppError(
          "A facture with this number already exists. Please try again.",
          409
        )
      );
    }
    next(new AppError("Failed to create facture.", 400));
  } finally {
    client.release();
  }
};

const updateFacture = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adminId } = req.user;
    const {
      clientName,
      clientAddress,
      clientICE,
      date,
      items,
      type,
      showMargin,
      prixTotalHorsFrais,
      totalFraisServiceHT,
      tva,
      total,
      notes,
      facture_number,
      branchId,
    } = req.body;

    const existing = await req.db.query(
      'SELECT "branchId" FROM factures WHERE id = $1 AND "userId" = $2',
      [id, adminId]
    );
    if (existing.rows.length === 0) {
      return next(new AppError("Facture not found or not authorized.", 404));
    }
    const branchIdToSave = role === "employee" || role === "manager" ? (existing.rows[0].branchId) : (branchId !== undefined ? branchId : existing.rows[0].branchId);

    const { rows } = await req.db.query(
      `UPDATE factures SET "clientName" = $1, "clientAddress" = $2, "clientICE" = $3, date = $4, items = $5, type = $6, "showMargin" = $7, "prixTotalHorsFrais" = $8, "totalFraisServiceHT" = $9, tva = $10, total = $11, notes = $12, facture_number = COALESCE($13, facture_number), "branchId" = $14, "updatedAt" = NOW()
       WHERE id = $15 AND "userId" = $16 RETURNING *`,
      [
        clientName,
        clientAddress,
        clientICE,
        date,
        JSON.stringify(items),
        type,
        showMargin,
        prixTotalHorsFrais,
        totalFraisServiceHT,
        tva,
        total,
        notes,
        facture_number,
        branchIdToSave,
        id,
        adminId,
      ]
    );

    if (rows.length === 0) {
      return next(new AppError("Facture not found or not authorized.", 404));
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    logger.error("Update Facture Error:", {
      message: error.message,
      stack: error.stack,
      factureId: req.params.id,
    });
    next(new AppError("Failed to update facture.", 400));
  }
};

const deleteFacture = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adminId } = req.user;

    const { rowCount } = await req.db.query(
      'DELETE FROM factures WHERE id = $1 AND "userId" = $2',
      [id, adminId]
    );

    if (rowCount === 0) {
      return next(new AppError("Facture not found or not authorized.", 404));
    }
    res.status(204).send();
  } catch (error) {
    logger.error("Delete Facture Error:", {
      message: error.message,
      stack: error.stack,
      factureId: req.params.id,
    });
    next(new AppError("Failed to delete facture.", 500));
  }
};

const exportFacturesList = async (req, res, next) => {
  try {
    const { adminId } = req.user;
    const { type, lang } = req.query; // type can be facture/devis/all

    let queryStr = 'SELECT * FROM factures WHERE "userId" = $1';
    const params = [adminId];

    const branchIdFilter = req.user.role === 'admin' || req.user.role === 'owner' ? req.query.branchId : req.user.branchId;
    if (branchIdFilter && branchIdFilter !== 'all') {
      queryStr += ` AND "branchId" = $${params.length + 1}`;
      params.push(branchIdFilter);
    }

    if (type && type !== 'all') {
      queryStr += ` AND "type" = $${params.length + 1}`;
      params.push(type);
    }

    queryStr += ` ORDER BY "createdAt" DESC`;

    const { rows } = await req.db.query(queryStr, params);

    const FactureExcelService = require("../services/FactureExcelService");
    const workbook = await FactureExcelService.generateFacturesListExcel(rows, type || "facture", lang || "ar");

    const fileName = type === "devis"
      ? (lang === "ar" || !lang ? "تقرير_التقديرات" : "estimates_report")
      : (lang === "ar" || !lang ? "تقرير_الفواتير" : "invoices_report");

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
    logger.error("Export Factures List Error:", error);
    next(new AppError("Failed to export factures list.", 500));
  }
};

const exportSingleFacture = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adminId } = req.user;
    const { lang } = req.query;

    const { rows } = await req.db.query(
      'SELECT * FROM factures WHERE id = $1 AND "userId" = $2',
      [id, adminId]
    );

    if (rows.length === 0) {
      return next(new AppError("Facture not found or not authorized.", 404));
    }

    const facture = rows[0];

    const FactureExcelService = require("../services/FactureExcelService");
    const workbook = await FactureExcelService.generateFactureExcel(facture, lang || "ar");

    const fileName = `${facture.type || "document"}_${facture.facture_number || facture.id}`;

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
    logger.error("Export Single Facture Error:", error);
    next(new AppError("Failed to export facture details.", 500));
  }
};

module.exports = {
  getFactures,
  createFacture,
  updateFacture,
  deleteFacture,
  exportFacturesList,
  exportSingleFacture,
};
