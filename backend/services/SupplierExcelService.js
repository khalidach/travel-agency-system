// backend/services/SupplierExcelService.js
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

const translations = {
  ar: {
    hotels: "الفنادق",
    flights: "الطيران",
    visaTransport: "التأشيرات والنقل",
    other: "أخرى",
    id: "م",
    date: "التاريخ",
    description: "البيان / الوصف",
    quantity: "الكمية",
    unitPrice: "سعر الوحدة",
    total: "الإجمالي",
    payment: "الدفعة",
    remaining: "المتبقي",
    paymentLabel: "دفعة",
    cash: "نقدًا",
    cheque: "شيك",
    transfer: "تحويل بنكي",
    card: "بطاقة",
    supplierLedger: "كشف حساب المورد",
    totalPurchases: "إجمالي المشتريات",
    totalPaid: "إجمالي المدفوعات",
    totalRemaining: "إجمالي المتبقي",
    noTransactions: "لا توجد معاملات مسجلة",
    reservationNumber: "رقم الحجز",
    checkIn: "تاريخ الدخول",
    checkOut: "تاريخ الخروج",
    departureDate: "تاريخ الذهاب",
    returnDate: "تاريخ العودة",
  },
  en: {
    hotels: "Hotels",
    flights: "Flights",
    visaTransport: "Visa & Transport",
    other: "Other",
    id: "ID",
    date: "Date",
    description: "Description",
    quantity: "Quantity",
    unitPrice: "Unit Price",
    total: "Total",
    payment: "Payment",
    remaining: "Remaining Balance",
    paymentLabel: "Payment",
    cash: "Cash",
    cheque: "Cheque",
    transfer: "Transfer",
    card: "Card",
    supplierLedger: "Supplier Account Ledger",
    totalPurchases: "Total Purchases",
    totalPaid: "Total Paid",
    totalRemaining: "Total Remaining",
    noTransactions: "No transactions recorded",
    reservationNumber: "Reservation No.",
    checkIn: "Check-in Date",
    checkOut: "Check-out Date",
    departureDate: "Departure Date",
    returnDate: "Return Date",
  },
  fr: {
    hotels: "Hôtels",
    flights: "Vols",
    visaTransport: "Visa & Transport",
    other: "Autre",
    id: "N°",
    date: "Date",
    description: "Description",
    quantity: "Quantité",
    unitPrice: "Prix Unitaire",
    total: "Total",
    payment: "Paiement",
    remaining: "Solde Restant",
    paymentLabel: "Paiement",
    cash: "Espèces",
    cheque: "Chèque",
    transfer: "Virement",
    card: "Carte",
    supplierLedger: "Relevé de Compte Fournisseur",
    totalPurchases: "Total Achats",
    totalPaid: "Total Payé",
    totalRemaining: "Total Restant",
    noTransactions: "Aucune transaction enregistrée",
    reservationNumber: "N° Réservation",
    checkIn: "Date d'entrée",
    checkOut: "Date de sortie",
    departureDate: "Date de départ",
    returnDate: "Date de retour",
  }
};

const getCurrencyName = (code, lang) => {
  const currencies = {
    ar: {
      SAR: "ريال سعودي",
      MAD: "درهم مغربي",
      USD: "دولار أمريكي",
      EUR: "يورو",
      GBP: "جنيه إسترليني",
      TRY: "ليرة تركية",
      CNY: "يوان صيني"
    },
    en: {
      SAR: "SAR",
      MAD: "MAD",
      USD: "USD",
      EUR: "EUR",
      GBP: "GBP",
      TRY: "TRY",
      CNY: "CNY"
    },
    fr: {
      SAR: "SAR",
      MAD: "MAD",
      USD: "USD",
      EUR: "EUR",
      GBP: "GBP",
      TRY: "TRY",
      CNY: "CNY"
    }
  };
  const langCurrencies = currencies[lang] || currencies.ar;
  return langCurrencies[code] || code;
};

const translateMethod = (method, lang) => {
  const t = translations[lang] || translations.ar;
  return t[method] || method;
};

