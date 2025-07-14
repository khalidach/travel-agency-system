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

    // Main header for the hotel
    if (roomTypes.length > 0) {
      // Adjust the merge range to account for separator columns
      const totalColumns = roomTypes.length * 2 + (roomTypes.length - 1);
      worksheet.mergeCells(1, 1, 1, totalColumns);
      const hotelHeaderCell = worksheet.getCell(1, 1);
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

    // Keep track of separator column numbers to skip them during auto-fit
    const separatorColumns = new Set();

    // Process each room type as a separate vertical block
    for (const type of roomTypes) {
      const roomsForType = roomsByType[type];

      // Type Header
      const typeHeaderCell = worksheet.getCell(2, currentCol);
      typeHeaderCell.value = type;
      typeHeaderCell.font = { bold: true, size: 20 }; // Changed from 14 to 18
      typeHeaderCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFFF00" },
      }; // Yellow
      typeHeaderCell.alignment = { vertical: "middle", horizontal: "center" };
      worksheet.mergeCells(2, currentCol, 2, currentCol + 1);
      worksheet.getCell(2, currentCol).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      worksheet.getCell(2, currentCol + 1).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      // Sub-headers
      const roomHeaderCell = worksheet.getCell(3, currentCol);
      roomHeaderCell.value = "الغرفة";
      const occupantHeaderCell = worksheet.getCell(3, currentCol + 1);
      occupantHeaderCell.value = "الساكن";

      [roomHeaderCell, occupantHeaderCell].forEach((cell) => {
        cell.font = { bold: true, size: 18 }; // Changed from 12 to 18
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

      let currentRow = 4;
      for (const room of roomsForType) {
        const startRow = currentRow;
        const capacity = room.capacity || 0;
        const occupants = room.occupants || [];
        const numRowsForRoom = Math.max(1, capacity);

        // Write room name and merge cells based on capacity
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
        roomNameCell.font = { size: 18 }; // Set font size for room name cell

        // Write occupants and apply borders to all cells in the room block
        for (let i = 0; i < numRowsForRoom; i++) {
          // Apply border and font to the room name cell part
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

          // Get or create the occupant cell
          const occupantCell = worksheet.getCell(startRow + i, currentCol + 1);
          const occupant = occupants[i];
          if (occupant && occupant.clientName) {
            occupantCell.value = occupant.clientName;
          } else {
            occupantCell.value = null; // Ensure it's empty
          }
          // Apply border and font to the occupant cell, even if empty
          occupantCell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          occupantCell.font = { size: 18 }; // Set font size for occupant cell
        }

        currentRow += numRowsForRoom;
        // Add an empty row after each room, but not after the last room in the type
        if (roomsForType.indexOf(room) < roomsForType.length - 1) {
          worksheet.addRow([]);
          currentRow++;
        }
      }

      // If this is not the last room type, add a separator column
      if (roomTypes.indexOf(type) < roomTypes.length - 1) {
        const separatorColIndex = currentCol + 2;
        worksheet.getColumn(separatorColIndex).width = 5; // Set a fixed small width
        separatorColumns.add(separatorColIndex);
      }

      // Move to the next block for the next type, adding a separator column
      currentCol += 3;
    }

    // Auto-fit columns based on content, skipping separator columns
    worksheet.columns.forEach((column, index) => {
      // exceljs columns are 1-based, so index+1
      if (separatorColumns.has(index + 1)) {
        return; // Skip separator columns
      }
      let maxColumnLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        // Calculate the length of the cell's text content
        const cellLength = cell.value ? cell.value.toString().length : 0;
        if (cellLength > maxColumnLength) {
          maxColumnLength = cellLength;
        }
      });
      // Set the column width to the max content length with padding
      // A larger multiplier is used to account for wider characters (like Arabic) and larger font size.
      column.width = maxColumnLength * 1.1 + 7; // Add padding for better readability
    });
  }

  return workbook;
};
