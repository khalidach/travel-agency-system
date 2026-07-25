// backend/services/ClientExcelService.js
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
    clientAnalysis: "تحليل حساب العميل",
    clientName: "اسم العميل",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    address: "العنوان",
    ice: "المعرف الموحد للمقاولة (ICE)",
    date: "التاريخ",
    type: "النوع",
    description: "البيان / الوصف",
    amount: "المبلغ الإجمالي",
    paid: "المدفوع",
    remaining: "المتبقي",
    status: "الحالة",
    totalSales: "إجمالي المبيعات",
    totalPaid: "إجمالي المدفوعات",
    totalRemaining: "إجمالي المتبقي",
    noTransactions: "لا توجد معاملات مسجلة لهذا العميل",
    mad: "درهم مغربي",
    paidLabel: "مؤدى",
    pending: "في الانتظار",
    regular: "مقبوضات عادية",
    delivery_note: "سند تسليم",
    salesHistory: "سجل العمليات والمقبوضات",
  },
  en: {
    id: "ID",
    clientAnalysis: "Client Analysis Ledger",
    clientName: "Client Name",
    email: "Email",
    phone: "Phone",
    address: "Address",
    ice: "Client ICE",
    date: "Date",
    type: "Type",
    description: "Description",
    amount: "Total Amount",
    paid: "Paid",
    remaining: "Remaining Balance",
    status: "Status",
    totalSales: "Total Sales",
    totalPaid: "Total Paid",
    totalRemaining: "Total Remaining",
    noTransactions: "No transactions recorded for this client",
    mad: "MAD",
    paidLabel: "Paid",
    pending: "Pending",
    regular: "Regular Income",
    delivery_note: "Delivery Note",
    salesHistory: "Operations & Sales History",
  },
  fr: {
    id: "N°",
    clientAnalysis: "Relevé - Analyse du Client",
    clientName: "Nom du Client",
    email: "Email",
    phone: "Téléphone",
    address: "Adresse",
    ice: "ICE Client",
    date: "Date",
    type: "Type",
    description: "Description",
    amount: "Montant Total",
    paid: "Payé",
    remaining: "Solde Restant",
    status: "Statut",
    totalSales: "Total Ventes",
    totalPaid: "Total Payé",
    totalRemaining: "Total Restant",
    noTransactions: "Aucune transaction enregistrée pour ce client",
    mad: "MAD",
    paidLabel: "Payé",
    pending: "En attente",
    regular: "Recette Régulière",
    delivery_note: "Bon de Livraison",
    salesHistory: "Historique des Opérations & Ventes",
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

exports.generateClientAnalysisExcel = async (client, incomes, lang = "ar") => {
  const workbook = new excel.Workbook();
  const t = translations[lang] || translations.ar;
  const isRtl = lang === "ar";
  
  const sheet = workbook.addWorksheet(t.clientAnalysis.replace(/[\*\\\?:/\[\]]/g, "-"));
  sheet.views = [{ showGridLines: true, rightToLeft: isRtl }];
  
  sheet.addRow([]);
  
  // Title
  const titleText = `${t.clientAnalysis}: ${client.name}`;
  const titleRow = sheet.addRow([titleText]);
  titleRow.height = 30;
  const titleCell = sheet.getCell("A2");
  titleCell.font = { bold: true, size: 14, color: { argb: "FF1E3A8A" } };
  titleCell.alignment = { vertical: "middle", horizontal: isRtl ? "right" : "left" };
  sheet.mergeCells("A2:G2");
  
  // Metadata
  const metadata = [
    [t.clientName, client.name || "-", "", t.email, client.email || "-"],
    [t.phone, client.phone || "-", "", t.address, client.address || "-"],
    [t.ice, client.ice || "-", "", "", ""]
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
  let totalSales = 0;
  let totalRemaining = 0;
  incomes.forEach(inc => {
    totalSales += Number(inc.amount) || 0;
    totalRemaining += Number(inc.remainingBalance) || 0;
  });
  const totalPaid = totalSales - totalRemaining;
  
  const kpis = [
    { label: t.totalSales, value: totalSales },
    { label: t.totalPaid, value: totalPaid },
    { label: t.totalRemaining, value: totalRemaining, isRemaining: true }
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
  
  // Table
  const sectionRow = sheet.addRow([t.salesHistory]);
  sectionRow.getCell(1).font = { bold: true, size: 12, color: { argb: "FF1E3A8A" } };
  sheet.addRow([]);
  
  const headers = [
    t.id,
    t.date,
    t.type,
    t.description,
    t.amount,
    t.paid,
    t.remaining,
    t.status
  ];
  
  const headerRow = sheet.addRow(headers);
  headerRow.height = 25;
  headerRow.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    c.fill = headerFill;
    c.alignment = { vertical: "middle", horizontal: "center" };
    c.border = borderStyle;
  });
  
  if (incomes.length === 0) {
    const noRow = sheet.addRow([t.noTransactions]);
    noRow.height = 25;
    sheet.mergeCells(`A${noRow.number}:H${noRow.number}`);
    const noCell = sheet.getCell(`A${noRow.number}`);
    noCell.font = { italic: true, color: { argb: "FF64748B" } };
    noCell.alignment = { vertical: "middle", horizontal: "center" };
    noCell.border = borderStyle;
  } else {
    incomes.forEach((inc, idx) => {
      const amt = Number(inc.amount) || 0;
      const rem = Number(inc.remainingBalance) || 0;
      const paidVal = amt - rem;
      const currency = inc.currency || "MAD";
      
      const row = sheet.addRow([
        idx + 1,
        formatDate(inc.date),
        t[inc.type] || inc.type,
        inc.description,
        amt,
        paidVal,
        rem,
        inc.isFullyPaid ? t.paidLabel : t.pending
      ]);
      row.height = 22;
      
      row.eachCell((c, colNumber) => {
        c.border = borderStyle;
        c.font = { size: 10 };
        
        if (colNumber === 1 || colNumber === 2 || colNumber === 3 || colNumber === 8) {
          c.alignment = { horizontal: "center", vertical: "middle" };
        } else if (colNumber === 4) {
          c.alignment = { horizontal: isRtl ? "right" : "left", vertical: "middle" };
        } else {
          c.alignment = { horizontal: "right", vertical: "middle" };
          c.numFmt = `#,##0.00" ${currency}"`;
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
