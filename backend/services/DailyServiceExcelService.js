// backend/services/DailyServiceExcelService.js
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
    serviceDetails: "تفاصيل الخدمة اليومية",
    serviceList: "قائمة الخدمات اليومية",
    clientName: "اسم العميل",
    bookingRef: "مرجع الحجز (PNR)",
    date: "التاريخ",
    type: "نوع الخدمة",
    description: "البيان / الوصف",
    quantity: "الكمية",
    purchasePrice: "سعر الشراء",
    sellPrice: "سعر البيع",
    totalPurchase: "إجمالي الشراء",
    totalSelling: "إجمالي البيع",
    profit: "الأرباح",
    payment: "المدفوعات",
    remaining: "المتبقي",
    paymentMethod: "طريقة الدفع",
    totalSales: "إجمالي المبيعات",
    totalCosts: "إجمالي التكاليف",
    totalProfit: "إجمالي الأرباح",
    totalPaid: "إجمالي المقبوضات",
    totalRemaining: "إجمالي المتبقي",
    noTransactions: "لا توجد خدمات مسجلة",
    mad: "درهم مغربي",
    status: "الحالة",
    paid: "مؤدى",
    pending: "في الانتظار",
    items: "العناصر المكونة للخدمة",
    paymentsHistory: "سجل المدفوعات التقديمية",
  },
  en: {
    id: "ID",
    serviceDetails: "Daily Service Details",
    serviceList: "Daily Services List",
    clientName: "Client Name",
    bookingRef: "Booking Reference",
    date: "Date",
    type: "Service Type",
    description: "Description",
    quantity: "Quantity",
    purchasePrice: "Purchase Price",
    sellPrice: "Selling Price",
    totalPurchase: "Total Purchase",
    totalSelling: "Total Selling",
    profit: "Profit",
    payment: "Paid",
    remaining: "Remaining Balance",
    paymentMethod: "Payment Method",
    totalSales: "Total Sales",
    totalCosts: "Total Costs",
    totalProfit: "Total Profit",
    totalPaid: "Total Paid",
    totalRemaining: "Total Remaining",
    noTransactions: "No daily services recorded",
    mad: "MAD",
    status: "Status",
    paid: "Paid",
    pending: "Pending",
    items: "Service Items",
    paymentsHistory: "Advance Payments History",
  },
  fr: {
    id: "N°",
    serviceDetails: "Détails de la Prestation Journalière",
    serviceList: "Liste des Prestations Journalières",
    clientName: "Nom du Client",
    bookingRef: "Référence de Réservation",
    date: "Date",
    type: "Type de Service",
    description: "Description",
    quantity: "Quantité",
    purchasePrice: "Prix d'Achat",
    sellPrice: "Prix de Vente",
    totalPurchase: "Total Achat",
    totalSelling: "Total Vente",
    profit: "Marge / Bénéfice",
    payment: "Payé",
    remaining: "Solde Restant",
    paymentMethod: "Mode de Paiement",
    totalSales: "Total Ventes",
    totalCosts: "Total Coûts",
    totalProfit: "Total Marge",
    totalPaid: "Total Payé",
    totalRemaining: "Total Restant",
    noTransactions: "Aucune prestation enregistrée",
    mad: "MAD",
    status: "Statut",
    paid: "Payé",
    pending: "En attente",
    items: "Articles de Prestation",
    paymentsHistory: "Historique des Règlements",
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

exports.generateDailyServiceExcel = async (service, lang = "ar") => {
  const workbook = new excel.Workbook();
  const t = translations[lang] || translations.ar;
  const isRtl = lang === "ar";
  
  const sheet = workbook.addWorksheet("Prestation");
  sheet.views = [{ showGridLines: true, rightToLeft: isRtl }];
  
  sheet.addRow([]);
  
  // Title
  const titleText = `${t.serviceDetails}: ${service.bookingRef || service.id}`;
  const titleRow = sheet.addRow([titleText]);
  titleRow.height = 30;
  const titleCell = sheet.getCell("A2");
  titleCell.font = { bold: true, size: 14, color: { argb: "FF1E3A8A" } };
  titleCell.alignment = { vertical: "middle", horizontal: isRtl ? "right" : "left" };
  sheet.mergeCells("A2:G2");
  
  // Metadata
  const metadata = [
    [t.clientName, service.clientName || "-", "", t.bookingRef, service.bookingRef || "-"],
    [t.date, formatDate(service.date), "", t.type, service.type || "-"],
    [t.status, service.isFullyPaid ? t.paid : t.pending, "", "", ""]
  ];
  
  metadata.forEach((mArr) => {
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
  const totalSelling = service.totalPrice || 0;
  const totalCost = service.originalPrice || 0;
  const profit = service.profit || (totalSelling - totalCost);
  const totalPaid = service.totalPaid || 0;
  const remaining = service.remainingBalance || (totalSelling - totalPaid);
  
  const kpis = [
    { label: t.totalSales, value: totalSelling },
    { label: t.totalCosts, value: totalCost },
    { label: t.totalProfit, value: profit },
    { label: t.totalPaid, value: totalPaid },
    { label: t.totalRemaining, value: remaining, isRemaining: true }
  ];
  
  kpis.forEach((kpi) => {
    const row = sheet.addRow([kpi.label, kpi.value]);
    row.height = 22;
    const cellA = row.getCell(1);
    const cellB = row.getCell(2);
    
    cellA.border = borderStyle;
    cellB.border = borderStyle;
    cellA.font = { size: 11, bold: true };
    cellB.font = { size: 11, bold: true };
    cellB.numFmt = `#,##0.00" ${t.mad}"`;
    cellB.alignment = { horizontal: isRtl ? "left" : "right" };
    cellA.alignment = { horizontal: isRtl ? "right" : "left" };
    
    cellA.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    if (kpi.isRemaining) {
      cellB.font.color = { argb: kpi.value > 0 ? "FFDC2626" : "FF16A34A" };
    }
  });
  
  sheet.addRow([]);
  
  // Items Table
  const items = service.items || [];
  if (items.length > 0) {
    const sectionRow = sheet.addRow([t.items]);
    sectionRow.getCell(1).font = { bold: true, size: 12, color: { argb: "FF1E3A8A" } };
    sheet.addRow([]);
    
    const itemHeaders = [t.id, t.description, t.quantity, t.purchasePrice, t.sellPrice, t.totalPurchase, t.totalSelling, t.profit];
    const headerRow = sheet.addRow(itemHeaders);
    headerRow.height = 25;
    headerRow.eachCell((c) => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      c.fill = headerFill;
      c.alignment = { vertical: "middle", horizontal: "center" };
      c.border = borderStyle;
    });
    
    items.forEach((item, idx) => {
      const q = Number(item.quantity) || 1;
      const pp = Number(item.purchasePrice) || 0;
      const sp = Number(item.sellPrice) || 0;
      const totP = q * pp;
      const totS = q * sp;
      const prof = totS - totP;
      
      const row = sheet.addRow([
        idx + 1,
        item.description,
        q,
        pp,
        sp,
        totP,
        totS,
        prof
      ]);
      row.height = 22;
      
      const cId = row.getCell(1);
      const cDesc = row.getCell(2);
      const cQty = row.getCell(3);
      const cPP = row.getCell(4);
      const cSP = row.getCell(5);
      const cTotP = row.getCell(6);
      const cTotS = row.getCell(7);
      const cProf = row.getCell(8);
      
      cId.alignment = { horizontal: "center", vertical: "middle" };
      cQty.alignment = { horizontal: "center", vertical: "middle" };
      cDesc.alignment = { horizontal: isRtl ? "right" : "left", vertical: "middle" };
      
      [cPP, cSP, cTotP, cTotS, cProf].forEach((c) => {
        c.numFmt = `#,##0.00" ${t.mad}"`;
        c.alignment = { horizontal: "right", vertical: "middle" };
      });
      
      row.eachCell((c) => {
        c.border = borderStyle;
        c.font = { size: 10 };
      });
    });
    
    sheet.addRow([]);
  }
  
  // Advance payments
  const payments = service.advancePayments || [];
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
      const pAmt = Number(p.amount) || Number(p.amountMAD) || 0;
      const row = sheet.addRow([
        idx + 1,
        formatDate(p.date),
        p.labelPaper || p.forWhat || "-",
        p.method || "cash",
        pAmt
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
      
      cAmt.numFmt = `#,##0.00" ${t.mad}"`;
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

exports.generateDailyServicesListExcel = async (services, lang = "ar") => {
  const workbook = new excel.Workbook();
  const t = translations[lang] || translations.ar;
  const isRtl = lang === "ar";
  
  const sheet = workbook.addWorksheet(t.serviceList);
  sheet.views = [{ showGridLines: true, rightToLeft: isRtl }];
  
  sheet.addRow([]);
  
  const titleRow = sheet.addRow([t.serviceList]);
  titleRow.height = 30;
  const titleCell = sheet.getCell("A2");
  titleCell.font = { bold: true, size: 14, color: { argb: "FF1E3A8A" } };
  titleCell.alignment = { vertical: "middle", horizontal: isRtl ? "right" : "left" };
  sheet.mergeCells("A2:J2");
  
  // KPIs
  let totalSales = 0;
  let totalCosts = 0;
  let totalProfit = 0;
  let totalPaid = 0;
  let totalRemaining = 0;
  
  services.forEach(s => {
    totalSales += s.totalPrice || 0;
    totalCosts += s.originalPrice || 0;
    totalProfit += Number(s.profit) || 0;
    totalPaid += s.totalPaid || 0;
    totalRemaining += s.remainingBalance || 0;
  });
  
  const kpis = [
    { label: t.totalSales, value: totalSales },
    { label: t.totalCosts, value: totalCosts },
    { label: t.totalProfit, value: totalProfit },
    { label: t.totalPaid, value: totalPaid },
    { label: t.totalRemaining, value: totalRemaining }
  ];
  
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
    cellB.numFmt = `#,##0.00" ${t.mad}"`;
    cellB.alignment = { horizontal: isRtl ? "left" : "right" };
    cellA.alignment = { horizontal: isRtl ? "right" : "left" };
    
    cellA.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
  });
  
  sheet.addRow([]);
  
  const headers = [
    t.date,
    t.type,
    t.clientName,
    t.bookingRef,
    t.totalCosts,
    t.totalSales,
    t.totalProfit,
    t.totalPaid,
    t.totalRemaining,
    t.status
  ];
  
  const headerRowIdx = 10;
  const headerRow = sheet.getRow(headerRowIdx);
  headerRow.values = headers;
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = headerFill;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = borderStyle;
  });
  
  if (services.length === 0) {
    const noRow = sheet.addRow([t.noTransactions]);
    noRow.height = 25;
    sheet.mergeCells("A11:J11");
    const noCell = sheet.getCell("A11");
    noCell.font = { italic: true, color: { argb: "FF64748B" } };
    noCell.alignment = { vertical: "middle", horizontal: "center" };
    noCell.border = borderStyle;
  } else {
    services.forEach((s) => {
      const dataRow = sheet.addRow([
        formatDate(s.date),
        s.type || "-",
        s.clientName || "-",
        s.bookingRef || "-",
        s.originalPrice || 0,
        s.totalPrice || 0,
        Number(s.profit) || 0,
        s.totalPaid || 0,
        s.remainingBalance || 0,
        s.isFullyPaid ? t.paid : t.pending
      ]);
      dataRow.height = 22;
      
      dataRow.eachCell((c, colNumber) => {
        c.border = borderStyle;
        c.font = { size: 10 };
        
        if (colNumber === 1 || colNumber === 2 || colNumber === 4 || colNumber === 10) {
          c.alignment = { horizontal: "center", vertical: "middle" };
        } else if (colNumber === 3) {
          c.alignment = { horizontal: isRtl ? "right" : "left", vertical: "middle" };
        } else {
          c.alignment = { horizontal: "right", vertical: "middle" };
          c.numFmt = `#,##0.00" ${t.mad}"`;
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
