// backend/controllers/programPricingController.js
const ProgramPricingService = require("../services/ProgramPricingService");

exports.getAllProgramPricing = async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    // Join with employees table to get employeeName
    const pricingPromise = req.db.query(
      `SELECT pp.*, e.username as "employeeName"
       FROM program_pricing pp
       LEFT JOIN employees e ON pp."employeeId" = e.id
       WHERE pp."userId" = $1
       ORDER BY pp."createdAt" DESC
       LIMIT $2 OFFSET $3`,
      [req.user.adminId, limit, offset]
    );

    const totalCountPromise = req.db.query(
      'SELECT COUNT(*) FROM program_pricing WHERE "userId" = $1',
      [req.user.adminId]
    );

    const [pricingResult, totalCountResult] = await Promise.all([
      pricingPromise,
      totalCountPromise,
    ]);

    const totalCount = parseInt(totalCountResult.rows[0].count, 10);

    res.json({
      data: pricingResult.rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Get All Pricing Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.createProgramPricing = async (req, res) => {
  try {
    const newPricing = await ProgramPricingService.createPricingAndBookings(
      req.db,
      req.user, // Pass the whole user object
      req.body
    );
    res.status(201).json(newPricing);
  } catch (error) {
    console.error("Create Pricing Error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.updateProgramPricing = async (req, res) => {
  const { id } = req.params;
  try {
    const updatedProgramPricing =
      await ProgramPricingService.updatePricingAndBookings(
        req.db,
        req.user, // Pass user object
        id,
        req.body
      );
    res.json(updatedProgramPricing);
  } catch (error) {
    console.error("Update Pricing Error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.deleteProgramPricing = async (req, res) => {
  const { id } = req.params;
  try {
    // Authorization Check
    const pricingRes = await req.db.query(
      'SELECT "employeeId" FROM program_pricing WHERE id = $1 AND "userId" = $2',
      [id, req.user.adminId]
    );

    if (pricingRes.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Program pricing not found or not authorized." });
    }

    const pricing = pricingRes.rows[0];
    if (req.user.role !== "admin" && pricing.employeeId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this pricing." });
    }

    // Deletion
    const { rowCount } = await req.db.query(
      "DELETE FROM program_pricing WHERE id = $1",
      [id]
    );

    if (rowCount === 0) {
      // This case should be rare due to the check above, but it is good practice
      return res.status(404).json({ message: "Program pricing not found." });
    }

    res.json({ message: "Program pricing deleted successfully" });
  } catch (error) {
    console.error("Delete Pricing Error:", error);
    res.status(500).json({ message: error.message });
  }
};
