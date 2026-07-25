// backend/services/IncomeExcelService.js
const excel = require("exceljs");

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
    id: "م",
    deliveryNoteDetails: "تفاصيل سند التسليم",
    deliveryNoteList: "قائمة سندات التسليم",
    incomeDetails: "تفاصيل الدخل",
    incomeList: "قائمة المقبوضات",
    deliveryNoteNo: "رقم سند التسليم",
    clientName: "اسم العميل",
    date: "التاريخ",
    category: "الفئة",
    description: "البيان / الوصف",
    quantity: "الكمية",
    unitPrice: "سعر الوحدة",
    total: "الإجمالي",
    payment: "الدفعة",
    remaining: "المتبقي",
    paymentMethod: "طريقة الدفع",
    totalIncomes: "إجمالي المقبوضات",
    totalPaid: "إجمالي المدفوع",
    totalRemaining: "إجمالي المتبقي",
    noTransactions: "لا توجد معاملات مسجلة",
    mad: "درهم مغربي",
    status: "الحالة",
    paid: "مؤدى",
    pending: "في الانتظار",
    regular: "مقبوضات عادية",
    delivery_note: "سند تسليم",
    items: "العناصر المرفقة",
    paymentsHistory: "سجل الدفعات التقديمية",
  },
  en: {
    id: "ID",
    deliveryNoteDetails: "Delivery Note Details",
    deliveryNoteList: "Delivery Notes List",
    incomeDetails: "Income Details",
    incomeList: "Income List",
    deliveryNoteNo: "Delivery Note No.",
    clientName: "Client Name",
    date: "Date",
    category: "Category",
    description: "Description",
    quantity: "Quantity",
    unitPrice: "Unit Price",
    total: "Total",
    payment: "Payment",
    remaining: "Remaining",
    paymentMethod: "Payment Method",
    totalIncomes: "Total Incomes",
    totalPaid: "Total Paid",
    totalRemaining: "Total Remaining",
    noTransactions: "No transactions recorded",
    mad: "MAD",
    status: "Status",
    paid: "Paid",
    pending: "Pending",
    regular: "Regular Income",
    delivery_note: "Delivery Note",
    items: "Items Details",
    paymentsHistory: "Advance Payments History",
  },
  fr: {
    id: "N°",
    deliveryNoteDetails: "Détails du Bon de Livraison",
    deliveryNoteList: "Liste des Bons de Livraison",
    incomeDetails: "Détails de la Recette",
    incomeList: "Liste des Recettes",
    deliveryNoteNo: "N° Bon de Livraison",
    clientName: "Nom du Client",
    date: "Date",
    category: "Catégorie",
    description: "Description",
    quantity: "Quantité",
    unitPrice: "Prix Unitaire",
    total: "Total",
    payment: "Paiement",
    remaining: "Restant",
    paymentMethod: "Mode de Paiement",
    totalIncomes: "Total Recettes",
    totalPaid: "Total Payé",
    totalRemaining: "Total Restant",
    noTransactions: "Aucune transaction enregistrée",
    mad: "MAD",
    status: "Statut",
    paid: "Payé",
    pending: "En attente",
    regular: "Recette Régulière",
    delivery_note: "Bon de Livraison",
    items: "Détails des Articles",
    paymentsHistory: "Historique des Paiements",
  }
};

