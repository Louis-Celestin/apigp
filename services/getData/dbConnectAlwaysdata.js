const mysql = require('mysql2/promise');
// Créer un pool de connexions
const pool2 = mysql.createPool({
  host: 'mysql-devgp.alwaysdata.net',
  user: 'devgp_root',
  password: 'P@sswordAa2024',
  database: 'devgp_deploiement',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool2;
