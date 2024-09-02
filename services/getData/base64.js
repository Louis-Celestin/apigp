const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');
const { Readable } = require('stream');

/**
 * Convertit une image base64 en une URL d'image hébergée sur Cloudinary après compression.
 * 
 * @param {string} base64Image - L'image encodée en base64.
 * @param {string} cloudName - Le nom du cloud Cloudinary.
 * @param {string} apiKey - La clé API Cloudinary.
 * @param {string} apiSecret - Le secret API Cloudinary.
 * @returns {Promise<string>} - L'URL de l'image hébergée sur Cloudinary.
 * @throws {Error} - Lance une erreur si la conversion ou l'envoi échoue.
 */
const convertImageToBase64 = async (base64Image, cloudName, apiKey, apiSecret) => {

    // Configurer Cloudinary
    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret
    });

    try {
        // Vérification de l'image
        if (!base64Image) {
            throw new Error('No image provided');
        }

        // Décoder l'image base64
        const imageBuffer = Buffer.from(base64Image, 'base64');

        // Compresser l'image avec sharp
        const compressedImageBuffer = await sharp(imageBuffer)
            .resize({ width: 800 }) // Redimensionner si nécessaire
            .toBuffer();

        // Convertir le buffer en un flux lisible
        const imageStream = Readable.from(compressedImageBuffer);

        // Envoyer l'image compressée à Cloudinary
        const cloudinaryResponse = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream({ resource_type: 'image', timeout: 60000,folder :'tpe' }, (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }).end(compressedImageBuffer);
        });

        // Retourner l'URL de l'image hébergée sur Cloudinary
        return cloudinaryResponse.secure_url;

    } catch (err) {
        console.error('Erreur lors de l\'envoi de l\'image à Cloudinary :', err);
        throw new Error('Erreur lors de l\'envoi de l\'image');
    }
};

module.exports = convertImageToBase64;