const formatDate = (dateVal) => {
  if (!dateVal) return "-";
  const d = new Date(dateVal);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const getCurrencyDisplay = (curr, lang) => {
  const code = curr || "MAD";
  return code; // Can keep as is or translate if needed
};

exports.generateIncomeExcel = async (income, lang = "ar") => {
  const workbook = new excel.Workbook();
  const t = translations[lang] || translations.ar;
  const isRtl = lang === "ar";
  
  const isDn = income.type === "delivery_note";
  const sheetName = isDn ? "Bon de Livraison" : "Recette";
  const sheet = workbook.addWorksheet(sheetName);
  sheet.views = [{ showGridLines: true, rightToLeft: isRtl }];
  
  sheet.addRow([]); // Blank row
  
  // Title
  const titleText = isDn ? `${t.deliveryNoteDetails}: ${income.deliveryNoteNumber || income.id}` : `${t.incomeDetails}: ${income.description}`;
  const titleRow = sheet.addRow([titleText]);
  titleRow.height = 30;
  const titleCell = sheet.getCell("A2");
  titleCell.font = { bold: true, size: 14, color: { argb: "FF1E3A8A" } };
  titleCell.alignment = { vertical: "middle", horizontal: isRtl ? "right" : "left" };
  sheet.mergeCells("A2:F2");
  
  // Metadata
  const metadata = [
    [t.clientName, income.client || "-", "", isDn ? t.deliveryNoteNo : t.category, isDn ? income.deliveryNoteNumber : (income.category || "-")],
    [t.date, formatDate(income.date), "", t.status, income.isFullyPaid ? t.paid : t.pending]
  ];
  
  metadata.forEach((mArr, idx) => {
    const row = sheet.addRow(mArr);
    row.height = 20;
    sheet.mergeCells(`B${row.number}:C${row.number}`);
    sheet.mergeCells(`E${row.number}:F${row.number}`);
    
    const cellA = row.getCell(1);
    const cellB = row.getCell(2);
    const cellD = row.getCell(4);
    const cellE = row.getCell(5);
    
    const labelStyle = { bold: true, size: 10, color: { argb: "FF475569" } };
    const valStyle = { size: 10, color: { argb: "FF000000" } };
    
    cellA.font = labelStyle;
    cellB.font = valStyle;
    cellD.font = labelStyle;
    cellE.font = valStyle;
    
    cellA.alignment = { horizontal: isRtl ? "right" : "left" };
    cellB.alignment = { horizontal: isRtl ? "right" : "left" };
    cellD.alignment = { horizontal: isRtl ? "right" : "left" };
    cellE.alignment = { horizontal: isRtl ? "right" : "left" };
  });
  
  sheet.addRow([]);
  
  // KPIs
  const currencyName = getCurrencyDisplay(income.currency, lang);
  const totalAmount = Number(income.amount) || 0;
  const totalRemaining = Number(income.remainingBalance) || 0;
  const totalPaid = totalAmount - totalRemaining;
  
  const kpiRows = [
    { label: t.totalIncomes, value: totalAmount },
    { label: t.totalPaid, value: totalPaid },
    { label: t.totalRemaining, value: totalRemaining, isRemaining: true }
  ];
  
  kpiRows.forEach((kpi, idx) => {
    const rIdx = 6 + idx;
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
    
    cellA.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    if (kpi.isRemaining) {
      cellB.font.color = { argb: kpi.value > 0 ? "FFDC2626" : "FF16A34A" };
    }
  });
  
  sheet.addRow([]);
  
  // Items Table (if any)
  const items = income.items || [];
  if (items.length > 0) {
    const sectionRow = sheet.addRow([t.items]);
    sectionRow.getCell(1).font = { bold: true, size: 12, color: { argb: "FF1E3A8A" } };
    sheet.addRow([]);
    
    const itemHeaders = [t.id, t.description, t.quantity, t.unitPrice, t.total];
    const headerRow = sheet.addRow(itemHeaders);
    headerRow.height = 25;
    headerRow.eachCell((c) => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      c.fill = headerFill;
      c.alignment = { vertical: "middle", horizontal: "center" };
      c.border = borderStyle;
    });
    
    items.forEach((item, idx) => {
      const row = sheet.addRow([
        idx + 1,
        item.description,
        Number(item.quantity) || 1,
        Number(item.prixUnitaire || item.unitPrice) || 0,
        Number(item.total) || 0
      ]);
      row.height = 22;
      
      const cId = row.getCell(1);
      const cDesc = row.getCell(2);
      const cQty = row.getCell(3);
      const cPrice = row.getCell(4);
      const cTotal = row.getCell(5);
      
      cId.alignment = { horizontal: "center", vertical: "middle" };
      cQty.alignment = { horizontal: "center", vertical: "middle" };
      cDesc.alignment = { horizontal: isRtl ? "right" : "left", vertical: "middle" };
      
      cPrice.numFmt = `#,##0.00" ${currencyName}"`;
      cTotal.numFmt = `#,##0.00" ${currencyName}"`;
      cPrice.alignment = { horizontal: "right", vertical: "middle" };
      cTotal.alignment = { horizontal: "right", vertical: "middle" };
      
      row.eachCell((c) => {
        c.border = borderStyle;
        c.font = { size: 10 };
      });
    });
    
    sheet.addRow([]);
  }
  
  // Advance payments table
  const payments = income.advancePayments || [];
  if (payments.length > 0) {
    const sectionRow = sheet.addRow([t.paymentsHistory]);
    sectionRow.getCell(1).font = { bold: true, size: 12, color: { argb: "FF1E3A8A" } };
    sheet.addRow([]);
    
    const payHeaders = [t.id, t.date, t.description, t.paymentMethod, t.payment];
    const headerRow = sheet.addRow(payHeaders);
    headerRow.height = 25;
    headerRow.eachCell((c) => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      c.fill = headerFill;
      c.alignment = { vertical: "middle", horizontal: "center" };
      c.border = borderStyle;
    });
    
    payments.forEach((p, idx) => {
      const payVal = Number(p.amount) || Number(p.amountMAD) || 0;
      const row = sheet.addRow([
        idx + 1,
        formatDate(p.date),
        p.labelPaper || p.forWhat || "-",
        p.method || "cash",
        payVal
      ]);
      row.height = 22;
      
      const cId = row.getCell(1);
      const cDate = row.getCell(2);
      const cDesc = row.getCell(3);
      const cMethod = row.getCell(4);
      const cAmt = row.getCell(5);
      
      cId.alignment = { horizontal: "center", vertical: "middle" };
      cDate.alignment = { horizontal: "center", vertical: "middle" };
      cMethod.alignment = { horizontal: "center", vertical: "middle" };
      cDesc.alignment = { horizontal: isRtl ? "right" : "left", vertical: "middle" };
      
      cAmt.numFmt = `#,##0.00" ${currencyName}"`;
      cAmt.alignment = { horizontal: "right", vertical: "middle" };
      
      row.eachCell((c) => {
        c.border = borderStyle;
        c.font = { size: 10 };
      });
    });
  }
  
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

