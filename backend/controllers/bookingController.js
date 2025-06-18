// backend/controllers/bookingController.js
const BookingService = require("../services/BookingService");
const ExcelService = require("../services/ExcelService");

// --- Booking CRUD Operations ---

exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await BookingService.getAllBookings(req.db, req.user.id);
    res.json(bookings);
  } catch (error) {
    console.error("Get All Bookings Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const newBooking = await BookingService.createBooking(
      req.db,
      req.user.id,
      req.body
    );
    res.status(201).json(newBooking);
  } catch (error) {
    console.error("Create Booking Error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.updateBooking = async (req, res) => {
  const { id } = req.params;
  try {
    const updatedBooking = await BookingService.updateBooking(
      req.db,
      req.user.id,
      id,
      req.body
    );
    res.json(updatedBooking);
  } catch (error) {
    console.error("Update Booking Error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.deleteBooking = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await BookingService.deleteBooking(req.db, req.user.id, id);
    res.json(result);
  } catch (error) {
    console.error("Delete Booking Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// --- Payment CRUD Operations ---

exports.addPayment = async (req, res) => {
  try {
    const updatedBooking = await BookingService.addPayment(
      req.db,
      req.user.id,
      req.params.bookingId,
      req.body
    );
    res.json(updatedBooking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updatePayment = async (req, res) => {
  try {
    const updatedBooking = await BookingService.updatePayment(
      req.db,
      req.user.id,
      req.params.bookingId,
      req.params.paymentId,
      req.body
    );
    res.json(updatedBooking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const updatedBooking = await BookingService.deletePayment(
      req.db,
      req.user.id,
      req.params.bookingId,
      req.params.paymentId
    );
    res.json(updatedBooking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Excel Operations ---

exports.exportBookingsToExcel = async (req, res) => {
  try {
    const { programId } = req.params;

    if (!programId || programId === "all") {
      return res
        .status(400)
        .json({ message: "A specific program must be selected for export." });
    }

    const { rows: bookings } = await req.db.query(
      'SELECT * FROM bookings WHERE "tripId" = $1 AND "userId" = $2 ORDER BY "phoneNumber", "clientNameFr"',
      [programId, req.user.id]
    );
    if (bookings.length === 0) {
      return res
        .status(404)
        .json({ message: "No bookings found for this program." });
    }

    const { rows: programs } = await req.db.query(
      "SELECT * FROM programs WHERE id = $1",
      [programId]
    );
    if (!programs[0]) {
      return res.status(404).json({ message: "Program not found." });
    }

    const workbook = await ExcelService.generateBookingsExcel(
      bookings,
      programs[0]
    );

    const fileName = `${programs[0].name.replace(/\s/g, "_")}_bookings.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Failed to export to Excel:", error);
    res.status(500).json({ message: "Failed to export bookings to Excel." });
  }
};

exports.exportBookingTemplate = async (req, res) => {
  try {
    const { rows: programs } = await req.db.query(
      'SELECT * FROM programs WHERE "userId" = $1',
      [req.user.id]
    );
    const workbook = await ExcelService.generateBookingTemplateExcel(programs);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Booking_Template.xlsx"
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Failed to export template:", error);
    res.status(500).json({ message: "Failed to export booking template." });
  }
};

exports.importBookingsFromExcel = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded." });

  try {
    const result = await ExcelService.parseBookingsFromExcel(
      req.file,
      req.user.id,
      req.db
    );
    res.status(201).json(result);
  } catch (error) {
    console.error("Excel import error:", error);
    res.status(500).json({ message: error.message });
  }
};
