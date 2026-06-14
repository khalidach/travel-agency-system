// backend/services/ProgramCostsExcelService.js
const excel = require("exceljs");

/**
 * Estimates the rendered width of a cell value in ExcelJS column-width units.
 */
const estimateCellWidth = (cell) => {
  if (!cell || cell.value === null || cell.value === undefined) return 10;
  
  let displayText = "";
  const val = cell.value;
  if (typeof val === "object" && val !== null) {
    if (val.formula) {
      displayText = "000,000,000.00 د.م";
    } else if (val.richText) {
      displayText = val.richText.map((rt) => rt.text).join("");
    } else {
      displayText = String(val);
    }
  } else {
    displayText = String(val);
  }

  if (cell.numFmt && cell.numFmt.includes("د.م") && typeof val === "number") {
    displayText = val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " د.م";
  }

  let charWidth = 0;
  for (const ch of displayText) {
    const code = ch.codePointAt(0);
    // Arabic char range check
    if (
      (code >= 0x0600 && code <= 0x06ff) ||
      (code >= 0x0750 && code <= 0x077f) ||
      (code >= 0x08a0 && code <= 0x08ff) ||
      (code >= 0xfb50 && code <= 0xfdff) ||
      (code >= 0xfe70 && code <= 0xfeff)
    ) {
      charWidth += 1.5;
    } else {
      charWidth += 1.0;
    }
  }

  const fontSize = cell.font && cell.font.size ? Number(cell.font.size) : 11;
  charWidth *= fontSize / 11;

  if (cell.font && cell.font.bold) {
    charWidth *= 1.15;
  }

  return Math.max(10, Math.ceil(charWidth) + 3);
};

const borderStyle = {
  top: { style: "thin", color: { argb: "FFCBD5E1" } },
  left: { style: "thin", color: { argb: "FFCBD5E1" } },
  bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
  right: { style: "thin", color: { argb: "FFCBD5E1" } },
};

const headerFill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1E3A8A" }, // Navy blue
};

const summaryHeaderFill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF0F766E" }, // Teal for single program summary
};

const subHeaderFill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE2E8F0" }, // Slate 200
};

exports.generateProgramCostsListExcel = async (programs) => {
  const workbook = new excel.Workbook();
  const sheet = workbook.addWorksheet("لائحة تكاليف البرامج");
  sheet.views = [{ showGridLines: true, rightToLeft: true }];

  sheet.addRow([]); // Blank line

  // Title Block
  const titleRow = sheet.addRow(["لائحة تكاليف البرامج"]);
  titleRow.height = 30;
  const titleCell = sheet.getCell("A2");
  titleCell.font = { bold: true, size: 16, color: { argb: "FF1E3A8A" } };
  sheet.mergeCells("A2:G2");

  sheet.addRow([]); // Blank line

  // Table Headers
  const headerRow = sheet.addRow([
    "معرف البرنامج",
    "اسم البرنامج",
    "نوع البرنامج",
    "تكلفة تذاكر الطيران",
    "تكلفة التأشيرة",
    "تكلفة النقل",
    "إجمالي تكلفة البرنامج",
  ]);
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = headerFill;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = borderStyle;
  });

  // Rows
  programs.forEach((program) => {
    const pCosts = program.costs || {};
    const detailCosts = pCosts.costs || {};
    const flight = Number(detailCosts.flightTickets) || 0;
    const visa = Number(detailCosts.visa) || 0;
    const transport = Number(detailCosts.transport) || 0;
    const total = Number(pCosts.totalCost) || 0;

    const row = sheet.addRow([
      program.id,
      program.name,
      program.type,
      flight,
      visa,
      transport,
      total,
    ]);
    row.height = 22;

    row.getCell(1).alignment = { horizontal: "center" };
    row.getCell(3).alignment = { horizontal: "center" };

    // Format currency columns
    for (let col = 4; col <= 7; col++) {
      const cell = row.getCell(col);
      cell.numFmt = '#,##0.00" د.م."';
      cell.alignment = { horizontal: "right" };
    }

    row.eachCell((cell) => {
      cell.border = borderStyle;
      cell.font = { size: 11 };
    });
  });

  // Adjust columns width
  sheet.columns.forEach((col) => {
    let maxWidth = 10;
    col.eachCell({ includeEmpty: false }, (cell) => {
      maxWidth = Math.max(maxWidth, estimateCellWidth(cell));
    });
    col.width = maxWidth;
  });

  return workbook;
};

