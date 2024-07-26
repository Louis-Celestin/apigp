const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

/**
 * Convertit une image base64 en une URL d'image hébergée sur Cloudinary.
 * 
 * @param {string} base64Image - L'image encodée en base64.
 * @param {string} cloudName - Le nom du cloud Cloudinary.
 * @param {string} apiKey - La clé API Cloudinary.
 * @param {string} apiSecret - Le secret API Cloudinary.
 * @returns {Promise<string>} - L'URL de l'image hébergée sur Cloudinary.
 * @throws {Error} - Lance une erreur si la conversion ou l'envoi échoue.
 */
const convertImageToBase64 = async (base64Image, cloudName, apiKey, apiSecret) => {

    console.log("L'image est :"+base64Image)
    
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

        // Envoyer l'image en base64 directement à Cloudinary
        const cloudinaryResponse = await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64Image}`);

        // Retourner l'URL de l'image hébergée sur Cloudinary
        return cloudinaryResponse.secure_url;
    } catch (err) {
        console.error('Erreur lors de l\'envoi de l\'image à Cloudinary :', err);
        throw new Error('Erreur lors de l\'envoi de l\'image');
    }
};

module.exports = convertImageToBase64;
