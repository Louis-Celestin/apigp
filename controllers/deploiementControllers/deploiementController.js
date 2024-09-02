// const uuid = require("uuid");
// const { PrismaClient } = require("@prisma/client");
// const prisma = new PrismaClient();
// const format = require("date-format");
// const cnx = require("../../services/getData/dbConnect");
// const cnx1 = require("../../services/getData/dbConnectlocal")
// // const { sendWhatsapp } = require("../../services/getData/Whatsaap");
// // const cnx2 = require("../../services/getData/dbConnectlocalTpe");


// const deploy = async (req, res, next) => {
//     try {
//         // Extraction des données du corps de la requête
//         const {
//             idTpe,
//             idCommercial,
//             etat_batterie_tpelivraison: etatBatterie,
//             etatChargeur,
//             etatPuce,
//             fonctionResponsable,
//             nomCompletResponsable,
//             siteMarchand,
//             telePhoneResponsable,
//             emailresponsable,
//             tpes
//         } = req.body;
//         idsTpe = JSON.parse(idTpe)
//         // Recherche des TPE à déployer
//         const tpe = await prisma.tpe_livraison.findMany({
//             where: {
//                 id: {
//                     in: idsTpe.map(Number)
//                 }
//             }
//         });

//         // Vérifier si les TPE existent
//         if (!tpe.length) {
//             return res.status(400).json({ message: "Aucun TPE trouvé" });
//         }

//         // Recherche de l'agent commercial
//         const agent = await prisma.agent.findMany({
//             where: { id: Number(idCommercial) },
//             include: { zone_commerciale: true }
//         });

//         // Vérifier si l'agent existe
//         if (!agent.length) {
//             return res.status(400).json({ message: "Cet agent n'existe pas" });
//         }

//         // Vérifier si l'agent a le droit de déployer ces TPE
//         const zones = tpe.map(tpeItem => tpeItem.zone_gp_tpe_livraison);
//         if (!zones.every(zone => zone === agent[0].zone_commerciale.nom_zone)) {
//             return res.status(400).json({ message: "Vous n'avez pas le droit de déployer ces TPE" });
//         }

//         // Créer un nouveau déploiement
//         const deploy = await prisma.deploiement.create({
//             data: {
//                 date_deploiement: format.now(),
//                 email_responsable_marchand: emailresponsable,
//                 fonction_responsable_marchand: fonctionResponsable,
//                 nom_responsable_marchand: nomCompletResponsable,
//                 numero_deloiement: "DP-" + uuid.v4().toUpperCase(),
//                 point_marchand: tpe[0].point_marchand_tpe_livraison,
//                 site_marchand: siteMarchand,
//                 telephone_responsable_marchand: telePhoneResponsable,
//                 commercial_deploiement_id: Number(idCommercial),
//                 tpes: tpes
//             }
//         });

//         // Mettre à jour l'état de chaque TPE
//         const promises = tpe.map(tpeItem => {
//             return prisma.tpe_livraison.update({
//                 where: { id: Number(tpeItem.id) },
//                 data: {
//                     deploiement_id: Number(deploy.id),
//                     etat_batterie_tpelivraison: etatBatterie,
//                     etat_chargeur_tpelivraison: etatChargeur,
//                     etat_puce_tpelivraison: etatPuce,
//                     date_deploiement_tpe_livraison: format.now(),
//                     statut_deploiement_tpe_livraison: "TPE déployé chez le marchand",
//                     agent_deploiement_tpe_livraison_id: agent[0].id
//                 }
//             });
//         });

//         // Attendre toutes les mises à jour
//         await Promise.all(promises);

//         return res.status(200).json({ message: "Déploiement effectué avec succès", data: deploy });
//     } catch (err) {
//         console.log(err);
//         return res.status(500).json({ message: "Une erreur est survenue lors du déploiement" });
//     }
// };

// module.exports = { deploy };
