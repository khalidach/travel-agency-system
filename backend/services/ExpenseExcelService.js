// backend/services/ExpenseExcelService.js
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
  top: { style: "thin", color: { argb: "FF000000" } },
  left: { style: "thin", color: { argb: "FF000000" } },
  bottom: { style: "thin", color: { argb: "FF000000" } },
  right: { style: "thin", color: { argb: "FF000000" } },
};

const headerFill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1E3A8A" }, // Navy blue
};

const translations = {
  ar: {
    expenseDetails: "تفاصيل المصروف",
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
    totalPurchases: "إجمالي المصروف",
    totalPaid: "إجمالي المدفوعات",
    totalRemaining: "إجمالي المتبقي",
    noTransactions: "لا توجد معاملات مسجلة",
    reservationNumber: "رقم الحجز",
    checkIn: "تاريخ الدخول",
    checkOut: "تاريخ الخروج",
    departureDate: "تاريخ الذهاب",
    returnDate: "تاريخ العودة",
    passengerName: "اسم المسافر",
    bookingRef: "مرجع الحجز (PNR)",
    ticketCategory: "فئة التذكرة",
    issuingFees: "رسوم الإصدار",
    beneficiary: "المستفيد",
    category: "الفئة",
    bookingType: "نوع الحجز",
    type: "النوع",
  },
  en: {
    expenseDetails: "Expense Details",
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
    totalPurchases: "Total Expense",
    totalPaid: "Total Paid",
    totalRemaining: "Total Remaining",
    noTransactions: "No transactions recorded",
    reservationNumber: "Reservation No.",
    checkIn: "Check-in Date",
    checkOut: "Check-out Date",
    departureDate: "Departure Date",
    returnDate: "Return Date",
    passengerName: "Passenger Name",
    bookingRef: "Booking Reference (PNR)",
    ticketCategory: "Ticket Category",
    issuingFees: "Issuing Fees",
    beneficiary: "Beneficiary",
    category: "Category",
    bookingType: "Booking Type",
    type: "Type",
  },
  fr: {
    expenseDetails: "Détails de la Dépense",
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
    totalPurchases: "Total Dépense",
    totalPaid: "Total Payé",
    totalRemaining: "Total Restant",
    noTransactions: "Aucune transaction enregistrée",
    reservationNumber: "N° Réservation",
    checkIn: "Date d'entrée",
    checkOut: "Date de sortie",
    departureDate: "Date de départ",
    returnDate: "Date de retour",
    passengerName: "Nom du passager",
    bookingRef: "Référence de réservation (PNR)",
    ticketCategory: "Catégorie du billet",
    issuingFees: "Frais d'émission",
    beneficiary: "Bénéficiaire",
    category: "Catégorie",
    bookingType: "Type de Réservation",
    type: "Type",
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

const translateCategory = (cat, lang) => {
  if (!cat) return "-";
  const catTranslations = {
    ar: {
      hotels: "الفنادق",
      flights: "الطيران",
      visa: "التأشيرات",
      transport: "النقل",
      visaTransport: "التأشيرات والنقل",
      other: "أخرى",
      regular: "مصاريف عادية",
      order_note: "مذكرة طلب"
    },
    en: {
      hotels: "Hotels",
      flights: "Flights",
      visa: "Visa",
      transport: "Transport",
      visaTransport: "Visa & Transport",
      other: "Other",
      regular: "Regular Expense",
      order_note: "Order Note"
    },
    fr: {
      hotels: "Hôtels",
      flights: "Vols",
      visa: "Visa",
      transport: "Transport",
      visaTransport: "Visa & Transport",
      other: "Autre",
      regular: "Dépense Régulière",
      order_note: "Bon de Commande"
    }
  };
  const langCats = catTranslations[lang] || catTranslations.ar;
  return langCats[cat.toLowerCase()] || cat;
};

const translateMethod = (method, lang) => {
  const t = translations[lang] || translations.ar;
  return t[method] || method;
};

const buildLedgerRows = (expense, lang) => {
  const rows = [];
  const currency = expense.currency || "MAD";
  
  // 1. Add Purchase rows (either individual items or the aggregate amount)
  if (expense.items && Array.isArray(expense.items) && expense.items.length > 0) {
    for (const item of expense.items) {
      rows.push({
        type: "purchase",
        date: expense.date,
        description: item.description || expense.description,
        quantity: item.quantity !== undefined && item.quantity !== null ? Number(item.quantity) : 1,
        unitPrice: item.unitPrice !== undefined && item.unitPrice !== null ? Number(item.unitPrice) : 0,
        total: item.total !== undefined && item.total !== null ? Number(item.total) : 0,
        payment: null,
        currency,
        reservationNumber: expense.reservationNumber || null,
        checkIn: item.checkIn || null,
        checkOut: item.checkOut || null,
        departureDate: item.departureDate || null,
        returnDate: item.returnDate || null,
        passengerName: item.passengerName || null,
        bookingRef: item.bookingRef || null,
        ticketCategory: item.ticketCategory || null,
        issuingFees: item.issuingFees !== undefined && item.issuingFees !== null ? Number(item.issuingFees) : null,
      });
    }
  } else {
    rows.push({
      type: "purchase",
      date: expense.date,
      description: expense.description,
      quantity: null,
      unitPrice: null,
      total: Number(expense.amount) || 0,
      payment: null,
      currency,
      reservationNumber: expense.reservationNumber || null,
      checkIn: null,
      checkOut: null,
      departureDate: null,
      returnDate: null,
      passengerName: null,
      bookingRef: null,
      ticketCategory: null,
      issuingFees: null,
    });
  }

  // 2. Add Payment rows
  if (expense.advancePayments && Array.isArray(expense.advancePayments)) {
    for (const p of expense.advancePayments) {
      let desc = p.labelPaper || p.forWhat;
      if (!desc) {
        if (expense.reservationNumber) {
          if (lang === "ar") {
            desc = `دفعة حجز ${expense.reservationNumber}`;
          } else if (lang === "fr") {
            desc = `Paiement réservation ${expense.reservationNumber}`;
          } else {
            desc = `Booking payment ${expense.reservationNumber}`;
          }
        } else {
          if (lang === "ar") {
            desc = `دفعة ${expense.description || ""}`;
          } else if (lang === "fr") {
            desc = `Paiement ${expense.description || ""}`;
          } else {
            desc = `Payment ${expense.description || ""}`;
          }
        }
      }
      
      rows.push({
        type: "payment",
        date: p.date || expense.date,
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
        passengerName: null,
        bookingRef: null,
        ticketCategory: null,
        issuingFees: null,
      });
    }
  }

  // Sort chronologically by date
  rows.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;
    if (a.type === "purchase" && b.type === "payment") return -1;
    if (a.type === "payment" && b.type === "purchase") return 1;
    return 0;
  });

  return rows;
};

