const getNextPaymentId = async (db, userId) => {
    const currentYear = new Date().getFullYear();

    // Insert a new row if it doesn't exist, or increment last_value if it does.
    // This atomic operation prevents race conditions.
    const query = `
    INSERT INTO payment_sequences ("userId", year, last_value)
    VALUES ($1, $2, 1)
    ON CONFLICT ("userId", year)
    DO UPDATE SET last_value = payment_sequences.last_value + 1
    RETURNING last_value;
  `;

    const result = await db.query(query, [userId, currentYear]);
    const nextValue = result.rows[0].last_value;

    // Format as YYYY-XXXXX (e.g., 2026-00001)
    const formattedValue = String(nextValue).padStart(5, '0');
    return `${currentYear}-${formattedValue}`;
};

module.exports = {
    getNextPaymentId,
};
