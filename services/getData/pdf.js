const PDFDocument = require('pdfkit');
const fs = require('fs');
const nodemailer = require('nodemailer');
const axios = require('axios');

/**
 * Génère un PDF et l'envoie par email.
 * @param {Object} routineData - Les données de la routine.
 * @param {Object} agent - Les informations sur l'agent (nom, email).
 * @param {Object} responsable - Les informations sur le responsable (nom, email).
 */
const generateAndSendPDF = async (routineData, agent, responsable) => {
  console.log(routineData)
  console.log(agent)
  console.log(responsable)
  const createPDF = (data, callback) => {
    const doc = new PDFDocument({ margin: 50 });
    const filePath = `C:/Users/louis/Bd/Apis/services/getData/PDF/agent_${new Date().getTime()}_output.pdf`;
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    const addImageRight = async (imageUrl) => {
      try {
        const imagePath = await downloadImage(imageUrl);
        const imageWidth = 100; // Largeur de l'image
        const margin = 400; // Marge à partir de la droite
        doc.image(imagePath, doc.page.width - margin, doc.y - imageWidth / 2, { width: imageWidth });
      } catch (error) {
        console.error('Erreur lors de l\'ajout de l\'image:', error);
        throw error; // Gérer l'erreur selon vos besoins
      }
    };

    const downloadImage = async (imageUrl) => {
      try {
        const response = await axios({
          url: imageUrl,
          method: 'GET',
          responseType: 'stream'
        });

        const imagePath = `C:/Users/louis/Bd/Apis/services/getData/PDF/temp_image.jpg`; // Remplacez par votre chemin et nom de fichier
        
        const writer = fs.createWriteStream(imagePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
          writer.on('finish', () => resolve(imagePath));
          writer.on('error', reject);
        });
      } catch (error) {
        console.error('Erreur lors du téléchargement de l\'image:', error);
        throw error; // Gérer l'erreur selon vos besoins
      }
    };

    const sendEmail = (filePath, agent, responsable) => {
      const transporter = nodemailer.createTransport({
        service: 'outlook',
        auth: {
          user: 'louiskoye@outlook.fr',
          pass: 'Lc2024@#'
        }
      });

      const mailOptions = {
        from: 'louiskoye@outlook.fr',
        to: responsable.email_bdm,
        subject: 'Rapport de Routine',
        text: `Bonjour ${responsable.nom_bdm} ${responsable.prenom_agent},\n\nVotre agent ${agent.nom_agent} vient d'effectuer une routine chez le point marchand ${data[0].pointMarchand}.\n\nCi-joint le rapport de routine.\n\nCordialement.`,
        attachments: [
          {
            filename: 'rapport_routine.pdf',
            path: filePath
          }
        ]
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
    };

    data.forEach(async (routineData, index) => {
      if (index !== 0) {
        doc.addPage();
      }

      doc.image('C:/Users/louis/Bd/Apis/services/getData/logo.png', 50, 50, { width: 100 });
      doc.fontSize(20).text('RAPPORT DE ROUTINE', 200, 50);
      doc.moveDown(2);

      const leftMargin = 50;
      const detailKeys = [
        { label: 'Numero Routine: ', value: routineData.numero_routine },
        { label: 'Date Routine: ', value: new Date(routineData.date_routine).toLocaleDateString() },
        { label: 'Point Marchand Routine: ', value: routineData.pointMarchand },
        { label: 'Latitude Marchand Routine: ', value: routineData.latitudeReel },
        { label: 'Longitude Marchand Routine: ', value: routineData.longitudeReel },
        { label: 'Veille Concurentielle Routine: ', value: routineData.veilleConcurrentielle }
      ];

      detailKeys.forEach(detail => {
        doc.fontSize(12).font('Helvetica-Bold').text(detail.label, leftMargin, doc.y, { continued: true }).font('Helvetica').text(detail.value);
      });

      doc.moveDown(2);
      doc.fontSize(16).font('Helvetica-Bold').text('TPE Routine', { underline: true, align: 'left' });
      doc.moveDown();

      routineData.tpe_routine.forEach(async (tpe, tpeIndex) => {
        doc.fontSize(14).font('Helvetica-Bold').text(`TPE ${tpeIndex + 1}`, { underline: true });
        doc.moveDown();

        const tpeDetails = [
          { label: 'ID Terminal TPE: ', value: tpe.idTerminal },
          { label: 'État TPE: ', value: tpe.etatTpe },
          { label: 'État Chargeur: ', value: tpe.etatChargeur },
          { label: 'Problème Bancaire: ', value: tpe.problemeBancaire },
          { label: 'Description Problème Bancaire: ', value: tpe.descriptionProblemeBancaire || 'N/A' },
          { label: 'Problème Mobile: ', value: tpe.problemeMobile },
          { label: 'Description Problème Mobile: ', value: tpe.descriptionProblemeMobile || 'N/A' }
        ];

        tpeDetails.forEach(detail => {
          doc.fontSize(12).font('Helvetica-Bold').text(detail.label, leftMargin, doc.y, { continued: true }).font('Helvetica').text(detail.value);
        });

        await addImageRight(tpe.image); // Utilisez la propriété de l'image du TPE

        doc.moveDown(2);
      });

      doc.moveDown(2);
    });

    doc.end();

    stream.on('finish', () => {
      sendEmail(filePath, agent, responsable); // Appel à la fonction sendEmail après la fin de la génération du PDF
      callback(filePath);
    });
  };

  createPDF(routineData, (filePath) => {
    // sendEmail(filePath, agent, responsable); // Vous pouvez aussi appeler sendEmail ici si nécessaire
  });
};

module.exports = { generateAndSendPDF };