const formatDate = (dateVal) => {
  if (!dateVal) return "-";
  const d = new Date(dateVal);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

exports.generateExpenseExcel = async (expense, lang = "ar") => {
  const workbook = new excel.Workbook();
  const t = translations[lang] || translations.ar;
  const isRtl = lang === "ar";
  
  const ledgerRows = buildLedgerRows(expense, lang);
  
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

  const bookingType = expense.bookingType;
  const hasPassengerName = bookingType === "Flight" && ledgerRows.some(row => row.passengerName && row.passengerName.trim() !== "");
  const hasBookingRef = bookingType === "Flight" && ledgerRows.some(row => row.bookingRef && row.bookingRef.trim() !== "");
  const hasTicketCategory = bookingType === "Flight" && ledgerRows.some(row => row.ticketCategory && row.ticketCategory.trim() !== "");
  const hasIssuingFees = bookingType === "Flight" && ledgerRows.some(row => row.issuingFees !== undefined && row.issuingFees !== null && Number(row.issuingFees) !== 0);

  // Build header values dynamically
  const headerValues = [
    lang === "ar" ? "م" : "ID",
    t.date,
    t.description,
  ];
  if (bookingType === "Hotel") {
    headerValues.push(t.reservationNumber, t.checkIn, t.checkOut);
  } else if (bookingType === "Flight") {
    if (hasPassengerName) headerValues.push(t.passengerName);
    if (hasBookingRef) headerValues.push(t.bookingRef);
    if (hasTicketCategory) headerValues.push(t.ticketCategory);
    headerValues.push(t.departureDate, t.returnDate);
  }
  headerValues.push(t.quantity);
  if (bookingType === "Flight" && hasIssuingFees) {
    headerValues.push(t.unitPrice, t.issuingFees);
  } else {
    headerValues.push(t.unitPrice);
  }
  headerValues.push(
    t.total,
    t.payment,
    t.remaining,
  );

  const colCount = headerValues.length;
  const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"];
  const lastColLetter = letters[colCount - 1] || "J";

  const sheet = workbook.addWorksheet(t.expenseDetails);
  sheet.views = [{ showGridLines: true, rightToLeft: isRtl }];

  sheet.addRow([]); // Blank row 1

  // Title Block
  const titleText = `${expense.type === "order_note" ? t.expenseDetails : t.expenseDetails}: ${expense.description}`;
  const titleRow = sheet.addRow([titleText]);
  titleRow.height = 30;
  const titleCell = sheet.getCell("A2");
  titleCell.font = { bold: true, size: 14, color: { argb: "FF1E3A8A" } };
  titleCell.alignment = { vertical: "middle", horizontal: isRtl ? "right" : "left" };
  sheet.mergeCells(`A2:${lastColLetter}2`);

  // Subtitle/Metadata Grid Info
  // Row 3
  const row3 = sheet.addRow([
    t.beneficiary, expense.beneficiary || "-", "",
    t.date, formatDate(expense.date)
  ]);
  row3.height = 20;
  sheet.mergeCells(`B3:C3`);
  sheet.mergeCells(`E3:${lastColLetter}3`);

  // Row 4
  const row4 = sheet.addRow([
    t.category, translateCategory(expense.category, lang), "",
    t.type, translateCategory(expense.type, lang)
  ]);
  row4.height = 20;
  sheet.mergeCells(`B4:C4`);
  sheet.mergeCells(`E4:${lastColLetter}4`);

  // Row 5
  const row5 = sheet.addRow([
    t.bookingType, expense.bookingType || "-", "",
    t.reservationNumber, expense.reservationNumber || "-"
  ]);
  row5.height = 20;
  sheet.mergeCells(`B5:C5`);
  sheet.mergeCells(`E5:${lastColLetter}5`);

  // Stylize metadata labels
  const labelStyle = { bold: true, size: 10, color: { argb: "FF475569" } };
  const valStyle = { size: 10, color: { argb: "FF000000" } };

  [3, 4, 5].forEach((rIdx) => {
    const r = sheet.getRow(rIdx);
    const cellA = r.getCell(1);
    const cellB = r.getCell(2);
    const cellD = r.getCell(4);
    const cellE = r.getCell(5);

    cellA.font = labelStyle;
    cellB.font = valStyle;
    cellD.font = labelStyle;
    cellE.font = valStyle;

    cellA.alignment = { horizontal: isRtl ? "right" : "left" };
    cellB.alignment = { horizontal: isRtl ? "right" : "left" };
    cellD.alignment = { horizontal: isRtl ? "right" : "left" };
    cellE.alignment = { horizontal: isRtl ? "right" : "left" };
  });

  sheet.addRow([]); // Blank row 6
  sheet.addRow([]); // Blank row 7

  // KPIs
  const sheetCurrency = expense.currency || "MAD";
  const currencyName = getCurrencyName(sheetCurrency, lang);

  const kpis = [
    { label: t.totalPurchases, value: totalPurchases },
    { label: t.totalPaid, value: totalPaid },
    { label: t.totalRemaining, value: totalRemaining, isRemaining: true },
  ];

  kpis.forEach((kpi, idx) => {
    const rIdx = 8 + idx;
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

  sheet.addRow([]); // Blank row 11

  // Main Data Headers
  const headerRow = sheet.getRow(12);
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
    sheet.mergeCells(`A13:${lastColLetter}13`);
    const noCell = sheet.getCell("A13");
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
      let cellPassengerName = null;
      let cellBookingRef = null;
      let cellTicketCategory = null;
      let cellDeparture = null;
      let cellReturn = null;
      
      if (bookingType === "Hotel") {
        cellReservation = dataRow.getCell(cellIndex++);
        cellCheckIn = dataRow.getCell(cellIndex++);
        cellCheckOut = dataRow.getCell(cellIndex++);
      } else if (bookingType === "Flight") {
        if (hasPassengerName) cellPassengerName = dataRow.getCell(cellIndex++);
        if (hasBookingRef) cellBookingRef = dataRow.getCell(cellIndex++);
        if (hasTicketCategory) cellTicketCategory = dataRow.getCell(cellIndex++);
        cellDeparture = dataRow.getCell(cellIndex++);
        cellReturn = dataRow.getCell(cellIndex++);
      }
      
      const cellQty = dataRow.getCell(cellIndex++);
      const cellUnitPrice = dataRow.getCell(cellIndex++);
      let cellIssuingFees = null;
      if (bookingType === "Flight" && hasIssuingFees) {
        cellIssuingFees = dataRow.getCell(cellIndex++);
      }
      const cellTotal = dataRow.getCell(cellIndex++);
      const cellPay = dataRow.getCell(cellIndex++);
      const cellRem = dataRow.getCell(cellIndex++);
      
      cellId.value = idx + 1;
      cellDate.value = formatDate(row.date);
      cellDesc.value = row.description || "-";
      
      if (bookingType === "Hotel") {
        cellReservation.value = row.reservationNumber || "-";
        cellCheckIn.value = formatDate(row.checkIn);
        cellCheckOut.value = formatDate(row.checkOut);
      } else if (bookingType === "Flight") {
        if (hasPassengerName) cellPassengerName.value = row.passengerName || "-";
        if (hasBookingRef) cellBookingRef.value = row.bookingRef || "-";
        if (hasTicketCategory) cellTicketCategory.value = row.ticketCategory || "-";
        cellDeparture.value = formatDate(row.departureDate);
        cellReturn.value = formatDate(row.returnDate);
      }
      
      const rowCurrencyName = getCurrencyName(row.currency, lang);
      
      if (row.type === "purchase") {
        cellQty.value = row.quantity !== null && row.quantity !== undefined ? Number(row.quantity) : "-";
        cellUnitPrice.value = row.unitPrice !== null && row.unitPrice !== undefined ? Number(row.unitPrice) : "-";
        if (bookingType === "Flight" && hasIssuingFees) {
          cellIssuingFees.value = row.issuingFees !== null && row.issuingFees !== undefined ? Number(row.issuingFees) : "-";
        }
        cellTotal.value = Number(row.total);
        cellPay.value = "-";
        
        if (row.unitPrice !== null && row.unitPrice !== undefined) {
          cellUnitPrice.numFmt = `#,##0.00" ${rowCurrencyName}"`;
        }
        if (bookingType === "Flight" && hasIssuingFees && row.issuingFees !== null && row.issuingFees !== undefined) {
          cellIssuingFees.numFmt = `#,##0.00" ${rowCurrencyName}"`;
        }
        cellTotal.numFmt = `#,##0.00" ${rowCurrencyName}"`;
      } else {
        cellQty.value = "-";
        cellUnitPrice.value = "-";
        if (bookingType === "Flight" && hasIssuingFees) {
          cellIssuingFees.value = "-";
        }
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
        if (hasBookingRef) centeredCells.push(cellBookingRef);
        if (hasTicketCategory) centeredCells.push(cellTicketCategory);
      }
      
      centeredCells.forEach((c) => {
        if (c) c.alignment = { horizontal: "center", vertical: "middle" };
      });
      
      cellDesc.alignment = { horizontal: isRtl ? "right" : "left", vertical: "middle" };
      if (hasPassengerName && cellPassengerName) {
        cellPassengerName.alignment = { horizontal: isRtl ? "right" : "left", vertical: "middle" };
      }
      
      const rightOrCenteredCells = [cellUnitPrice, cellTotal, cellPay, cellRem];
      if (hasIssuingFees && cellIssuingFees) {
        rightOrCenteredCells.push(cellIssuingFees);
      }
      
      rightOrCenteredCells.forEach((c) => {
        if (c.value !== "-") {
          c.alignment = { horizontal: "right", vertical: "middle" };
        } else {
          c.alignment = { horizontal: "center", vertical: "middle" };
        }
      });
      
      dataRow.eachCell((c) => {
        c.border = borderStyle;
        c.font = { size: 10, bold: true };
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

  return workbook;
};

exports.generateExpensesListExcel = async (expenses, type, lang = "ar") => {
  const workbook = new excel.Workbook();
  const t = translations[lang] || translations.ar;
  const isRtl = lang === "ar";

  const sheetName = type === "regular" 
    ? (lang === "ar" ? "المصاريف العادية" : (lang === "fr" ? "Dépenses Régulières" : "Regular Expenses"))
    : (lang === "ar" ? "مذكرات الطلب" : (lang === "fr" ? "Bons de Commande" : "Order Notes"));

  const sheet = workbook.addWorksheet(sheetName);
  sheet.views = [{ showGridLines: true, rightToLeft: isRtl }];

  // Title Block
  const titleText = type === "regular"
    ? (lang === "ar" ? "تقرير المصاريف العادية" : (lang === "fr" ? "Rapport des Dépenses Régulières" : "Regular Expenses Report"))
    : (lang === "ar" ? "تقرير مذكرات الطلب" : (lang === "fr" ? "Rapport des Bons de Commande" : "Order Notes Report"));

  sheet.addRow([]); // Blank row 1

  const titleRow = sheet.addRow([titleText]);
  titleRow.height = 30;
  const titleCell = sheet.getCell("A2");
  titleCell.font = { bold: true, size: 14, color: { argb: "FF1E3A8A" } };
  titleCell.alignment = { vertical: "middle", horizontal: isRtl ? "right" : "left" };

  // Calculate sum of amounts
  let totalAmount = 0;
  let totalPaid = 0;
  let totalRemaining = 0;
  expenses.forEach(e => {
    const amt = Number(e.amount) || 0;
    totalAmount += amt;
    if (e.type === "regular") {
      totalPaid += amt;
    } else {
      const remaining = Number(e.remainingBalance) || 0;
      totalRemaining += remaining;
      totalPaid += (amt - remaining);
    }
  });

  sheet.addRow([]); // Blank row 3

  // KPIs
  const kpiData = [
    { label: t.totalPurchases, value: totalAmount },
    { label: t.totalPaid, value: totalPaid }
  ];
  if (type === "order_note") {
    kpiData.push({ label: t.totalRemaining, value: totalRemaining });
  }

  // Merge title row across headers (number of columns depends on headers size)
  const headerCols = type === "regular" ? 6 : 8;
  const colLetter = String.fromCharCode(64 + headerCols);
  sheet.mergeCells(`A2:${colLetter}2`);

  kpiData.forEach((kpi, idx) => {
    const rIdx = 4 + idx;
    const row = sheet.getRow(rIdx);
    row.values = [kpi.label, kpi.value];
    row.height = 22;

    const cellA = row.getCell(1);
    const cellB = row.getCell(2);

    cellA.border = borderStyle;
    cellB.border = borderStyle;
    cellA.font = { size: 11, bold: true };
    cellB.font = { size: 11, bold: true };
    cellB.numFmt = `#,##0.00`;
    cellB.alignment = { horizontal: isRtl ? "left" : "right" };
    cellA.alignment = { horizontal: isRtl ? "right" : "left" };

    cellA.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF8FAFC" }, // slate-50
    };
  });

  sheet.addRow([]); // Blank row 6 / 7 depending on KPIs length
  const headerRowIdx = type === "regular" ? 7 : 8;

  // Main Data Headers
  let headers = [];
  if (type === "regular") {
    headers = [
      t.date,
      t.description,
      t.category,
      t.total, // Amount
      t.payment, // Paid
      lang === "ar" ? "الحالة" : (lang === "fr" ? "Statut" : "Status")
    ];
  } else {
    headers = [
      t.date,
      t.description,
      t.beneficiary,
      t.bookingType,
      t.total, // Amount
      t.payment, // Paid
      t.remaining, // Remaining
      lang === "ar" ? "الحالة" : (lang === "fr" ? "Statut" : "Status")
    ];
  }

  const headerRow = sheet.getRow(headerRowIdx);
  headerRow.values = headers;
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = headerFill;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = borderStyle;
  });

  const startDataRow = headerRowIdx + 1;

  if (expenses.length === 0) {
    const noRow = sheet.addRow([t.noTransactions]);
    noRow.height = 25;
    sheet.mergeCells(`A${startDataRow}:${colLetter}${startDataRow}`);
    const noCell = sheet.getCell(`A${startDataRow}`);
    noCell.font = { italic: true, color: { argb: "FF64748B" } };
    noCell.alignment = { vertical: "middle", horizontal: "center" };
    noCell.border = borderStyle;
  } else {
    expenses.forEach((e) => {
      const amt = Number(e.amount) || 0;
      const currency = e.currency || "MAD";
      const paid = e.type === "regular" ? amt : (amt - (Number(e.remainingBalance) || 0));
      const remaining = e.type === "regular" ? 0 : (Number(e.remainingBalance) || 0);

      const statusText = e.isFullyPaid 
        ? (lang === "ar" ? "مدفوع بالكامل" : (lang === "fr" ? "Entièrement Payé" : "Fully Paid"))
        : (lang === "ar" ? "معلق" : (lang === "fr" ? "En attente" : "Pending"));

      let rowValues = [];
      if (type === "regular") {
        rowValues = [
          new Date(e.date),
          e.description,
          translateCategory(e.category, lang),
          amt,
          paid,
          statusText
        ];
      } else {
        rowValues = [
          new Date(e.date),
          e.description,
          e.beneficiary || "-",
          e.bookingType ? (t[`bookingTypes.${e.bookingType}`] || e.bookingType) : "-",
          amt,
          paid,
          remaining,
          statusText
        ];
      }

      const dataRow = sheet.addRow(rowValues);
      dataRow.height = 20;

      // Align and format cells
      dataRow.eachCell((cell, colIdx) => {
        cell.border = borderStyle;
        
        // Date column formatting (always first col)
        if (colIdx === 1) {
          cell.numFmt = "yyyy-mm-dd";
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } 
        // Text alignment
        else if (type === "regular" && (colIdx === 2 || colIdx === 3)) {
          cell.alignment = { horizontal: isRtl ? "right" : "left", vertical: "middle" };
        } else if (type === "order_note" && (colIdx >= 2 && colIdx <= 4)) {
          cell.alignment = { horizontal: isRtl ? "right" : "left", vertical: "middle" };
        } 
        // Numeric values formatting
        else if (type === "regular" && (colIdx === 4 || colIdx === 5)) {
          cell.numFmt = `#,##0.00" ${currency}"`;
          cell.alignment = { horizontal: "right", vertical: "middle" };
        } else if (type === "order_note" && (colIdx >= 5 && colIdx <= 7)) {
          cell.numFmt = `#,##0.00" ${currency}"`;
          cell.alignment = { horizontal: "right", vertical: "middle" };
        }
        // Status formatting
        else {
          cell.alignment = { horizontal: "center", vertical: "middle" };
          if (e.isFullyPaid) {
            cell.font = { color: { argb: "FF16A34A" }, bold: true };
          } else {
            cell.font = { color: { argb: "FFD97706" }, bold: true };
          }
        }
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

  return workbook;
};
