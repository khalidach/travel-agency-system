// backend/controllers/factureController.js
const AppError = require("../utils/appError");
const logger = require("../utils/logger");

const getFactures = async (req, res, next) => {
  try {
    const { adminId } = req.user;
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    const facturesPromise = req.db.query(
      'SELECT * FROM factures WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3',
      [adminId, limit, offset]
    );

    const totalCountPromise = req.db.query(
      'SELECT COUNT(*) FROM factures WHERE "userId" = $1',
      [adminId]
    );

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
    } = req.body;

    const lastFactureRes = await client.query(
      `SELECT facture_number FROM factures WHERE "userId" = $1 AND facture_number IS NOT NULL ORDER BY CAST(facture_number AS INTEGER) DESC LIMIT 1`,
      [adminId]
    );

    let nextFactureNumber = 1;
    if (lastFactureRes.rows.length > 0) {
      nextFactureNumber =
        parseInt(lastFactureRes.rows[0].facture_number, 10) + 1;
    }

    const formattedFactureNumber = nextFactureNumber
      .toString()
      .padStart(5, "0");

    const { rows } = await client.query(
      `INSERT INTO factures ("userId", "employeeId", "clientName", "clientAddress", "clientICE", date, items, type, "showMargin", "prixTotalHorsFrais", "totalFraisServiceHT", tva, total, notes, facture_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
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
    } = req.body;

    const { rows } = await req.db.query(
      `UPDATE factures SET "clientName" = $1, "clientAddress" = $2, "clientICE" = $3, date = $4, items = $5, type = $6, "showMargin" = $7, "prixTotalHorsFrais" = $8, "totalFraisServiceHT" = $9, tva = $10, total = $11, notes = $12, "updatedAt" = NOW()
       WHERE id = $13 AND "userId" = $14 RETURNING *`,
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

module.exports = {
  getFactures,
  createFacture,
  updateFacture,
  deleteFacture,
};