exports.generateSingleProgramCostsExcel = async (program, existingCosts, totalRevenue) => {
  const workbook = new excel.Workbook();
  const sheet = workbook.addWorksheet("تفاصيل تكاليف البرنامج");
  sheet.views = [{ showGridLines: true, rightToLeft: true }];

  sheet.addRow([]); // Blank line

  // Title Block
  const titleRow = sheet.addRow([`تفاصيل التكاليف والأرباح للبرنامج: ${program.name}`]);
  titleRow.height = 30;
  const titleCell = sheet.getCell("A2");
  titleCell.font = { bold: true, size: 14, color: { argb: "FF1E3A8A" } };
  sheet.mergeCells("A2:E2");

  // Subtitle
  const dateRow = sheet.addRow([`نوع البرنامج: ${program.type}`]);
  dateRow.height = 20;
  sheet.getCell("A3").font = { italic: true, size: 10, color: { argb: "FF64748B" } };
  sheet.mergeCells("A3:E3");

  sheet.addRow([]); // Blank line

  // Financial KPI Overview Table
  const kpiHeaderRow = sheet.addRow(["المؤشر المالي", "المبلغ"]);
  kpiHeaderRow.height = 25;
  kpiHeaderRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = summaryHeaderFill;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = borderStyle;
  });

  const totalCost = Number(existingCosts.totalCost) || 0;
  const netProfit = totalRevenue - totalCost;

  const kpis = [
    { label: "إجمالي مداخيل الحجوزات", value: totalRevenue },
    { label: "إجمالي تكلفة البرنامج", value: totalCost },
    { label: "صافي الأرباح / الخسائر", value: netProfit, isProfit: true },
  ];

  kpis.forEach((kpi) => {
    const row = sheet.addRow([kpi.label, kpi.value]);
    row.height = 22;
    const cellA = row.getCell(1);
    const cellB = row.getCell(2);
    cellA.border = borderStyle;
    cellB.border = borderStyle;
    cellA.font = { size: 11 };
    cellB.font = { size: 11, bold: true };
    cellB.numFmt = '#,##0.00" د.م."';
    cellB.alignment = { horizontal: "right" };

    if (kpi.isProfit) {
      cellB.font.color = { argb: kpi.value >= 0 ? "FF16A34A" : "FFDC2626" };
    }
  });

  sheet.addRow([]); // Blank line
  sheet.addRow([]); // Blank line

  // Cost Category Breakdown Header
  const costHeaderRow = sheet.addRow(["فئة التكلفة", "البند الفرعي / الفندق", "المبلغ"]);
  costHeaderRow.height = 25;
  costHeaderRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = headerFill;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = borderStyle;
  });

  const detailCosts = existingCosts.costs || {};

  // Standard Costs
  const standards = [
    { cat: "تذاكر الطيران", name: "إجمالي تكلفة تذاكر الطيران", amount: Number(detailCosts.flightTickets) || 0 },
    { cat: "رسوم التأشيرة", name: "إجمالي تكلفة التأشيرة", amount: Number(detailCosts.visa) || 0 },
    { cat: "رسوم النقل", name: "إجمالي تكلفة النقل", amount: Number(detailCosts.transport) || 0 },
  ];

  standards.forEach((item) => {
    const row = sheet.addRow([item.cat, item.name, item.amount]);
    row.height = 22;
    row.eachCell((cell) => {
      cell.border = borderStyle;
      cell.font = { size: 11 };
    });
    row.getCell(3).numFmt = '#,##0.00" د.م."';
    row.getCell(3).alignment = { horizontal: "right" };
  });

  // Hotel Costs
  const hotels = detailCosts.hotels || [];
  hotels.forEach((hotel) => {
    const row = sheet.addRow(["الإقامة الفندقية", hotel.name, Number(hotel.amount) || 0]);
    row.height = 22;
    row.eachCell((cell) => {
      cell.border = borderStyle;
      cell.font = { size: 11 };
    });
    row.getCell(3).numFmt = '#,##0.00" د.م."';
    row.getCell(3).alignment = { horizontal: "right" };
  });

  // Custom Costs
  const customs = detailCosts.custom || [];
  customs.forEach((c) => {
    const row = sheet.addRow(["تكاليف أخرى", c.name || "تكلفة غير مسماة", Number(c.amount) || 0]);
    row.height = 22;
    row.eachCell((cell) => {
      cell.border = borderStyle;
      cell.font = { size: 11 };
    });
    row.getCell(3).numFmt = '#,##0.00" د.م."';
    row.getCell(3).alignment = { horizontal: "right" };
  });

  // Total Cost Row in Breakdown
  const totalRow = sheet.addRow(["ملخص إجمالي التكاليف", "مجموع كل فئات التكاليف", totalCost]);
  totalRow.height = 24;
  totalRow.eachCell((cell) => {
    cell.border = borderStyle;
    cell.font = { size: 11, bold: true };
    cell.fill = subHeaderFill;
  });
  totalRow.getCell(3).numFmt = '#,##0.00" د.م."';
  totalRow.getCell(3).alignment = { horizontal: "right" };

  // Adjust columns width
  sheet.columns.forEach((col) => {
    let maxWidth = 10;
    col.eachCell({ includeEmpty: false }, (cell) => {
      maxWidth = Math.max(maxWidth, estimateCellWidth(cell));
    });
    col.width = maxWidth;
  });

  return workbook;
};
