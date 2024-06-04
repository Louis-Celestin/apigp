const mysql = require("mysql")
const conn = mysql.createConnection({
    host : "mysql-devgp.alwaysdata.net",
    port : "3306",
    database : "devgp_deploiement",
    password : "P@sswordAa2024",
    user : "devgp_root"
})

conn.connect()

module.exports = {conn}