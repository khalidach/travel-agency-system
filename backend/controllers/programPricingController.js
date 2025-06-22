// backend/controllers/programPricingController.js
const ProgramPricingService = require("../services/ProgramPricingService");

exports.getAllProgramPricing = async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    // Use adminId to fetch data for the entire agency
    const pricingPromise = req.db.query(
      'SELECT * FROM program_pricing WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3',
      [req.user.adminId, limit, offset]
    );

    // Use adminId for the count as well
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
  const {
    programId,
    selectProgram,
    ticketAirline,
    visaFees,
    guideFees,
    allHotels,
  } = req.body;
  try {
    const { rows } = await req.db.query(
      'INSERT INTO program_pricing ("userId", "programId", "selectProgram", "ticketAirline", "visaFees", "guideFees", "allHotels") VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [
        // Use adminId to correctly associate the pricing with the agency
        req.user.adminId,
        programId,
        selectProgram,
        ticketAirline,
        visaFees,
        guideFees,
        JSON.stringify(allHotels || []),
      ]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Create Pricing Error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.updateProgramPricing = async (req, res) => {
  const { id } = req.params;
  try {
    // Pass adminId to the service layer for authorization and updates
    const updatedProgramPricing =
      await ProgramPricingService.updatePricingAndBookings(
        req.db,
        req.user.adminId,
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
    // Use adminId to ensure a manager can delete pricing within their agency
    const { rowCount } = await req.db.query(
      'DELETE FROM program_pricing WHERE id = $1 AND "userId" = $2',
      [id, req.user.adminId]
    );
    if (rowCount === 0) {
      return res
        .status(404)
        .json({ message: "Program pricing not found or user not authorized" });
    }
    res.json({ message: "Program pricing deleted successfully" });
  } catch (error) {
    console.error("Delete Pricing Error:", error);
    res.status(500).json({ message: error.message });
  }
};
