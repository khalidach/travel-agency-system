// backend/controllers/tierController.js
const { tierLimitsCache } = require("../middleware/tierMiddleware");

// Get all tiers
exports.getTiers = async (req, res) => {
  try {
    const { rows } = await req.db.query("SELECT * FROM tiers ORDER BY id ASC");
    res.json(rows);
  } catch (error) {
    console.error("Get Tiers Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Create a new tier
exports.createTier = async (req, res) => {
  const { name, limits } = req.body;

  if (!name || !limits) {
    return res
      .status(400)
      .json({ message: "Tier name and limits are required." });
  }

  try {
    // Explicitly check for an existing tier with the same name (case-insensitive)
    const existingTier = await req.db.query(
      "SELECT id FROM tiers WHERE LOWER(name) = LOWER($1)",
      [name.trim()]
    );

    if (existingTier.rows.length > 0) {
      return res
        .status(409) // Use 409 Conflict for duplicate resource
        .json({ message: `A tier with the name "${name}" already exists.` });
    }

    const { rows } = await req.db.query(
      "INSERT INTO tiers (name, limits) VALUES ($1, $2) RETURNING *",
      [name.trim(), JSON.stringify(limits)]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Create Tier Error:", error);
    // Fallback catch for other potential errors, including the unique constraint
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ message: `A tier with the name "${name}" already exists.` });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// Update an existing tier
exports.updateTier = async (req, res) => {
  const { id } = req.params;
  const { name, limits } = req.body;

  if (!name || !limits) {
    return res
      .status(400)
      .json({ message: "Tier name and limits are required." });
  }

  try {
    // Explicitly check if the new name conflicts with another existing tier
    const existingTier = await req.db.query(
      "SELECT id FROM tiers WHERE LOWER(name) = LOWER($1) AND id != $2",
      [name.trim(), id]
    );

    if (existingTier.rows.length > 0) {
      return res
        .status(409)
        .json({ message: `A tier with the name "${name}" already exists.` });
    }

    const { rows } = await req.db.query(
      "UPDATE tiers SET name = $1, limits = $2 WHERE id = $3 RETURNING *",
      [name.trim(), JSON.stringify(limits), id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Tier not found." });
    }

    // Invalidate the cache for the updated tier
    tierLimitsCache.delete(parseInt(id, 10));

    res.json(rows[0]);
  } catch (error) {
    console.error("Update Tier Error:", error);
    // Fallback catch
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ message: `A tier with the name "${name}" already exists.` });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a tier
exports.deleteTier = async (req, res) => {
  const { id } = req.params;

  // Do not allow deletion of the first 3 default tiers
  if (id <= 3) {
    return res.status(400).json({ message: "Cannot delete default tiers." });
  }

  try {
    // Check if any user is assigned to this tier
    const userCheck = await req.db.query(
      'SELECT COUNT(*) FROM users WHERE "tierId" = $1',
      [id]
    );
    if (parseInt(userCheck.rows[0].count, 10) > 0) {
      return res
        .status(400)
        .json({ message: "Cannot delete tier as it is assigned to users." });
    }

    const { rowCount } = await req.db.query("DELETE FROM tiers WHERE id = $1", [
      id,
    ]);

    if (rowCount === 0) {
      return res.status(404).json({ message: "Tier not found." });
    }

    // Invalidate the cache for the deleted tier
    tierLimitsCache.delete(parseInt(id, 10));

    res.status(204).send();
  } catch (error) {
    console.error("Delete Tier Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
