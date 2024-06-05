const PDFDocument = require('pdfkit');
const fs = require('fs');
const axios = require('axios'); // Si vous utilisez Axios pour les requêtes HTTP

// URL de l'API
const API_URL = 'URL_DE_VOTRE_API';

// Fonction pour récupérer les données depuis votre API
async function fetchAPI() {
    try {
        const response = await axios.get(API_URL);
        return response.data; // Supposons que les données sont renvoyées sous forme de tableau d'objets
    } catch (error) {
        console.error('Erreur lors de la récupération des données depuis l\'API:', error);
        return []; // En cas d'erreur, retourne un tableau vide
    }
}

// Crée un nouveau document PDF
const doc = new PDFDocument();

// Pipe le PDF dans un fichier
const outputStream = fs.createWriteStream('rapport_de_routine.pdf');
doc.pipe(outputStream);

// Ajouter le logo en haut à gauche
doc.image('chemin/vers/votre/logo.png', 50, 50, { width: 100 });

// Ajoutez votre contenu au PDF ici
doc.fontSize(25).text('RAPPORT DE ROUTINE', { align: 'center' });
doc.moveDown();

// Récupérez les données depuis votre API
fetchAPI().then(data => {
    // Insérez les données dynamiques dans le PDF
    data.forEach(routine => {
        doc.fontSize(12).font('Helvetica').text(`Date de la visite : ${new Date(routine.date_routine).toLocaleDateString()}`);
        doc.fontSize(12).font('Helvetica').text(`Point Marchand : ${routine.point_marchand_routine}`);
        doc.fontSize(12).font('Helvetica').text(`Commercial : ${routine.commercial_routine_id}`);
        doc.fontSize(12).font('Helvetica').text(`Veille concurentielle : ${routine.veille_concurentielle_routine}`);
        doc.moveDown();
        doc.moveDown();
        
        // Liste des TPES
        doc.fontSize(18).text('LISTE DES TPES', { align: 'center' });
        doc.moveDown();

        // Tableau des TPES
        routine.tpe_routine.forEach((tpe, index) => {
            doc.fontSize(12).font('Helvetica').text(`TPE ${index + 1}:`);
            doc.fontSize(12).font('Helvetica').text(`ID Terminal : ${tpe.id_terminal_tpe_routine}`);
            doc.fontSize(12).font('Helvetica').text(`Etat du TPE : ${tpe.etat_tpe_routine}`);
            doc.fontSize(12).font('Helvetica').text(`Etat du chargeur : ${tpe.etat_chargeur_tpe_routine}`);
            doc.fontSize(12).font('Helvetica').text(`Problème bancaire : ${tpe.probleme_bancaire}`);
            doc.fontSize(12).font('Helvetica').text(`Description du problème bancaire : ${tpe.description_problemebancaire}`);
            doc.fontSize(12).font('Helvetica').text(`Problème mobile : ${tpe.probleme_mobile}`);
            doc.fontSize(12).font('Helvetica').text(`Description du problème mobile : ${tpe.description_probleme_mobile}`);
            doc.moveDown();
        });

        doc.moveDown();
    });

    // Fin du document
    doc.end();
    
    console.log('PDF créé avec succès');
}).catch(error => {
    console.error('Erreur lors de la récupération des données depuis l\'API:', error);
    doc.end();
});
