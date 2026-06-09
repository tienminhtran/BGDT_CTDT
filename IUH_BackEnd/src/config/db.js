const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Pool dùng chung cho toàn ứng dụng
let poolPromise;

function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .then((pool) => {
        console.log('1. Đã kết nối SQL Server');
        return pool;
      })
      .catch((err) => {
        poolPromise = undefined;
        console.error('Lỗi kết nối SQL Server:', err.message);
        throw err;
      });
  }
  return poolPromise;
}

module.exports = { sql, getPool };
