const { Sequelize } = require('sequelize');

// Sequelize instance cho SQL Server (dialect mssql, driver tedious).
// Dùng lại đúng các biến môi trường DB như config/db.js (mssql thuần).
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_SERVER || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    dialect: 'mssql',
    dialectOptions: {
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
      },
    },
    pool: {
      max: 10,
      min: 0,
      idle: 30000,
    },
    logging: false, // tắt log SQL ra console
    define: {
      timestamps: false, // các bảng không có createdAt/updatedAt
      freezeTableName: true, // không tự đổi tên bảng sang số nhiều
    },
  }
);

module.exports = { sequelize, Sequelize };
