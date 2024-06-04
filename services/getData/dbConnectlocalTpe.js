const mysql = require("mysql")
const conn = mysql.createConnection({
    host : "51.210.248.205",
    port : "3306",
    database : "powerbi_gp",
    password : "powerbi",
    user : "powerbi"
})

conn.connect()

module.exports = {conn}