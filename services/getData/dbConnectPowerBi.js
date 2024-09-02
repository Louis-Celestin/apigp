const mysql = require('mysql2/promise');
// Créer un pool de connexions
const pool1 = mysql.createPool({
  host: '51.210.248.205',
  user: 'powerbi',
  password: 'powerbi',
  database: 'powerbi_gp',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool1;
