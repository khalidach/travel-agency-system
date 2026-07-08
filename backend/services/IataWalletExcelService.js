const excel = require("exceljs");

const borderStyle = {
  top: { style: "thin", color: { argb: "FFD1D5DB" } },
  left: { style: "thin", color: { argb: "FFD1D5DB" } },
  bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
  right: { style: "thin", color: { argb: "FFD1D5DB" } },
};

const headerFill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1E3A8A" }, // Navy blue
};

/**
 * Estimates the rendered width of a cell value in ExcelJS column-width units.
 */
const estimateCellWidth = (cell) => {
  if (!cell || cell.value === null || cell.value === undefined) return 10;
  
  let displayText = "";
  const val = cell.value;
  if (typeof val === "object" && val !== null) {
    if (val.formula) {
      displayText = "000,000,000.00";
    } else if (val.richText) {
      displayText = val.richText.map((rt) => rt.text).join("");
    } else {
      displayText = String(val);
    }
  } else {
    displayText = String(val);
  }

  let charWidth = 0;
  for (const ch of displayText) {
    const code = ch.codePointAt(0);
    // Arabic char range check
    if (
      (code >= 0x0600 && code <= 0x06ff) ||
      (code >= 0x0750 && code <= 0x077f) ||
      (code >= 0x08a0 && code <= 0x08ff) ||
      (code >= 0x200e && code <= 0x200f) || // Directional marks
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

const translations = {
  ar: {
    iataWallet: "محفظة إياتا إيزي باي",
    date: "التاريخ",
    description: "البيان / الوصف",
    type: "النوع",
    deposit: "شحن (+)",
    deduction: "خصم (-)",
    balance: "الرصيد الجاري",
    iata_easypay_topup: "شحن إياتا إيزي باي",
    flight_ticket: "تذكرة طيران",
    totalTopUps: "إجمالي الشحن",
    totalDeductions: "إجمالي الخصومات",
    iataBalance: "رصيد المحفظة",
    noTransactions: "لا توجد معاملات مسجلة",
    statementPeriod: "كشف معاملات المحفظة",
  },
  en: {
    iataWallet: "IATA EasyPay Wallet Statement",
    date: "Date",
    description: "Description",
    type: "Type",
    deposit: "Deposit (+)",
    deduction: "Deduction (-)",
    balance: "Running Balance",
    iata_easypay_topup: "Wallet Top-up",
    flight_ticket: "Flight Ticket",
    totalTopUps: "Total Top-ups",
    totalDeductions: "Total Deductions",
    iataBalance: "Wallet Balance",
    noTransactions: "No transactions recorded",
    statementPeriod: "Wallet Statement Log",
  },
  fr: {
    iataWallet: "Relevé de Portefeuille IATA EasyPay",
    date: "Date",
    description: "Description",
    type: "Type",
    deposit: "Dépôt (+)",
    deduction: "Déduction (-)",
    balance: "Solde Progressif",
    iata_easypay_topup: "Recharge Portefeuille",
    flight_ticket: "Billet d'avion",
    totalTopUps: "Total Dépôts",
    totalDeductions: "Total Deductions",
    iataBalance: "Solde du Portefeuille",
    noTransactions: "Aucune transaction enregistrée",
    statementPeriod: "Relevé des Transactions du Portefeuille",
  }
};

exports.generateIataWalletExcel = async (expenses, lang = "ar") => {
  const t = translations[lang] || translations.ar;
  const isRtl = lang === "ar";

  const workbook = new excel.Workbook();
  const sheet = workbook.addWorksheet(t.iataWallet || "IATA Wallet");
  sheet.views = [{ showGridLines: true, rightToLeft: isRtl }];

  // 1. Compile Transactions
  const iataTransactions = [];
  expenses.forEach((e) => {
    // Top-ups
    if (e.category === "iata_easypay_topup") {
      iataTransactions.push({
        date: e.date,
        type: "deposit",
        description: e.description || t.iata_easypay_topup,
        amount: Number(e.amount),
      });
    }

    // Deductions
    if (e.advancePayments && Array.isArray(e.advancePayments)) {
      e.advancePayments.forEach((p) => {
        if (p.method === "iata_easypay") {
          const items = Array.isArray(e.items) ? e.items : (typeof e.items === "string" ? JSON.parse(e.items) : []);
          if (items.length > 0) {
            const itemsSum = items.reduce((sum, item) => {
              const itemTotal = item.total !== undefined && item.total !== null
                ? Number(item.total)
                : (Number(item.quantity) * Number(item.unitPrice) || 0);
              return sum + itemTotal;
            }, 0);

            items.forEach((item) => {
              const itemTotal = item.total !== undefined && item.total !== null
                ? Number(item.total)
                : (Number(item.quantity) * Number(item.unitPrice) || 0);
              const proportionalAmount = itemsSum > 0
                ? (itemTotal / itemsSum) * Number(p.amount)
                : Number(p.amount) / items.length;

              let desc = `${e.beneficiary || "IATA"} - ${item.description || e.description || ""}`;
              if (item.passengerName) {
                desc += ` (${item.passengerName})`;
              }
              if (item.bookingRef) {
                desc += ` [PNR: ${item.bookingRef}]`;
              }

              iataTransactions.push({
                date: p.date || e.date,
                type: "deduction",
                description: desc,
                amount: proportionalAmount,
              });
            });
          } else {
            iataTransactions.push({
              date: p.date || e.date,
              type: "deduction",
              description: `${e.beneficiary || "IATA"} - ${e.description}`,
              amount: Number(p.amount),
            });
          }
        }
      });
    }
  });

  // Sort chronologically (oldest first for correct running balance calculation)
  iataTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate Running Balance and KPIs
  let totalTopUps = 0;
  let totalDeductions = 0;
  let balance = 0;

  iataTransactions.forEach((tx) => {
    if (tx.type === "deposit") {
      balance += tx.amount;
      totalTopUps += tx.amount;
    } else {
      balance -= tx.amount;
      totalDeductions += tx.amount;
    }
    tx.runningBalance = balance;
  });

  const walletBalance = totalTopUps - totalDeductions;

  sheet.addRow([]); // Blank row 1

  // Title Block
  const titleRow = sheet.addRow([t.iataWallet]);
  titleRow.height = 30;
  const titleCell = sheet.getCell("A2");
  titleCell.font = { bold: true, size: 14, color: { argb: "FF1E3A8A" } };
  titleCell.alignment = { vertical: "middle", horizontal: isRtl ? "right" : "left" };
  sheet.mergeCells("A2:F2");

  // Subtitle
  const subtitleRow = sheet.addRow([t.statementPeriod]);
  subtitleRow.height = 20;
  const subtitleCell = sheet.getCell("A3");
  subtitleCell.font = { italic: true, size: 10, color: { argb: "FF64748B" } };
  subtitleCell.alignment = { vertical: "middle", horizontal: isRtl ? "right" : "left" };
  sheet.mergeCells("A3:F3");

  sheet.addRow([]); // Blank row 4

  // KPIs
  const kpis = [
    { label: t.totalTopUps, value: totalTopUps },
    { label: t.totalDeductions, value: totalDeductions },
    { label: t.iataBalance, value: walletBalance, isBalance: true },
  ];

  kpis.forEach((kpi, idx) => {
    const rIdx = 5 + idx;
    const row = sheet.getRow(rIdx);
    row.values = [kpi.label, kpi.value];
    row.height = 22;

    const cellA = row.getCell(1);
    const cellB = row.getCell(2);

    cellA.border = borderStyle;
    cellB.border = borderStyle;
    cellA.font = { size: 11, bold: true };
    cellB.font = { size: 11, bold: true };
    cellB.numFmt = `#,##0.00" MAD"`;
    cellB.alignment = { horizontal: isRtl ? "left" : "right" };
    cellA.alignment = { horizontal: isRtl ? "right" : "left" };

    cellA.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF8FAFC" }, // slate-50
    };

    if (kpi.isBalance) {
      cellB.font.color = { argb: kpi.value >= 0 ? "FF16A34A" : "FFDC2626" };
    }
  });

  sheet.addRow([]); // Blank row 8

  // Main Data Headers
  const headerValues = [
    t.date,
    t.description,
    t.type,
    t.deposit,
    t.deduction,
    t.balance,
  ];

  const headerRow = sheet.getRow(9);
  headerRow.values = headerValues;
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = headerFill;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = borderStyle;
  });

  // Main Data Rows
  if (iataTransactions.length === 0) {
    const noRow = sheet.addRow([t.noTransactions]);
    noRow.height = 25;
    sheet.mergeCells("A10:F10");
    const noCell = sheet.getCell("A10");
    noCell.font = { italic: true, color: { argb: "FF64748B" } };
    noCell.alignment = { vertical: "middle", horizontal: "center" };
    noCell.border = borderStyle;
  } else {
    // Chronologically for ledger statement presentation (oldest first)
    const displayTransactions = [...iataTransactions];

    displayTransactions.forEach((tx) => {
      const dataRow = sheet.addRow([
        new Date(tx.date),
        tx.description,
        tx.type === "deposit" ? t.iata_easypay_topup : t.flight_ticket,
        tx.type === "deposit" ? tx.amount : null,
        tx.type === "deduction" ? tx.amount : null,
        tx.runningBalance,
      ]);
      dataRow.height = 22;

      // Formatting cells
      const cellDate = dataRow.getCell(1);
      const cellDesc = dataRow.getCell(2);
      const cellType = dataRow.getCell(3);
      const cellDeposit = dataRow.getCell(4);
      const cellDeduct = dataRow.getCell(5);
      const cellBal = dataRow.getCell(6);

      // Borders
      dataRow.eachCell((cell) => {
        cell.border = borderStyle;
        cell.font = { size: 11 };
        cell.alignment = { vertical: "middle" };
      });

      // Alignments & formats
      cellDate.numFmt = "yyyy-mm-dd";
      cellDate.alignment = { horizontal: "center" };

      cellDesc.alignment = { horizontal: isRtl ? "right" : "left" };
      cellType.alignment = { horizontal: "center" };

      cellDeposit.numFmt = `#,##0.00`;
      cellDeposit.alignment = { horizontal: "right" };
      cellDeposit.font = { color: { argb: "FF16A34A" } }; // green

      cellDeduct.numFmt = `#,##0.00`;
      cellDeduct.alignment = { horizontal: "right" };
      cellDeduct.font = { color: { argb: "FFDC2626" } }; // red

      cellBal.numFmt = `#,##0.00" MAD"`;
      cellBal.alignment = { horizontal: "right" };
      cellBal.font = { bold: true };
    });
  }

  // Adjust Column Widths dynamically
  sheet.columns.forEach((col) => {
    let maxLen = 0;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const cellWidth = estimateCellWidth(cell);
      if (cellWidth > maxLen) {
        maxLen = cellWidth;
      }
    });
    col.width = Math.min(50, maxLen);
  });

  return workbook;
};
