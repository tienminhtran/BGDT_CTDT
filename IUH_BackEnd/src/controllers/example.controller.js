const { getPool, sql } = require('../config/db');

// GET /api/examples  -> ví dụ truy vấn DB
exports.getAll = async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT 1 AS id, N\'Hello IUH\' AS name');
    res.json({ data: result.recordset });
  } catch (err) {
    next(err);
  }
};

// GET /api/examples/:id  -> ví dụ dùng tham số an toàn
exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, parseInt(id, 10))
      .query('SELECT @id AS id, N\'Hello IUH\' AS name');
    res.json({ data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
};
