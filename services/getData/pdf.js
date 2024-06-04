const fs = require('fs');
const PDFDocument = require('pdfkit');
const handlebars = require('handlebars');

// Template HTML
const templateHtml = require('./template.html');

// Votre JSON avec plusieurs routines
const routinesData = [
    {
        id: 12,
        commercial_routine_id: 9,
        numero_routine: "ROUTINE-1",
        date_routine: "2024-05-30T09:10:26.000Z",
        point_marchand_routine: "CHINA MALL VGE",
        latitude_marchand_routine: "5.2973114754742",
        longitude_marchand_routine: "-3.972523960301",
        veille_concurentielle_routine: "MOOV",
        tpe_routine: [
            {
                id: 20,
                routine_id: 12,
                id_terminal_tpe_routine: "1002932",
                etat_tpe_routine: "OK",
                etat_chargeur_tpe_routine: "OK",
                probleme_bancaire: "OUI",
                description_problemebancaire: "Les paiements bancaire ne passent pas",
                probleme_mobile: "OUI",
                description_probleme_mobile: "Les paiements mobile ne passent pas"
            }
        ]
    },
    {
        id: 13,
        commercial_routine_id: 10,
        numero_routine: "ROUTINE-2",
        date_routine: "2024-06-01T10:20:30.000Z",
        point_marchand_routine: "CITY CENTER",
        latitude_marchand_routine: "5.1234567890123",
        longitude_marchand_routine: "-4.9876543210987",
        veille_concurentielle_routine: "ORANGE",
        tpe_routine: [
            {
                id: 21,
                routine_id: 13,
                id_terminal_tpe_routine: "1002933",
                etat_tpe_routine: "OK",
                etat_chargeur_tpe_routine: "OK",
                probleme_bancaire: "NON",
                description_problemebancaire: "",
                probleme_mobile: "OUI",
                description_probleme_mobile: "Les paiements mobile ne passent pas"
            }
        ]
    }
];

// Fonction pour générer le PDF pour une routine donnée
function generateRoutinePDF(routineData) {
    const doc = new PDFDocument();
    const fileName = `routine_report_${routineData.id}.pdf`;
    const writeStream = fs.createWriteStream(fileName);

    doc.pipe(writeStream);

    // Compiler le template HTML
    const template = handlebars.compile(templateHtml);
    const html = template(routineData);

    // Ajouter le contenu au PDF
    doc.fontSize(12).text(html);

    // Ajouter la dataTable dynamique
    const tpeData = routineData.tpe_routine;
    const columns = Object.keys(tpeData[0]);
    const columnWidths = columns.map(col => doc.widthOfString(col) + 30);
    const tableWidth = columnWidths.reduce((acc, width) => acc + width, 0);
    
    doc.moveDown().moveDown();

    doc.table({
        headers: columns,
        rows: tpeData.map(row => Object.values(row)),
        widths: columnWidths,
        layout: 'lightHorizontalLines',
        fontSize: 10,
        width: tableWidth,
        align: 'center'
    });

    doc.end();

    console.log(`PDF généré: ${fileName}`);
}

// Générer les PDF pour chaque routine
for (const routineData of routinesData) {
    generateRoutinePDF(routineData);
}
