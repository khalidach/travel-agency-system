const RoomManagementService = require("../RoomManagementService");
const NotificationService = require("../NotificationService");
const AppError = require("../../utils/appError");
const { checkProgramCapacity } = require("./capacity.service");
const {
  getProgramConfiguredPrice,
} = require("./pricing.service");

const createBookings = async (db, user, bulkData) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { clients, ...sharedData } = bulkData;
    const { role, id, adminId } = user;

    if (!clients || clients.length === 0) {
      throw new Error("No clients provided for booking.");
    }

    const createdBookings = [];
    const {
      tripId,
      packageId,
      selectedHotel,
      sellingPrice,
      variationName,
      relatedPersons,
      bookingSource,
      branchId,
    } = sharedData;

    // 1. Capacity Check
    const newBookingsCount = clients.length;
    const capacity = await checkProgramCapacity(
      client,
      tripId,
      newBookingsCount,
    );

    if (capacity.isFull) {
      throw new AppError(
        `لقد اكتمل هذا البرنامج. الحجوزات الحالية: ${capacity.currentBookings}، الحد الأقصى: ${capacity.maxBookings}. لا يمكن إضافة ${newBookingsCount} حجز جديد.`,
        400,
      );
    }

    // 2. Fetch Program Data
    const programRes = await client.query(
      'SELECT * FROM programs WHERE id = $1 AND "userId" = $2',
      [tripId, adminId],
    );
    if (programRes.rows.length === 0) {
      throw new Error("Program not found.");
    }
    const program = programRes.rows[0];
    if (program.packages && program.packages.length > 0 && !packageId) {
      throw new Error("A package must be selected for this program.");
    }

    // 3. Determine Status (Price Validation)
    let status = "confirmed";
    const minSellingPrice = getProgramConfiguredPrice(
      program,
      packageId,
      selectedHotel,
    );

    // Check if price is too low for employees
    if (
      role === "employee" &&
      minSellingPrice > 0 &&
      Number(sellingPrice) < minSellingPrice
    ) {
      status = "pending_approval";
    }

    // 4. Create Bookings
    for (const clientData of clients) {
      const {
        clientNameAr,
        clientNameFr,
        personType,
        phoneNumber,
        passportNumber,
        dateOfBirth,
        passportExpirationDate,
        gender,
        noPassport,
      } = clientData;

      const processedClientNameFr = {
        lastName: clientNameFr.lastName
          ? clientNameFr.lastName.toUpperCase()
          : "",
        firstName: clientNameFr.firstName
          ? clientNameFr.firstName.toUpperCase()
          : "",
      };

      const processedPassportNumber =
        noPassport || !passportNumber ? null : passportNumber.toUpperCase();

      if (processedPassportNumber) {
        const existingBookingCheck = await client.query(
          'SELECT id FROM bookings WHERE "passportNumber" = $1 AND "tripId" = $2 AND "userId" = $3',
          [processedPassportNumber, tripId, adminId],
        );

        if (existingBookingCheck.rows.length > 0) {
          throw new Error(
            `Passport number ${processedPassportNumber} is already booked for this program.`,
          );
        }
      }

      const basePrice = 0;
      const profit = 0;
      const remainingBalance = sellingPrice;
      const isFullyPaid = remainingBalance <= 0;
      const employeeId = role === "admin" ? null : id;
      const branchIdToSave = role === "employee" || role === "manager" ? (user.branchId || null) : (branchId || null);

      const { rows } = await client.query(
        'INSERT INTO bookings ("userId", "employeeId", "clientNameAr", "clientNameFr", "personType", "phoneNumber", "passportNumber", "dateOfBirth", "passportExpirationDate", "gender", "tripId", "variationName", "packageId", "selectedHotel", "sellingPrice", "basePrice", profit, "advancePayments", "remainingBalance", "isFullyPaid", "relatedPersons", "bookingSource", status, "createdAt", "branchId") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW(), $24) RETURNING *',
        [
          adminId,
          employeeId,
          clientNameAr,
          JSON.stringify(processedClientNameFr),
          personType,
          phoneNumber,
          processedPassportNumber,
          dateOfBirth || null,
          passportExpirationDate || null,
          gender,
          tripId,
          variationName,
          packageId,
          JSON.stringify(selectedHotel),
          sellingPrice,
          basePrice,
          profit,
          "[]",
          remainingBalance,
          isFullyPaid,
          JSON.stringify([]),
          bookingSource || null,
          status,
          branchIdToSave,
        ],
      );
      const newBooking = rows[0];
      createdBookings.push(newBooking);

      if (status === "confirmed") {
        await RoomManagementService.autoAssignToRoom(
          client,
          user.adminId,
          newBooking,
        );
      }
    }

    // 4.5 Link group bookings under designated leaders (chefs)
    if (createdBookings.length > 0) {
      const bookingsDetails = createdBookings.map((b) => {
        let firstName = "";
        let lastName = "";
        if (b.clientNameFr) {
          if (typeof b.clientNameFr === "string") {
            try {
              const parsed = JSON.parse(b.clientNameFr);
              firstName = parsed.firstName || "";
              lastName = parsed.lastName || "";
            } catch (e) {}
          } else {
            firstName = b.clientNameFr.firstName || "";
            lastName = b.clientNameFr.lastName || "";
          }
        }
        const frenchName = `${firstName} ${lastName}`.trim();
        return {
          id: b.id,
          clientName: frenchName || b.clientNameAr || "",
        };
      });

      if (createdBookings.length === 1) {
        const singleBooking = createdBookings[0];
        const existingRelated = Array.isArray(relatedPersons) ? relatedPersons : [];
        if (existingRelated.length > 0) {
          await client.query(
            'UPDATE bookings SET "relatedPersons" = $1 WHERE id = $2',
            [JSON.stringify(existingRelated), singleBooking.id]
          );
          singleBooking.relatedPersons = existingRelated;
        }
      } else {
        // Find all leader indices
        const leaderIndices = [];
        clients.forEach((c, idx) => {
          if (c.isLeader) {
            leaderIndices.push(idx);
          }
        });

        // If no leaders are designated, default the first client (index 0) as leader
        if (leaderIndices.length === 0) {
          leaderIndices.push(0);
        }

        // Group members by leader index
        const leaderToMembersMap = new Map();
        leaderIndices.forEach((lIdx) => {
          leaderToMembersMap.set(lIdx, []);
        });

        clients.forEach((c, idx) => {
          if (leaderIndices.includes(idx)) {
            return;
          }

          let chosenLeaderIdx = c.leaderRowIndex;
          if (chosenLeaderIdx === undefined || chosenLeaderIdx === null || !leaderIndices.includes(Number(chosenLeaderIdx))) {
            chosenLeaderIdx = leaderIndices[0];
          } else {
            chosenLeaderIdx = Number(chosenLeaderIdx);
          }

          const memberDetail = {
            ID: bookingsDetails[idx].id,
            clientName: bookingsDetails[idx].clientName,
          };

          leaderToMembersMap.get(chosenLeaderIdx).push(memberDetail);
        });

        // Update each leader booking in database
        const existingRelated = Array.isArray(relatedPersons) ? relatedPersons : [];

        for (const [lIdx, membersList] of leaderToMembersMap.entries()) {
          const leaderBooking = createdBookings[lIdx];
          const isMainLeader = (lIdx === leaderIndices[0]);
          const finalRelatedPersons = isMainLeader
            ? [...existingRelated, ...membersList]
            : membersList;

          if (finalRelatedPersons.length > 0) {
            await client.query(
              'UPDATE bookings SET "relatedPersons" = $1 WHERE id = $2',
              [JSON.stringify(finalRelatedPersons), leaderBooking.id]
            );
            leaderBooking.relatedPersons = finalRelatedPersons;
          }
        }
      }
    }

    // 5. Send Notification if Pending Approval (AFTER bookings are created to get the ID)
    if (status === "pending_approval" && createdBookings.length > 0) {
      await NotificationService.notifyAdminsAndManagers(client, adminId, {
        // FIX: If user is employee, send null to avoid FK violation. If admin, send ID.
        senderId: role === "admin" ? user.id : null,
        senderName: user.username,
        title: "محاولة حجز بسعر منخفض",
        message: `الموظف ${user.username} قام بإنشاء ${createdBookings.length
          } حجز بسعر ${sellingPrice} (الحد الأدنى: ${minSellingPrice}) لبرنامج ${program.name
          }. يرجى الموافقة أو الرفض.`,
        type: "booking_approval",
        referenceId: createdBookings[0].id, // Link to the first booking for approval action
      });
    }

    await client.query(
      'UPDATE programs SET "totalBookings" = "totalBookings" + $1 WHERE id = $2',
      [clients.length, tripId],
    );

    await client.query("COMMIT");
    return {
      message:
        status === "pending_approval"
          ? "تم إنشاء الحجز بنجاح ولكنه في انتظار الموافقة بسبب انخفاض السعر."
          : `${clients.length} booking(s) created successfully.`,
      bookings: createdBookings,
      status: status,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  createBookings,
};