const buildLedgerRows = (categoryExpenses, lang) => {
  const rows = [];
  
  for (const exp of categoryExpenses) {
    const currency = exp.currency || "MAD";
    
    // 1. Add Purchase rows (either individual items or the aggregate amount)
    if (exp.items && Array.isArray(exp.items) && exp.items.length > 0) {
      for (const item of exp.items) {
        rows.push({
          type: "purchase",
          date: exp.date,
          description: item.description || exp.description,
          quantity: item.quantity !== undefined && item.quantity !== null ? Number(item.quantity) : 1,
          unitPrice: item.unitPrice !== undefined && item.unitPrice !== null ? Number(item.unitPrice) : 0,
          total: item.total !== undefined && item.total !== null ? Number(item.total) : 0,
          payment: null,
          currency,
          reservationNumber: exp.reservationNumber || null,
          checkIn: item.checkIn || null,
          checkOut: item.checkOut || null,
          departureDate: item.departureDate || null,
          returnDate: item.returnDate || null,
        });
      }
    } else {
      rows.push({
        type: "purchase",
        date: exp.date,
        description: exp.description,
        quantity: null,
        unitPrice: null,
        total: Number(exp.amount) || 0,
        payment: null,
        currency,
        reservationNumber: exp.reservationNumber || null,
        checkIn: null,
        checkOut: null,
        departureDate: null,
        returnDate: null,
      });
    }

    // 2. Add Payment rows
    if (exp.advancePayments && Array.isArray(exp.advancePayments)) {
      for (const p of exp.advancePayments) {
        let desc = p.labelPaper || p.forWhat;
        if (!desc) {
          const methodStr = translateMethod(p.method, lang);
          if (lang === "ar") {
            desc = `دفع (${methodStr})`;
          } else if (lang === "fr") {
            desc = `Paiement (${methodStr})`;
          } else {
            desc = `Payment (${methodStr})`;
          }
        }
        
        rows.push({
          type: "payment",
          date: p.date || exp.date,
          description: desc,
          quantity: null,
          unitPrice: null,
          total: null,
          payment: Number(p.amount) || 0,
          currency: p.currency || currency,
          reservationNumber: null,
          checkIn: null,
          checkOut: null,
          departureDate: null,
          returnDate: null,
        });
      }
    }
  }

  // Sort chronologically by date
  rows.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;
    // Purchases first, then payments if on same date
    if (a.type === "purchase" && b.type === "payment") return -1;
    if (a.type === "payment" && b.type === "purchase") return 1;
    return 0;
  });

  return rows;
};

