const cnx = require('./dbConnect');

const getTpe = async(sn) => {
        console.log(sn)
    try {
        var tpes = JSON.parse(sn);
        var tpe = [];

        for (let i = 0; i < tpes.length; i++) {
            const results = await new Promise((resolve, reject) => {
                cnx.conn.query("SELECT * FROM TPE WHERE ID_TERMINAL = ?", tpes[i], (error, results, fields) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                });
            });
            tpe.push(results);
        }
        return tpe;
    } catch (error) {
        throw error;
    }
}

module.exports = getTpe;
