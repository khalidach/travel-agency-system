// backend/controllers/programController.js

exports.getAllPrograms = async (req, res) => {
  try {
    // Note: We use double quotes in SQL for camelCase column names
    const { rows } = await req.db.query('SELECT * FROM programs WHERE "userId" = $1', [req.user.id]);
    res.json(rows);
  } catch (error) {
    console.error('Get All Programs Error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.createProgram = async (req, res) => {
    const { name, type, duration, cities, packages } = req.body;
    try {
        const { rows } = await req.db.query(
            'INSERT INTO programs ("userId", name, type, duration, cities, packages) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [req.user.id, name, type, duration, JSON.stringify(cities), JSON.stringify(packages)]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Create Program Error:', error);
        res.status(400).json({ message: error.message });
    }
};

exports.updateProgram = async (req, res) => {
    const { id } = req.params;
    const { name, type, duration, cities, packages } = req.body;
    try {
        const { rows } = await req.db.query(
            'UPDATE programs SET name = $1, type = $2, duration = $3, cities = $4, packages = $5, "updatedAt" = NOW() WHERE id = $6 AND "userId" = $7 RETURNING *',
            [name, type, duration, JSON.stringify(cities), JSON.stringify(packages), id, req.user.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Program not found or user not authorized' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Update Program Error:', error);
        res.status(400).json({ message: error.message });
    }
};

exports.deleteProgram = async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await req.db.query('DELETE FROM programs WHERE id = $1 AND "userId" = $2', [id, req.user.id]);
        if (rowCount === 0) {
            return res.status(404).json({ message: 'Program not found or user not authorized' });
        }
        res.json({ message: 'Program deleted successfully' });
    } catch (error) {
        console.error('Delete Program Error:', error);
        res.status(500).json({ message: error.message });
    }
};
