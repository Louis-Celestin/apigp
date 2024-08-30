const mysql = require("mysql")
const conn = mysql.createConnection({
    // host : "51.210.248.205",
    // port : "3306",
    // database : "powerbi_gp",
    // password : "powerbi",
    // user : "powerbi",
    host : "mysql-devgp.alwaysdata.net",
    port : "3306",
    database : "devgp_deploiement",
    password : "P@sswordAa2024",
    user : "devgp_root",
    timeout : 30000
})

 conn.connect()

module.exports = {conn}