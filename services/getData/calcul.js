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
async function trouverPointsMarchandsProches(latitudeTelephone, longitudeTelephone) {
    const connection = await mysql.createConnection({
        host: '51.210.248.205',
        user: 'powerbi',
        password: 'powerbi',
        database: 'powerbi_gp'
    });

    try {
        const [rows, fields] = await connection.execute(`
            SELECT POINT_MARCHAND, LATITUDE, LONGITUDE
            FROM POINT_MARCHAND;
        `);

        const pointsMarchandsProches = [];

        rows.forEach(pointMarchand => {
            
            const distance = calculateDistance(latitudeTelephone, longitudeTelephone, pointMarchand.LATITUDE, pointMarchand.LONGITUDE);
            if (distance <= 5) { // Chercher les points marchands dans un rayon de 5 mètres
                pointsMarchandsProches.push(pointMarchand);
            }
        });

        return pointsMarchandsProches;
    } catch (error) {
        console.error('Erreur lors de la récupération des points marchands :', error);
        throw error;
    } finally {
        await connection.end();
    }
}

// Coordonnées du téléphone
const latitudeTelephone = 5.2973114754; // Exemple de latitude
const longitudeTelephone = -3.972523962105; // Exemple de longitude

// Trouver les points marchands dans un rayon de 5 mètres autour de la position du téléphone
trouverPointsMarchandsProches(latitudeTelephone, longitudeTelephone)
    .then(pointsMarchandsProches => {
        console.log('Points marchands à moins de 5 mètres :', pointsMarchandsProches);
    })
    .catch(error => {
        console.error('Erreur :', error);
    });
