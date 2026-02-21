const ExcelService = require("../../services/ExcelService");
const BookingExcelService = require("../../services/BookingExcelService");
const ExcelListService = require("../../services/ExcelListService");
const ExcelRoomService = require("../../services/excelRoomService");
const AppError = require("../../utils/appError");
const logger = require("../../utils/logger");

exports.exportBookingsToExcel = async (req, res, next) => {
  const client = await req.db.connect();
  try {
    await client.query("BEGIN");
    const { programId } = req.params;
    const { adminId, role } = req.user;

    if (!programId || programId === "undefined") {
      throw new AppError("A program must be selected for export.", 400);
    }

    const { rows: programs } = await client.query(
      'SELECT * FROM programs WHERE id = $1 AND "userId" = $2',
      [programId, adminId],
    );

    if (programs.length === 0) {
      throw new AppError("Program not found.", 404);
    }

    const { rows: bookings } = await client.query(
      'SELECT * FROM bookings WHERE "tripId" = $1 AND "userId" = $2',
      [programId, adminId],
    );

    if (bookings.length === 0) {
      return res
        .status(404)
        .json({ message: "No bookings found for this program." });
    }

    const program = programs[0];
    const exportCounts = program.exportCounts || {};
    const currentMonth = new Date().toISOString().slice(0, 7);
    const exportType = "booking";

    const monthlyLog = exportCounts[exportType] || { month: "", count: 0 };
    const newCount =
      monthlyLog.month === currentMonth ? monthlyLog.count + 1 : 1;
    exportCounts[exportType] = { month: currentMonth, count: newCount };

    await client.query(
      'UPDATE programs SET "exportCounts" = $1 WHERE id = $2',
      [JSON.stringify(exportCounts), programId],
    );

    const workbook = await BookingExcelService.generateBookingsExcel(
      bookings,
      program,
      role,
    );

    await client.query("COMMIT");

    const fileName = `${(program.name || "Untitled_Program").replace(
      /[\s\W]/g,
      "_",
    )}_bookings.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Failed to export bookings to Excel:", {
      message: error.message,
      stack: error.stack,
    });
    if (!res.headersSent) {
      next(new AppError("Failed to export bookings to Excel.", 500));
    }
  } finally {
    client.release();
  }
};

exports.exportFlightListToExcel = async (req, res, next) => {
  const client = await req.db.connect();
  try {
    await client.query("BEGIN");
    const { programId } = req.params;
    const { adminId, agencyName } = req.user;

    if (!programId || programId === "undefined") {
      throw new AppError("A program must be selected for export.", 400);
    }

    const { rows: programs } = await client.query(
      'SELECT * FROM programs WHERE id = $1 AND "userId" = $2',
      [programId, adminId],
    );

    if (programs.length === 0) {
      throw new AppError("Program not found.", 404);
    }

    const programData = { ...programs[0], agencyName };

    const { rows: bookings } = await client.query(
      'SELECT * FROM bookings WHERE "tripId" = $1 AND "userId" = $2',
      [programId, adminId],
    );

    if (bookings.length === 0) {
      return res
        .status(404)
        .json({ message: "No bookings found for this program." });
    }

    const exportCounts = programData.exportCounts || {};
    const currentMonth = new Date().toISOString().slice(0, 7);
    const exportType = "list";

    const monthlyLog = exportCounts[exportType] || { month: "", count: 0 };
    const newCount =
      monthlyLog.month === currentMonth ? monthlyLog.count + 1 : 1;
    exportCounts[exportType] = { month: currentMonth, count: newCount };

    await client.query(
      'UPDATE programs SET "exportCounts" = $1 WHERE id = $2',
      [JSON.stringify(exportCounts), programId],
    );

    const workbook = await ExcelListService.generateFlightListExcel(
      bookings,
      programData,
    );

    await client.query("COMMIT");

    const fileName = `${(programData.name || "Untitled_Program").replace(
      /[\s\W]/g,
      "_",
    )}_flight_list.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Failed to export flight list to Excel:", {
      message: error.message,
      stack: error.stack,
    });
    if (!res.headersSent) {
      next(new AppError("Failed to export flight list to Excel.", 500));
    }
  } finally {
    client.release();
  }
};

