// backend/services/FactureExcelService.js
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
    invoiceDetails: "تفاصيل الفاتورة",
    invoiceList: "قائمة الفواتير",
    devisDetails: "تفاصيل التقدير",
    devisList: "قائمة التقديرات",
    invoiceNo: "رقم الفاتورة",
    devisNo: "رقم التقدير",
    clientName: "اسم العميل",
    clientAddress: "العنوان",
    clientICE: "المعرف الموحد للمقاولة (ICE)",
    date: "التاريخ",
    type: "النوع",
    description: "البيان / الوصف",
    quantity: "الكمية",
    unitPrice: "سعر الوحدة",
    serviceFee: "رسوم الخدمة",
    total: "الإجمالي",
    prixTotalHorsFrais: "إجمالي غير شامل الرسوم",
    totalFraisServiceHT: "إجمالي رسوم الخدمة (HT)",
    tva: "الضريبة على القيمة المضافة (TVA)",
    totalTTC: "الإجمالي شامل الضريبة (TTC)",
    notes: "ملاحظات",
    totalDocuments: "إجمالي المستندات",
    totalAmount: "إجمالي المبالغ",
    noTransactions: "لا توجد مستندات مسجلة",
    mad: "درهم مغربي",
    facture: "فاتورة",
    devis: "تقدير",
  },
  en: {
    id: "ID",
    invoiceDetails: "Invoice Details",
    invoiceList: "Invoices List",
    devisDetails: "Estimate Details",
    devisList: "Estimates List",
    invoiceNo: "Invoice No.",
    devisNo: "Estimate No.",
    clientName: "Client Name",
    clientAddress: "Address",
    clientICE: "Client ICE",
    date: "Date",
    type: "Type",
    description: "Description",
    quantity: "Quantity",
    unitPrice: "Unit Price",
    serviceFee: "Service Fee",
    total: "Total",
    prixTotalHorsFrais: "Total Excl. Fees",
    totalFraisServiceHT: "Total Service Fees (HT)",
    tva: "VAT / TVA",
    totalTTC: "Total Incl. Tax (TTC)",
    notes: "Notes",
    totalDocuments: "Total Documents",
    totalAmount: "Total Amount",
    noTransactions: "No documents recorded",
    mad: "MAD",
    facture: "Invoice",
    devis: "Estimate",
  },
  fr: {
    id: "N°",
    invoiceDetails: "Détails de la Facture",
    invoiceList: "Liste des Factures",
    devisDetails: "Détails du Devis",
    devisList: "Liste des Devis",
    invoiceNo: "N° Facture",
    devisNo: "N° Devis",
    clientName: "Nom du Client",
    clientAddress: "Adresse",
    clientICE: "ICE Client",
    date: "Date",
    type: "Type",
    description: "Description",
    quantity: "Quantité",
    unitPrice: "Prix Unitaire",
    serviceFee: "Frais de Service",
    total: "Total",
    prixTotalHorsFrais: "Total Hors Frais",
    totalFraisServiceHT: "Total Frais Service (HT)",
    tva: "TVA",
    totalTTC: "Total TTC",
    notes: "Notes",
    totalDocuments: "Total Documents",
    totalAmount: "Total Montant",
    noTransactions: "Aucun document enregistré",
    mad: "MAD",
    facture: "Facture",
    devis: "Devis",
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

exports.generateFactureExcel = async (facture, lang = "ar") => {
  const workbook = new excel.Workbook();
  const t = translations[lang] || translations.ar;
  const isRtl = lang === "ar";
  
  const isDevis = facture.type === "devis";
  const titleText = isDevis ? t.devisDetails : t.invoiceDetails;
  const numberLabel = isDevis ? t.devisNo : t.invoiceNo;
  
  const sheet = workbook.addWorksheet(isDevis ? "Devis" : "Facture");
  sheet.views = [{ showGridLines: true, rightToLeft: isRtl }];
  
  sheet.addRow([]); // Blank row 1
  
  // Title Block
  const titleRow = sheet.addRow([`${titleText}: ${facture.facture_number}`]);
  titleRow.height = 30;
  const titleCell = sheet.getCell("A2");
  titleCell.font = { bold: true, size: 14, color: { argb: "FF1E3A8A" } };
  titleCell.alignment = { vertical: "middle", horizontal: isRtl ? "right" : "left" };
  sheet.mergeCells("A2:F2");
  
  // Client & Document Info
  // Row 3
  const row3 = sheet.addRow([
    t.clientName, facture.clientName || "-", "",
    numberLabel, facture.facture_number
  ]);
  row3.height = 20;
  sheet.mergeCells("B3:C3");
  sheet.mergeCells("E3:F3");
  
  // Row 4
  const row4 = sheet.addRow([
    t.clientAddress, facture.clientAddress || "-", "",
    t.date, formatDate(facture.date)
  ]);
  row4.height = 20;
  sheet.mergeCells("B4:C4");
  sheet.mergeCells("E4:F4");
  
  // Row 5
  const row5 = sheet.addRow([
    t.clientICE, facture.clientICE || "-", "",
    t.type, t[facture.type] || facture.type
  ]);
  row5.height = 20;
  sheet.mergeCells("B5:C5");
  sheet.mergeCells("E5:F5");

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
  
  // Main Data Headers
  const headers = [
    t.id,
    t.description,
    t.quantity,
    t.unitPrice,
    t.serviceFee,
    t.total
  ];
  
  const headerRow = sheet.getRow(8);
  headerRow.values = headers;
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = headerFill;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = borderStyle;
  });
  
  const items = facture.items || [];
  
  if (items.length === 0) {
    const noRow = sheet.addRow([t.noTransactions]);
    noRow.height = 25;
    sheet.mergeCells("A9:F9");
    const noCell = sheet.getCell("A9");
    noCell.font = { italic: true, color: { argb: "FF64748B" } };
    noCell.alignment = { vertical: "middle", horizontal: "center" };
    noCell.border = borderStyle;
  } else {
    items.forEach((item, idx) => {
      const dataRow = sheet.addRow([
        idx + 1,
        item.description,
        Number(item.quantity) || 0,
        Number(item.prixUnitaire) || 0,
        Number(item.fraisServiceUnitaire) || 0,
        Number(item.total) || 0
      ]);
      dataRow.height = 22;
      
      const cId = dataRow.getCell(1);
      const cDesc = dataRow.getCell(2);
      const cQty = dataRow.getCell(3);
      const cPrice = dataRow.getCell(4);
      const cFee = dataRow.getCell(5);
      const cTotal = dataRow.getCell(6);
      
      cId.alignment = { horizontal: "center", vertical: "middle" };
      cQty.alignment = { horizontal: "center", vertical: "middle" };
      cDesc.alignment = { horizontal: isRtl ? "right" : "left", vertical: "middle" };
      
      cPrice.numFmt = `#,##0.00" ${t.mad}"`;
      cFee.numFmt = `#,##0.00" ${t.mad}"`;
      cTotal.numFmt = `#,##0.00" ${t.mad}"`;
      
      [cPrice, cFee, cTotal].forEach((c) => {
        c.alignment = { horizontal: "right", vertical: "middle" };
      });
      
      dataRow.eachCell((c) => {
        c.border = borderStyle;
        c.font = { size: 10 };
      });
    });
  }
  
  sheet.addRow([]); // Blank row
  
  // Total summary blocks
  const summaryData = [
    { label: t.prixTotalHorsFrais, value: Number(facture.prixTotalHorsFrais) || 0 },
    { label: t.totalFraisServiceHT, value: Number(facture.totalFraisServiceHT) || 0 },
    { label: t.tva, value: Number(facture.tva) || 0 },
    { label: t.totalTTC, value: Number(facture.total) || 0, isGrandTotal: true }
  ];
  
  summaryData.forEach((s) => {
    const summaryRow = sheet.addRow(["", "", "", "", s.label, s.value]);
    summaryRow.height = 22;
    const cellLabel = summaryRow.getCell(5);
    const cellValue = summaryRow.getCell(6);
    
    cellLabel.font = { size: 10, bold: true };
    cellValue.font = { size: 10, bold: true };
    cellValue.numFmt = `#,##0.00" ${t.mad}"`;
    cellValue.alignment = { horizontal: "right", vertical: "middle" };
    cellLabel.alignment = { horizontal: isRtl ? "right" : "left", vertical: "middle" };
    
    cellLabel.border = borderStyle;
    cellValue.border = borderStyle;
    
    if (s.isGrandTotal) {
      cellLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      cellValue.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    }
  });
  
  if (facture.notes) {
    sheet.addRow([]);
    sheet.addRow([]);
    const notesTitleRow = sheet.addRow([t.notes]);
    notesTitleRow.getCell(1).font = { bold: true, size: 11 };
    
    const notesContentRow = sheet.addRow([facture.notes]);
    notesContentRow.height = 40;
    sheet.mergeCells(`A${notesContentRow.number}:F${notesContentRow.number}`);
    const notesCell = sheet.getCell(`A${notesContentRow.number}`);
    notesCell.alignment = { vertical: "top", horizontal: isRtl ? "right" : "left", wrapText: true };
    notesCell.border = borderStyle;
  }
  
  // Adjust columns
  sheet.columns.forEach((column) => {
    let maxLen = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const cellWidth = estimateCellWidth(cell);
      if (cellWidth > maxLen) {
        maxLen = cellWidth;
      }
    });
    column.width = Math.min(maxLen, 45);
  });
  
  return workbook;
};

