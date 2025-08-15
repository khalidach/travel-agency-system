// backend/services/excelRoomService.js
const excel = require("exceljs");

/**
 * Generates an Excel workbook for rooming lists, with each hotel on a separate sheet.
 * @param {object} program - The program data.
 * @param {Array<object>} roomData - An array of room management objects for all hotels in the program.
 * @returns {Promise<object>} A promise that resolves to an exceljs Workbook object.
 */
exports.generateRoomingListExcel = async (program, roomData) => {
  const workbook = new excel.Workbook();

  const hotelDataMap = new Map();
  roomData.forEach((data) => {
    if (data.rooms && data.rooms.length > 0) {
      hotelDataMap.set(data.hotelName, data.rooms);
    }
  });

  for (const [hotelName, rooms] of hotelDataMap.entries()) {
    const sheetName = hotelName.replace(/[\/\\?*[\]]/g, "").substring(0, 31);
    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ rightToLeft: true }],
    });

    const roomsByType = rooms.reduce((acc, room) => {
      const type = room.type || "Uncategorized";
      acc[type] = acc[type] || [];
      acc[type].push(room);
      return acc;
    }, {});

    const roomTypes = Object.keys(roomsByType);
    let currentCol = 1;

    // Program Name Header
    if (roomTypes.length > 0) {
      const totalColumns = roomTypes.length * 2 + (roomTypes.length - 1);
      worksheet.mergeCells(1, 1, 1, totalColumns);
      const programHeaderCell = worksheet.getCell(1, 1);
      programHeaderCell.value = program.name;
      programHeaderCell.font = {
        bold: true,
        size: 25,
        color: { argb: "FF000000" },
      };
      programHeaderCell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      programHeaderCell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    }

    // Main header for the hotel on row 2
    if (roomTypes.length > 0) {
      const totalColumns = roomTypes.length * 2 + (roomTypes.length - 1);
      worksheet.mergeCells(2, 1, 2, totalColumns);
      const hotelHeaderCell = worksheet.getCell(2, 1);
      hotelHeaderCell.value = hotelName;
      hotelHeaderCell.font = {
        bold: true,
        size: 22,
        color: { argb: "FFFFFFFF" },
      };
      hotelHeaderCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF007BFF" },
      }; // Blue
      hotelHeaderCell.alignment = { vertical: "middle", horizontal: "center" };
      hotelHeaderCell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    }

    const separatorColumns = new Set();

    for (const type of roomTypes) {
      const roomsForType = roomsByType[type];

      // Type Header on row 3
      const typeHeaderCell = worksheet.getCell(3, currentCol);
      typeHeaderCell.value = type;
      typeHeaderCell.font = { bold: true, size: 20 };
      typeHeaderCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFFF00" },
      }; // Yellow
      typeHeaderCell.alignment = { vertical: "middle", horizontal: "center" };
      worksheet.mergeCells(3, currentCol, 3, currentCol + 1);
      worksheet.getCell(3, currentCol).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      worksheet.getCell(3, currentCol + 1).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      // Sub-headers on row 4
      const roomHeaderCell = worksheet.getCell(4, currentCol);
      roomHeaderCell.value = "الغرفة";
      const occupantHeaderCell = worksheet.getCell(4, currentCol + 1);
      occupantHeaderCell.value = "الساكن";

      [roomHeaderCell, occupantHeaderCell].forEach((cell) => {
        cell.font = { bold: true, size: 18 };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD3D3D3" },
        }; // Light Gray
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      let currentRow = 5; // Data starts from row 5
      for (const room of roomsForType) {
        const startRow = currentRow;
        const capacity = room.capacity || 0;
        const occupants = room.occupants || [];
        const numRowsForRoom = Math.max(1, capacity);

        const roomNameCell = worksheet.getCell(startRow, currentCol);
        roomNameCell.value = room.name;
        if (numRowsForRoom > 1) {
          worksheet.mergeCells(
            startRow,
            currentCol,
            startRow + numRowsForRoom - 1,
            currentCol
          );
        }
        roomNameCell.alignment = { vertical: "middle", horizontal: "center" };
        roomNameCell.font = { size: 18 };

        for (let i = 0; i < numRowsForRoom; i++) {
          const currentRoomNameCell = worksheet.getCell(
            startRow + i,
            currentCol
          );
          currentRoomNameCell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          currentRoomNameCell.font = { size: 18 };

          const occupantCell = worksheet.getCell(startRow + i, currentCol + 1);
          const occupant = occupants[i];
          if (occupant && occupant.clientName) {
            occupantCell.value = occupant.clientName;
          } else {
            occupantCell.value = null;
          }
          occupantCell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          occupantCell.font = { size: 18 };
        }

        currentRow += numRowsForRoom;
        if (roomsForType.indexOf(room) < roomsForType.length - 1) {
          worksheet.addRow([]);
          currentRow++;
        }
      }

      if (roomTypes.indexOf(type) < roomTypes.length - 1) {
        const separatorColIndex = currentCol + 2;
        worksheet.getColumn(separatorColIndex).width = 5;
        separatorColumns.add(separatorColIndex);
      }

      currentCol += 3;
    }

    worksheet.columns.forEach((column, index) => {
      if (separatorColumns.has(index + 1)) {
        return;
      }
      let maxColumnLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellLength = cell.value ? cell.value.toString().length : 0;
        if (cellLength > maxColumnLength) {
          maxColumnLength = cellLength;
        }
      });
      column.width = maxColumnLength * 1.1 + 7;
    });
  }

  return workbook;
};