exports.exportBookingTemplateForProgram = async (req, res, next) => {
  try {
    const { programId } = req.params;

    if (!programId || programId === "undefined") {
      return next(new AppError("Invalid Program ID provided.", 400));
    }

    const { rows: programs } = await req.db.query(
      'SELECT * FROM programs WHERE id = $1 AND "userId" = $2',
      [programId, req.user.adminId],
    );

    if (programs.length === 0) {
      return next(new AppError("Program not found.", 404));
    }

    const program = programs[0];
    const workbook =
      await ExcelService.generateBookingTemplateForProgramExcel(program);

    const fileName = `${(program.name || "Untitled_Program").replace(
      /[\s\W]/g,
      "_",
    )}_Template.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error("Failed to export template:", {
      message: error.message,
      stack: error.stack,
    });
    if (!res.headersSent) {
      next(new AppError("Failed to export booking template.", 500));
    }
  }
};

exports.importBookingsFromExcel = async (req, res, next) => {
  if (!req.file) {
    return next(new AppError("No file uploaded.", 400));
  }
  const { programId } = req.params;
  if (!programId) {
    return next(new AppError("Program ID is required.", 400));
  }

  const client = await req.db.connect();

  try {
    await client.query("BEGIN");

    const createdBookings = await ExcelService.importBookings(
      client,
      req.file.path,
      req.user,
      programId,
    );

    await client.query("COMMIT");

    res.status(201).json({
      status: "success",
      message: `${createdBookings.length} bookings imported successfully.`,
      data: {
        bookings: createdBookings,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Excel import transaction failed:", {
      message: error.message,
      stack: error.stack,
      ...error,
    });
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message || "Error importing Excel file.", 400),
    );
  } finally {
    client.release();
  }
};

exports.exportCombinedExcel = async (req, res, next) => {
  const client = await req.db.connect();
  try {
    await client.query("BEGIN");
    const { programId } = req.params;
    const { adminId, role, agencyName } = req.user;

    if (!programId || programId === "undefined") {
      throw new AppError("A program must be selected for export.", 400);
    }

    const { rows: programs } = await client.query(
      'SELECT * FROM programs WHERE id = $1 AND "userId" = $2',
      [programId, adminId],
    );

    if (programs.length === 0) {
      throw new AppError("Program not found.", 404);
    }

    const program = programs[0];
    const programData = { ...program, agencyName };

    const { rows: bookings } = await client.query(
      'SELECT * FROM bookings WHERE "tripId" = $1 AND "userId" = $2',
      [programId, adminId],
    );

    if (bookings.length === 0) {
      return res
        .status(404)
        .json({ message: "No bookings found for this program." });
    }

    // Track export counts
    const exportCounts = program.exportCounts || {};
    const currentMonth = new Date().toISOString().slice(0, 7);
    const exportType = "booking";

    const monthlyLog = exportCounts[exportType] || { month: "", count: 0 };
    const newCount =
      monthlyLog.month === currentMonth ? monthlyLog.count + 1 : 1;
    exportCounts[exportType] = { month: currentMonth, count: newCount };

    await client.query(
      'UPDATE programs SET "exportCounts" = $1 WHERE id = $2',
      [JSON.stringify(exportCounts), programId],
    );

    // Generate the Normal List workbook (this becomes the master workbook)
    const masterWorkbook = await BookingExcelService.generateBookingsExcel(
      bookings,
      program,
      role,
    );

    // Generate the Flight List workbook and copy its worksheet into the master
    const flightWorkbook = await ExcelListService.generateFlightListExcel(
      [...bookings],
      programData,
    );
    flightWorkbook.eachSheet((worksheet) => {
      const newSheet = masterWorkbook.addWorksheet(worksheet.name, {
        views: worksheet.views,
      });
      // Copy column widths
      worksheet.columns.forEach((col, index) => {
        if (newSheet.getColumn(index + 1)) {
          newSheet.getColumn(index + 1).width = col.width;
        }
      });
      // Copy rows with styles
      worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const newRow = newSheet.getRow(rowNumber);
        newRow.height = row.height;
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const newCell = newRow.getCell(colNumber);
          newCell.value = cell.value;
          newCell.style = { ...cell.style };
        });
      });
      // Copy merged cells
      const merges = worksheet.model.merges || [];
      merges.forEach((merge) => {
        newSheet.mergeCells(merge);
      });
    });

    // Generate the Room Management workbook and copy its worksheets
    const roomDataResult = await client.query(
      'SELECT * FROM room_managements WHERE "programId" = $1 AND "userId" = $2',
      [programId, adminId],
    );
    const roomData = roomDataResult.rows;

    if (roomData.length > 0) {
      const roomWorkbook = await ExcelRoomService.generateRoomingListExcel(
        program,
        roomData,
      );
      roomWorkbook.eachSheet((worksheet) => {
        const newSheet = masterWorkbook.addWorksheet(worksheet.name, {
          views: worksheet.views,
        });
        // Copy column widths
        worksheet.columns.forEach((col, index) => {
          if (newSheet.getColumn(index + 1)) {
            newSheet.getColumn(index + 1).width = col.width;
          }
        });
        // Copy rows with styles
        worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
          const newRow = newSheet.getRow(rowNumber);
          newRow.height = row.height;
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const newCell = newRow.getCell(colNumber);
            newCell.value = cell.value;
            newCell.style = { ...cell.style };
          });
        });
        // Copy merged cells
        const merges = worksheet.model.merges || [];
        merges.forEach((merge) => {
          newSheet.mergeCells(merge);
        });
      });
    }

    await client.query("COMMIT");

    const fileName = `${(program.name || "Untitled_Program").replace(
      /[\s\W]/g,
      "_",
    )}_combined_export.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    await masterWorkbook.xlsx.write(res);
    res.end();
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Failed to export combined Excel:", {
      message: error.message,
      stack: error.stack,
    });
    if (!res.headersSent) {
      next(new AppError("Failed to export combined Excel.", 500));
    }
  } finally {
    client.release();
  }
};
