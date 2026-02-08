// backend/services/NotificationService.js
const logger = require("../utils/logger");

// Updated to accept senderName
const createNotification = async (
  client,
  { recipientId, senderId, senderName, title, message, type, referenceId },
) => {
  try {
    const { rows } = await client.query(
      `INSERT INTO notifications ("recipientId", "senderId", "senderName", title, message, type, "referenceId")
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [recipientId, senderId, senderName, title, message, type, referenceId],
    );
    return rows[0];
  } catch (error) {
    logger.error("Error creating notification:", error);
    throw error;
  }
};

const notifyAdminsAndManagers = async (client, adminId, notificationData) => {
  // 1. Notify the main Admin (Owner)
  await createNotification(client, {
    ...notificationData,
    recipientId: adminId,
  });

  // 2. Find and notify all Managers associated with this Admin
  const { rows: managers } = await client.query(
    `SELECT id FROM employees WHERE "adminId" = $1 AND role = 'manager' AND active = true`,
    [adminId],
  );

  for (const manager of managers) {
    await createNotification(client, {
      ...notificationData,
      recipientId: manager.id,
    });
  }
};

const getUserNotifications = async (db, userId) => {
  // Select senderName from column, fallback to joined user's username if null
  const { rows } = await db.query(
    `SELECT n.*, 
            COALESCE(n."senderName", u.username) as "senderName" 
     FROM notifications n 
     LEFT JOIN users u ON n."senderId" = u.id 
     WHERE n."recipientId" = $1 
     ORDER BY n."createdAt" DESC LIMIT 50`,
    [userId],
  );
  return rows;
};

const markAsRead = async (db, notificationId, userId) => {
  await db.query(
    `UPDATE notifications SET "isRead" = true WHERE id = $1 AND "recipientId" = $2`,
    [notificationId, userId],
  );
};

const markAllAsRead = async (db, userId) => {
  await db.query(
    `UPDATE notifications SET "isRead" = true WHERE "recipientId" = $1`,
    [userId],
  );
};

module.exports = {
  createNotification,
  notifyAdminsAndManagers,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
};
