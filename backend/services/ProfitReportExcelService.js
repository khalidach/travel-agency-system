// backend/services/ProfitReportExcelService.js
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
      displayText = "000,000,000.00 DH";
    } else if (val.richText) {
      displayText = val.richText.map((rt) => rt.text).join("");
    } else {
      displayText = String(val);
    }
  } else {
    displayText = String(val);
  }

  if (cell.numFmt && cell.numFmt.includes("DH") && typeof val === "number") {
    displayText = val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " DH";
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

exports.generateProfitReportExcel = async (data) => {
  const workbook = new excel.Workbook();

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

  const footerFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" }, // Light slate grey
  };

  // ----------------------------------------------------
  // SHEET 1: Financial Summary
  // ----------------------------------------------------
  const summarySheet = workbook.addWorksheet("Financial Summary");
  summarySheet.views = [{ showGridLines: true }];

  summarySheet.addRow([]); // Blank line

  // Title Block
  const titleRow = summarySheet.addRow(["PROFIT & LOSS FINANCIAL SUMMARY"]);
  titleRow.height = 30;
  const titleCell = summarySheet.getCell("A2");
  titleCell.font = { bold: true, size: 16, color: { argb: "FF1E3A8A" } };
  summarySheet.mergeCells("A2:D2");

  // Subtitle/Dates Info
  let dateText = "Date Range: Lifetime / All Time";
  if (data.filters.startDate && data.filters.endDate) {
    dateText = `Date Range: ${data.filters.startDate} to ${data.filters.endDate}`;
  }
  const dateRow = summarySheet.addRow([dateText]);
  dateRow.height = 20;
  summarySheet.getCell("A3").font = { italic: true, size: 10, color: { argb: "FF64748B" } };
  summarySheet.mergeCells("A3:D3");

  summarySheet.addRow([]); // Blank line

  // KPI Headers
  const kpiHeaderRow = summarySheet.addRow(["Financial Metric", "Value"]);
  kpiHeaderRow.height = 25;
  kpiHeaderRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = headerFill;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = borderStyle;
  });

  const summary = data.stats;
  const kpis = [
    { label: "Total Bookings & Services Count", value: summary.totalSalesCount, fmt: "#,##0" },
    { label: "Gross Sales Revenue", value: summary.totalRevenue, fmt: '#,##0.00" DH"' },
    { label: "Total Operating Cost", value: summary.totalCost, fmt: '#,##0.00" DH"' },
    { label: "Net Operating Profit", value: summary.totalProfit, fmt: '#,##0.00" DH"', isProfit: true },
    { label: "Average Profit Margin", value: summary.profitMargin / 100, fmt: "0.0%" },
  ];

  kpis.forEach((kpi) => {
    const row = summarySheet.addRow([kpi.label, kpi.value]);
    row.height = 22;
    
    const cellA = row.getCell(1);
    const cellB = row.getCell(2);
    
    cellA.border = borderStyle;
    cellB.border = borderStyle;
    cellA.font = { size: 11 };
    cellB.font = { size: 11, bold: true };
    cellB.numFmt = kpi.fmt;
    cellB.alignment = { horizontal: "right" };

    if (kpi.isProfit) {
      cellB.font.color = { argb: kpi.value >= 0 ? "FF16A34A" : "FFDC2626" }; // Green or Red
    }
  });

  summarySheet.getColumn(1).width = 35;
  summarySheet.getColumn(2).width = 25;

  // ----------------------------------------------------
  // SHEET 2: Programs Performance
  // ----------------------------------------------------
  const progSheet = workbook.addWorksheet("Programs Performance");
  progSheet.views = [{ showGridLines: true }];

  // Column definitions
  progSheet.columns = [
    { header: "Program Name", key: "programName" },
    { header: "Program Type", key: "type" },
    { header: "Bookings", key: "bookings" },
    { header: "Total Sales", key: "totalSales" },
    { header: "Total Cost", key: "totalCost" },
    { header: "Total Profit", key: "totalProfit" },
    { header: "Profit Margin", key: "profitMargin" },
  ];

  // Format Headers
  progSheet.getRow(1).height = 25;
  progSheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = headerFill;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = borderStyle;
  });

  // Populate data
  data.programData.forEach((prog) => {
    const row = progSheet.addRow({
      programName: prog.programName,
      type: prog.type,
      bookings: prog.bookings,
      totalSales: prog.totalSales,
      totalCost: prog.totalCost,
      totalProfit: prog.totalProfit,
      profitMargin: prog.profitMargin / 100,
    });
    row.height = 20;

    row.eachCell((cell, colIndex) => {
      cell.border = borderStyle;
      
      // Right align numbers
      if (colIndex >= 3) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
      } else {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      }

      // Format currency columns
      if (colIndex === 4 || colIndex === 5 || colIndex === 6) {
        cell.numFmt = '#,##0.00" DH"';
      }
      
      // Format profit margin
      if (colIndex === 7) {
        cell.numFmt = "0.0%";
      }

      // Profit coloring
      if (colIndex === 6) {
        cell.font = { bold: true, color: { argb: cell.value >= 0 ? "FF16A34A" : "FFDC2626" } };
      }
    });
  });

  // Totals Row
  const progCount = data.programData.length;
  if (progCount > 0) {
    const totalRow = progSheet.addRow([]);
    totalRow.height = 22;
    
    progSheet.getCell(`A${progCount + 2}`).value = "Total / Average";
    progSheet.getCell(`C${progCount + 2}`).value = { formula: `SUM(C2:C${progCount + 1})` };
    progSheet.getCell(`D${progCount + 2}`).value = { formula: `SUM(D2:D${progCount + 1})` };
    progSheet.getCell(`E${progCount + 2}`).value = { formula: `SUM(E2:E${progCount + 1})` };
    progSheet.getCell(`F${progCount + 2}`).value = { formula: `SUM(F2:F${progCount + 1})` };
    progSheet.getCell(`G${progCount + 2}`).value = { formula: `IF(D${progCount + 2}>0, F${progCount + 2}/D${progCount + 2}, 0)` };

    totalRow.eachCell((cell, colIndex) => {
      cell.font = { bold: true };
      cell.fill = footerFill;
      cell.border = borderStyle;
      if (colIndex >= 3) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
      if (colIndex === 4 || colIndex === 5 || colIndex === 6) {
        cell.numFmt = '#,##0.00" DH"';
      }
      if (colIndex === 7) {
        cell.numFmt = "0.0%";
      }
    });
  }

  // Auto-fit widths
  progSheet.columns.forEach((column) => {
    let maxWidth = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const w = estimateCellWidth(cell);
      if (w > maxWidth) maxWidth = w;
    });
    column.width = maxWidth;
  });

  // ----------------------------------------------------
  // SHEET 3: Services Performance
  // ----------------------------------------------------
  const svcSheet = workbook.addWorksheet("Services Performance");
  svcSheet.views = [{ showGridLines: true }];

  svcSheet.columns = [
    { header: "Service Type", key: "type" },
    { header: "Sales Count", key: "count" },
    { header: "Original Price (Cost)", key: "totalOriginalPrice" },
    { header: "Sale Price (Revenue)", key: "totalSalePrice" },
    { header: "Net Profit", key: "totalProfit" },
    { header: "Profit Margin", key: "profitMargin" },
  ];

  svcSheet.getRow(1).height = 25;
  svcSheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = headerFill;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = borderStyle;
  });

  data.serviceData.forEach((svc) => {
    const totalRev = Number(svc.totalSalePrice);
    const totalProf = Number(svc.totalProfit);
    const margin = totalRev > 0 ? (totalProf / totalRev) : 0;

    const row = svcSheet.addRow({
      type: svc.type,
      count: Number(svc.count),
      totalOriginalPrice: Number(svc.totalOriginalPrice),
      totalSalePrice: totalRev,
      totalProfit: totalProf,
      profitMargin: margin,
    });
    row.height = 20;

    row.eachCell((cell, colIndex) => {
      cell.border = borderStyle;
      if (colIndex >= 2) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
      } else {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      }

      if (colIndex === 3 || colIndex === 4 || colIndex === 5) {
        cell.numFmt = '#,##0.00" DH"';
      }
      if (colIndex === 6) {
        cell.numFmt = "0.0%";
      }
      if (colIndex === 5) {
        cell.font = { bold: true, color: { argb: cell.value >= 0 ? "FF16A34A" : "FFDC2626" } };
      }
    });
  });

  const svcCount = data.serviceData.length;
  if (svcCount > 0) {
    const totalRow = svcSheet.addRow([]);
    totalRow.height = 22;

    svcSheet.getCell(`A${svcCount + 2}`).value = "Total / Average";
    svcSheet.getCell(`B${svcCount + 2}`).value = { formula: `SUM(B2:B${svcCount + 1})` };
    svcSheet.getCell(`C${svcCount + 2}`).value = { formula: `SUM(C2:C${svcCount + 1})` };
    svcSheet.getCell(`D${svcCount + 2}`).value = { formula: `SUM(D2:D${svcCount + 1})` };
    svcSheet.getCell(`E${svcCount + 2}`).value = { formula: `SUM(E2:E${svcCount + 1})` };
    svcSheet.getCell(`F${svcCount + 2}`).value = { formula: `IF(D${svcCount + 2}>0, E${svcCount + 2}/D${svcCount + 2}, 0)` };

    totalRow.eachCell((cell, colIndex) => {
      cell.font = { bold: true };
      cell.fill = footerFill;
      cell.border = borderStyle;
      if (colIndex >= 2) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
      if (colIndex === 3 || colIndex === 4 || colIndex === 5) {
        cell.numFmt = '#,##0.00" DH"';
      }
      if (colIndex === 6) {
        cell.numFmt = "0.0%";
      }
    });
  }

  svcSheet.columns.forEach((column) => {
    let maxWidth = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const w = estimateCellWidth(cell);
      if (w > maxWidth) maxWidth = w;
    });
    column.width = maxWidth;
  });

  return workbook;
};