exports.generateIncomesListExcel = async (incomes, type = "regular", lang = "ar") => {
  const workbook = new excel.Workbook();
  const t = translations[lang] || translations.ar;
  const isRtl = lang === "ar";
  
  const isDn = type === "delivery_note";
  const sheetName = isDn ? t.deliveryNoteList : t.incomeList;
  const sheet = workbook.addWorksheet(sheetName);
  sheet.views = [{ showGridLines: true, rightToLeft: isRtl }];
  
  sheet.addRow([]);
  
  const titleRow = sheet.addRow([sheetName]);
  titleRow.height = 30;
  const titleCell = sheet.getCell("A2");
  titleCell.font = { bold: true, size: 14, color: { argb: "FF1E3A8A" } };
  titleCell.alignment = { vertical: "middle", horizontal: isRtl ? "right" : "left" };
  
  let totalSum = 0;
  let totalPaid = 0;
  let totalRemaining = 0;
  
  incomes.forEach(inc => {
    const amt = Number(inc.amount) || 0;
    const rem = Number(inc.remainingBalance) || 0;
    totalSum += amt;
    totalRemaining += rem;
    totalPaid += (amt - rem);
  });
  
  const kpis = [
    { label: t.totalIncomes, value: totalSum },
    { label: t.totalPaid, value: totalPaid }
  ];
  if (isDn) {
    kpis.push({ label: t.totalRemaining, value: totalRemaining });
  }
  
  const headerCols = isDn ? 8 : 6;
  const lastColLetter = String.fromCharCode(64 + headerCols);
  sheet.mergeCells(`A2:${lastColLetter}2`);
  
  kpis.forEach((kpi, idx) => {
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
      fgColor: { argb: "FFF1F5F9" },
    };
  });
  
  sheet.addRow([]);
  
  let headers = [];
  if (isDn) {
    headers = [
      t.deliveryNoteNo,
      t.clientName,
      t.date,
      t.description,
      t.total,
      t.payment,
      t.remaining,
      t.status
    ];
  } else {
    headers = [
      t.date,
      t.category,
      t.clientName,
      t.description,
      t.total,
      t.status
    ];
  }
  
  const headerRowIdx = isDn ? 8 : 7;
  const headerRow = sheet.getRow(headerRowIdx);
  headerRow.values = headers;
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = headerFill;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = borderStyle;
  });
  
  if (incomes.length === 0) {
    const noRow = sheet.addRow([t.noTransactions]);
    noRow.height = 25;
    sheet.mergeCells(`A${headerRowIdx + 1}:${lastColLetter}${headerRowIdx + 1}`);
    const noCell = sheet.getCell(`A${headerRowIdx + 1}`);
    noCell.font = { italic: true, color: { argb: "FF64748B" } };
    noCell.alignment = { vertical: "middle", horizontal: "center" };
    noCell.border = borderStyle;
  } else {
    incomes.forEach((inc) => {
      const currency = inc.currency || "MAD";
      const amt = Number(inc.amount) || 0;
      const rem = Number(inc.remainingBalance) || 0;
      const paid = amt - rem;
      
      let dataRowArr = [];
      if (isDn) {
        dataRowArr = [
          inc.deliveryNoteNumber,
          inc.client || "-",
          formatDate(inc.date),
          inc.description,
          amt,
          paid,
          rem,
          inc.isFullyPaid ? t.paid : t.pending
        ];
      } else {
        dataRowArr = [
          formatDate(inc.date),
          inc.category || "-",
          inc.client || "-",
          inc.description,
          amt,
          inc.isFullyPaid ? t.paid : t.pending
        ];
      }
      
      const dataRow = sheet.addRow(dataRowArr);
      dataRow.height = 22;
      
      dataRow.eachCell((c, colNumber) => {
        c.border = borderStyle;
        c.font = { size: 10 };
        
        // Alignments
        if (isDn) {
          // Columns: 1=DN, 2=Client, 3=Date, 4=Desc, 5=Total, 6=Paid, 7=Rem, 8=Status
          if (colNumber === 1 || colNumber === 3 || colNumber === 8) {
            c.alignment = { horizontal: "center", vertical: "middle" };
          } else if (colNumber === 2 || colNumber === 4) {
            c.alignment = { horizontal: isRtl ? "right" : "left", vertical: "middle" };
          } else {
            c.alignment = { horizontal: "right", vertical: "middle" };
            c.numFmt = `#,##0.00" ${currency}"`;
          }
        } else {
          // Columns: 1=Date, 2=Category, 3=Client, 4=Desc, 5=Total, 6=Status
          if (colNumber === 1 || colNumber === 2 || colNumber === 6) {
            c.alignment = { horizontal: "center", vertical: "middle" };
          } else if (colNumber === 3 || colNumber === 4) {
            c.alignment = { horizontal: isRtl ? "right" : "left", vertical: "middle" };
          } else {
            c.alignment = { horizontal: "right", vertical: "middle" };
            c.numFmt = `#,##0.00" ${currency}"`;
          }
        }
      });
    });
  }
  
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
