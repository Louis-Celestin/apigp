const mysql = require('mysql2/promise');
// Créer un pool de connexions
const pool2 = mysql.createPool({
  host: '51.75.95.225',
  user: 'devgp_root',
  password: 'P@sswordGpRouting2024',
  database: 'devgp_deploiement',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool2;
