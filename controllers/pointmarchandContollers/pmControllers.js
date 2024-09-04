const mysql = require('mysql2/promise');

// Fonction pour calculer la distance entre deux points géographiques en mètres
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = lat1 * Math.PI / 180; // Conversion des degrés en radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distance en mètres
    return distance;
}

// Fonction pour récupérer les points marchands dans un rayon de 5 mètres autour de la position du téléphone
const trouverPointsMarchandsProches = async (req,res) => {
    const { latitudeTelephone, longitudeTelephone } = req.body;
    
    const connection = await mysql.createConnection({
        // host: '51.210.248.205',
        // user: 'powerbi',
        // password: 'powerbi',
        // database: 'powerbi_gp'
        host : "mysql-devgp.alwaysdata.net",
        user : "devgp_root",
        database : "devgp_deploiement",
        password : "P@sswordAa2024",
    });

    console.log(latitudeTelephone, longitudeTelephone)

    try {
        const [rows] = await connection.execute(`
            SELECT * FROM pm;
        `);
    
        const pointsMarchandsProches = [];
    
        rows.forEach(pointMarchand => {
            const distance = calculateDistance(latitudeTelephone, longitudeTelephone, pointMarchand.latitude_pm, pointMarchand.longitude_pm);
            if (distance <= 5) { // Chercher les points marchands dans un rayon de 5 mètres
                pointsMarchandsProches.push(pointMarchand);
            }
        });
    
        if (pointsMarchandsProches.length === 0) {
            return res.status(401).json({ message: 'Aucun point marchand trouvé dans un rayon de 5 mètres' });
        } else {
            console.log(pointsMarchandsProches)
            return res.status(200).json(pointsMarchandsProches);
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des points marchands :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    } finally {
        await connection.end();
    }
    
}

module.exports = { trouverPointsMarchandsProches };
