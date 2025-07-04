// backend/controllers/factureController.js
const getFactures = async (req, res) => {
  try {
    const { adminId } = req.user;
    const { rows } = await req.db.query(
      'SELECT * FROM factures WHERE "userId" = $1 ORDER BY "createdAt" DESC',
      [adminId]
    );
    res.json(rows);
  } catch (error) {
    console.error("Get Factures Error:", error);
    res.status(500).json({ message: "Failed to retrieve factures." });
  }
};

const createFacture = async (req, res) => {
  const client = await req.db.connect();
  try {
    await client.query("BEGIN");

    const { adminId, id: employeeId, role } = req.user;
    const {
      clientName,
      clientAddress,
      date,
      items,
      type,
      total,
      notes,
      fraisDeService,
      tva,
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
      `INSERT INTO factures ("userId", "employeeId", "clientName", "clientAddress", date, items, type, "fraisDeService", tva, total, notes, facture_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        adminId,
        role === "admin" ? null : employeeId,
        clientName,
        clientAddress,
        date,
        JSON.stringify(items),
        type,
        fraisDeService,
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
    console.error("Create Facture Error:", error);
    if (
      error.code === "23505" &&
      error.constraint === "unique_facture_number_per_user"
    ) {
      return res.status(409).json({
        message: "A facture with this number already exists. Please try again.",
      });
    }
    res.status(400).json({ message: "Failed to create facture." });
  } finally {
    client.release();
  }
};

const updateFacture = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.user;
    const {
      clientName,
      clientAddress,
      date,
      items,
      type,
      total,
      notes,
      fraisDeService,
      tva,
    } = req.body;

    const { rows } = await req.db.query(
      `UPDATE factures SET "clientName" = $1, "clientAddress" = $2, date = $3, items = $4, type = $5, "fraisDeService" = $6, tva = $7, total = $8, notes = $9, "updatedAt" = NOW()
       WHERE id = $10 AND "userId" = $11 RETURNING *`,
      [
        clientName,
        clientAddress,
        date,
        JSON.stringify(items),
        type,
        fraisDeService,
        tva,
        total,
        notes,
        id,
        adminId,
      ]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Facture not found or not authorized." });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Update Facture Error:", error);
    res.status(400).json({ message: "Failed to update facture." });
  }
};

const deleteFacture = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.user;

    const { rowCount } = await req.db.query(
      'DELETE FROM factures WHERE id = $1 AND "userId" = $2',
      [id, adminId]
    );

    if (rowCount === 0) {
      return res
        .status(404)
        .json({ message: "Facture not found or not authorized." });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Delete Facture Error:", error);
    res.status(500).json({ message: "Failed to delete facture." });
  }
};

module.exports = {
  getFactures,
  createFacture,
  updateFacture,
  deleteFacture,
};