exports.generateFacturesListExcel = async (factures, type = "facture", lang = "ar") => {
  const workbook = new excel.Workbook();
  const t = translations[lang] || translations.ar;
  const isRtl = lang === "ar";
  
  const isDevis = type === "devis";
  const sheetName = isDevis ? t.devisList : t.invoiceList;
  const sheet = workbook.addWorksheet(sheetName);
  sheet.views = [{ showGridLines: true, rightToLeft: isRtl }];
  
  sheet.addRow([]);
  
  const titleRow = sheet.addRow([sheetName]);
  titleRow.height = 30;
  const titleCell = sheet.getCell("A2");
  titleCell.font = { bold: true, size: 14, color: { argb: "FF1E3A8A" } };
  titleCell.alignment = { vertical: "middle", horizontal: isRtl ? "right" : "left" };
  sheet.mergeCells("A2:G2");
  
  // KPIs
  let totalSum = 0;
  factures.forEach(f => {
    totalSum += Number(f.total) || 0;
  });
  
  const kpis = [
    { label: t.totalDocuments, value: factures.length },
    { label: t.totalAmount, value: totalSum }
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
    if (idx === 1) {
      cellB.numFmt = `#,##0.00" ${t.mad}"`;
    }
    cellB.alignment = { horizontal: isRtl ? "left" : "right" };
    cellA.alignment = { horizontal: isRtl ? "right" : "left" };
    
    cellA.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
  });
  
  sheet.addRow([]); // Blank row
  
  const headers = [
    isDevis ? t.devisNo : t.invoiceNo,
    t.clientName,
    t.clientICE,
    t.date,
    t.type,
    t.total,
    t.notes
  ];
  
  const headerRowIdx = 7;
  const headerRow = sheet.getRow(headerRowIdx);
  headerRow.values = headers;
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = headerFill;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = borderStyle;
  });
  
  if (factures.length === 0) {
    const noRow = sheet.addRow([t.noTransactions]);
    noRow.height = 25;
    sheet.mergeCells("A8:G8");
    const noCell = sheet.getCell("A8");
    noCell.font = { italic: true, color: { argb: "FF64748B" } };
    noCell.alignment = { vertical: "middle", horizontal: "center" };
    noCell.border = borderStyle;
  } else {
    factures.forEach((facture) => {
      const dataRow = sheet.addRow([
        facture.facture_number,
        facture.clientName || "-",
        facture.clientICE || "-",
        formatDate(facture.date),
        t[facture.type] || facture.type,
        Number(facture.total) || 0,
        facture.notes || "-"
      ]);
      dataRow.height = 22;
      
      const cNo = dataRow.getCell(1);
      const cClient = dataRow.getCell(2);
      const cIce = dataRow.getCell(3);
      const cDate = dataRow.getCell(4);
      const cType = dataRow.getCell(5);
      const cTotal = dataRow.getCell(6);
      const cNotes = dataRow.getCell(7);
      
      cNo.alignment = { horizontal: "center", vertical: "middle" };
      cDate.alignment = { horizontal: "center", vertical: "middle" };
      cType.alignment = { horizontal: "center", vertical: "middle" };
      
      cClient.alignment = { horizontal: isRtl ? "right" : "left", vertical: "middle" };
      cNotes.alignment = { horizontal: isRtl ? "right" : "left", vertical: "middle" };
      cIce.alignment = { horizontal: "center", vertical: "middle" };
      
      cTotal.numFmt = `#,##0.00" ${t.mad}"`;
      cTotal.alignment = { horizontal: "right", vertical: "middle" };
      
      dataRow.eachCell((c) => {
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
