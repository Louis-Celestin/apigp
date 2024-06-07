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
        host: '51.210.248.205',
        user: 'powerbi',
        password: 'powerbi',
        database: 'powerbi_gp'
    });

    console.log(latitudeTelephone, longitudeTelephone)

    try {
        const [rows, fields] = await connection.execute(`
            SELECT POINT_MARCHAND, LATITUDE, LONGITUDE, GROUPE
            FROM POINT_MARCHAND WHERE GROUPE != 'SOFTPOS' AND ZONE_GP != 'SOFTPOS';
        `);

        const pointsMarchandsProches = [];

        rows.forEach(pointMarchand => {
            // console.log(latitudeTelephone, longitudeTelephone, pointMarchand.LATITUDE, pointMarchand.LONGITUDE)
            const distance = calculateDistance(latitudeTelephone, longitudeTelephone, pointMarchand.LATITUDE, pointMarchand.LONGITUDE);
            if (distance <= 10) { // Chercher les points marchands dans un rayon de 5 mètres
                pointsMarchandsProches.push(pointMarchand);
            }
        });

        if (pointsMarchandsProches.length === 0) {
            return res.status(404).json({ message: 'Aucun point marchand trouvé dans un rayon de 5 mètres' });
        }else{
            return res.status(200).json(pointsMarchandsProches);
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des points marchands :', error);
        throw error;
    } finally {
        await connection.end();
    }
}

module.exports = { trouverPointsMarchandsProches };