const addLedgerSheet = (workbook, sheetName, categoryExpenses, supplier, lang, bookingType) => {
  const t = translations[lang] || translations.ar;
  const isRtl = lang === "ar";
  
  const ledgerRows = buildLedgerRows(categoryExpenses, lang);
  
  // Calculate running balance and KPI sums
  let totalPurchases = 0;
  let totalPaid = 0;
  let runningBalance = 0;
  
  for (const row of ledgerRows) {
    if (row.type === "purchase") {
      runningBalance += row.total;
      totalPurchases += row.total;
    } else {
      runningBalance -= row.payment;
      totalPaid += row.payment;
    }
    row.runningBalance = runningBalance;
  }
  const totalRemaining = totalPurchases - totalPaid;

  const sheet = workbook.addWorksheet(sheetName);
  sheet.views = [{ showGridLines: true, rightToLeft: isRtl }];

  sheet.addRow([]); // Blank row 1

  // Dynamic columns count
  let lastColLetter = "H";
  let colCount = 8;
  if (bookingType === "Hotel") {
    lastColLetter = "K";
    colCount = 11;
  } else if (bookingType === "Flight") {
    lastColLetter = "J";
    colCount = 10;
  }

  // Title Block
  const titleRow = sheet.addRow([`${t.supplierLedger}: ${supplier.name} - ${sheetName}`]);
  titleRow.height = 30;
  const titleCell = sheet.getCell("A2");
  titleCell.font = { bold: true, size: 14, color: { argb: "FF1E3A8A" } };
  titleCell.alignment = { vertical: "middle", horizontal: isRtl ? "right" : "left" };
  sheet.mergeCells(`A2:${lastColLetter}2`);

  // Subtitle
  const contactText = `Email: ${supplier.email || "-"} | Phone: ${supplier.phone || supplier.landline || "-"}`;
  const subtitleRow = sheet.addRow([contactText]);
  subtitleRow.height = 20;
  const subtitleCell = sheet.getCell("A3");
  subtitleCell.font = { italic: true, size: 10, color: { argb: "FF64748B" } };
  subtitleCell.alignment = { vertical: "middle", horizontal: isRtl ? "right" : "left" };
  sheet.mergeCells(`A3:${lastColLetter}3`);

  sheet.addRow([]); // Blank row 4

  // KPIs
  const sheetCurrency = ledgerRows.length > 0 ? ledgerRows[0].currency : "MAD";
  const currencyName = getCurrencyName(sheetCurrency, lang);

  const kpis = [
    { label: t.totalPurchases, value: totalPurchases },
    { label: t.totalPaid, value: totalPaid },
    { label: t.totalRemaining, value: totalRemaining, isRemaining: true },
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
    cellB.numFmt = `#,##0.00" ${currencyName}"`;
    cellB.alignment = { horizontal: isRtl ? "left" : "right" };
    cellA.alignment = { horizontal: isRtl ? "right" : "left" };
    
    cellA.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" }, // slate-100
    };
    
    if (kpi.isRemaining) {
      cellB.font.color = { argb: kpi.value > 0 ? "FFDC2626" : "FF16A34A" };
    }
  });

  sheet.addRow([]); // Blank row 8

  // Main Data Headers
  const headerRow = sheet.getRow(9);
  const headerValues = [
    t.id,
    t.date,
    t.description,
  ];
  if (bookingType === "Hotel") {
    headerValues.push(t.reservationNumber, t.checkIn, t.checkOut);
  } else if (bookingType === "Flight") {
    headerValues.push(t.departureDate, t.returnDate);
  }
  headerValues.push(
    t.quantity,
    t.unitPrice,
    t.total,
    t.payment,
    t.remaining,
  );
  headerRow.values = headerValues;
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = headerFill;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = borderStyle;
  });

  // Main Data Rows
  if (ledgerRows.length === 0) {
    const noRow = sheet.addRow([t.noTransactions]);
    noRow.height = 25;
    sheet.mergeCells(`A10:${lastColLetter}10`);
    const noCell = sheet.getCell("A10");
    noCell.font = { italic: true, color: { argb: "FF64748B" } };
    noCell.alignment = { vertical: "middle", horizontal: "center" };
    noCell.border = borderStyle;
  } else {
    ledgerRows.forEach((row, idx) => {
      const dataRow = sheet.addRow([]);
      dataRow.height = 22;
      
      let cellIndex = 1;
      const cellId = dataRow.getCell(cellIndex++);
      const cellDate = dataRow.getCell(cellIndex++);
      const cellDesc = dataRow.getCell(cellIndex++);
      
      let cellReservation = null;
      let cellCheckIn = null;
      let cellCheckOut = null;
      let cellDeparture = null;
      let cellReturn = null;
      
      if (bookingType === "Hotel") {
        cellReservation = dataRow.getCell(cellIndex++);
        cellCheckIn = dataRow.getCell(cellIndex++);
        cellCheckOut = dataRow.getCell(cellIndex++);
      } else if (bookingType === "Flight") {
        cellDeparture = dataRow.getCell(cellIndex++);
        cellReturn = dataRow.getCell(cellIndex++);
      }
      
      const cellQty = dataRow.getCell(cellIndex++);
      const cellUnitPrice = dataRow.getCell(cellIndex++);
      const cellTotal = dataRow.getCell(cellIndex++);
      const cellPay = dataRow.getCell(cellIndex++);
      const cellRem = dataRow.getCell(cellIndex++);
      
      cellId.value = idx + 1;
      
      // Formatting date: use localized strings or YYYY-MM-DD
      let dateString = "-";
      if (row.date) {
        const d = new Date(row.date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        dateString = `${day}/${month}/${year}`;
      }
      cellDate.value = dateString;
      cellDesc.value = row.description || "-";
      
      if (bookingType === "Hotel") {
        cellReservation.value = row.reservationNumber || "-";
        
        let checkInStr = "-";
        if (row.checkIn) {
          const d = new Date(row.checkIn);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          checkInStr = `${day}/${month}/${year}`;
        }
        cellCheckIn.value = checkInStr;
        
        let checkOutStr = "-";
        if (row.checkOut) {
          const d = new Date(row.checkOut);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          checkOutStr = `${day}/${month}/${year}`;
        }
        cellCheckOut.value = checkOutStr;
      } else if (bookingType === "Flight") {
        let departureStr = "-";
        if (row.departureDate) {
          const d = new Date(row.departureDate);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          departureStr = `${day}/${month}/${year}`;
        }
        cellDeparture.value = departureStr;
        
        let returnStr = "-";
        if (row.returnDate) {
          const d = new Date(row.returnDate);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          returnStr = `${day}/${month}/${year}`;
        }
        cellReturn.value = returnStr;
      }
      
      const rowCurrencyName = getCurrencyName(row.currency, lang);
      
      if (row.type === "purchase") {
        cellQty.value = row.quantity !== null && row.quantity !== undefined ? Number(row.quantity) : "-";
        cellUnitPrice.value = row.unitPrice !== null && row.unitPrice !== undefined ? Number(row.unitPrice) : "-";
        cellTotal.value = Number(row.total);
        cellPay.value = "-";
        
        if (row.unitPrice !== null && row.unitPrice !== undefined) {
          cellUnitPrice.numFmt = `#,##0.00" ${rowCurrencyName}"`;
        }
        cellTotal.numFmt = `#,##0.00" ${rowCurrencyName}"`;
      } else {
        cellQty.value = "-";
        cellUnitPrice.value = "-";
        cellTotal.value = "-";
        cellPay.value = Number(row.payment);
        
        cellPay.numFmt = `#,##0.00" ${rowCurrencyName}"`;
      }
      
      cellRem.value = Number(row.runningBalance);
      cellRem.numFmt = `#,##0.00" ${rowCurrencyName}"`;
      
      // Alignments
      const centeredCells = [cellId, cellDate, cellQty];
      if (bookingType === "Hotel") {
        centeredCells.push(cellReservation, cellCheckIn, cellCheckOut);
      } else if (bookingType === "Flight") {
        centeredCells.push(cellDeparture, cellReturn);
      }
      
      centeredCells.forEach((c) => {
        if (c) c.alignment = { horizontal: "center", vertical: "middle" };
      });
      
      cellDesc.alignment = { horizontal: isRtl ? "right" : "left", vertical: "middle" };
      
      [cellUnitPrice, cellTotal, cellPay, cellRem].forEach((c) => {
        if (c.value !== "-") {
          c.alignment = { horizontal: "right", vertical: "middle" };
        } else {
          c.alignment = { horizontal: "center", vertical: "middle" };
        }
      });
      
      dataRow.eachCell((c) => {
        c.border = borderStyle;
        c.font = { size: 10 };
      });
    });
  }

  // Adjust Column Widths dynamically
  sheet.columns.forEach((column) => {
    let maxLen = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const cellWidth = estimateCellWidth(cell);
      if (cellWidth > maxLen) {
        maxLen = cellWidth;
      }
    });
    column.width = Math.min(maxLen, 40);
  });
};

