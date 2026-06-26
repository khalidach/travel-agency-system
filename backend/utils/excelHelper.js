const applyExcelPageSetup = (workbook) => {
  if (!workbook || typeof workbook.eachSheet !== 'function') return;
  workbook.eachSheet((worksheet) => {
    // Only apply setup to visible worksheets to avoid breaking hidden validation/dropdown sheets
    if (worksheet.state === 'visible' || !worksheet.state) {
      worksheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0
      };
    }
  });
};

module.exports = {
  applyExcelPageSetup
};
