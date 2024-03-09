const mysql = require("mysql")
const conn = mysql.createConnection({
    host : "localhost",
    port : "3306",
    database : "db_deploiement",
    password : "",
    user : "root"
})

conn.connect()

module.exports = {conn}