exports.generateSupplierExcel = async (supplier, expenses, lang = "ar") => {
  const workbook = new excel.Workbook();
  const t = translations[lang] || translations.ar;

  // Group by service type
  const hotelExpenses = [];
  const flightExpenses = [];
  const visaTransportExpenses = [];
  const otherExpenses = [];

  for (const exp of expenses) {
    if (exp.bookingType === "Hotel") {
      hotelExpenses.push(exp);
    } else if (exp.bookingType === "Flight") {
      flightExpenses.push(exp);
    } else if (exp.bookingType === "Visa" || exp.bookingType === "Transfer") {
      visaTransportExpenses.push(exp);
    } else {
      otherExpenses.push(exp);
    }
  }

  // Add Hotel Sheet
  addLedgerSheet(workbook, t.hotels, hotelExpenses, supplier, lang, "Hotel");

  // Add Flight Sheet
  addLedgerSheet(workbook, t.flights, flightExpenses, supplier, lang, "Flight");

  // Add Visa & Transport Sheet (Combined)
  addLedgerSheet(workbook, t.visaTransport, visaTransportExpenses, supplier, lang, "Visa/Transfer");

  // Add Other Sheet
  addLedgerSheet(workbook, t.other, otherExpenses, supplier, lang, "Other");

  return workbook;
};
