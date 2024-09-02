// const uuid = require("uuid");
// const { PrismaClient } = require("@prisma/client");
// const prisma = new PrismaClient();
// const format = require("date-format");
// const cnx = require("../../services/getData/dbConnect");
// const cnx1 = require("../../services/getData/dbConnectlocal")
// const { sendWhatsapp } = require("../../services/getData/Whatsaap");
// const cnx2 = require("../../services/getData/dbConnectlocalTpe");

// const getAllLivraison = async (req, res, next) => {
//   const livraisons = await prisma.livraison.findMany();
//   return res.status(200).json( livraisons );
// };

// const getOneLivraison = async (req, res, next) => {
//   const idLivraison = req.params.idLivraison;
//   await prisma.livraison
//     .findMany({
//       where: { id: Number(idLivraison) },
//     })
//     .then((id) => {
//       if (id.length) {
//         return res.status(200).json({ data: id });
//       } else {
//         return res
//           .status(400)
//           .json({ message: "cette livraison n'existe pas" });
//       }
//     })
//     .catch((err) => {
//       console.log(err);
//     });
// };

// const saveLivraison = async (req, res, next) => {
//   const numeroLivraison = "DC-" + uuid.v4().toUpperCase();
//   const statutLivraison = "En attente";
//   const agentSaisieDt = req.body.agentSaisieDt;
//   const terminal_id = req.body.terminal_id
//   const banque  = req.body.banque
//   const orange = req.body.orange
//   const mtn = req.body.mtn
//   const moov = req.body.moov
//   const ecobank = req.body.ecobank

//   try {
//     const livraison = await prisma.livraison.create({
//       data: {  
//         numerolivraison : numeroLivraison,
//         date_saisie_livraison : format.now(),
//         statu_livraison : statutLivraison,
//         datevalidationlivraison : format.now(),
//         tpes : terminal_id,
//         agent_livraison_agent_saisielivraison_idToagent : {
//           connect :{id : Number(agentSaisieDt)}
//         },
//         agent_livraison_agent_validateur_livraison_idToagent : {
//           connect : {
//             id : Number(agentSaisieDt)
//           }
//         }
//       },
//     }) 
//     const tpe = JSON.parse(terminal_id)
//     const tpeTb = JSON.parse(tpe)
//     console.log(typeof tpeTb)
//     // Array pour stocker toutes les promesses des requêtes SQL
//     tpeTb.map((tpeId) => {
//       console.log(tpeId)
//        cnx2.conn.query('SELECT * FROM TPE INNER JOIN POINT_MARCHAND ON TPE.POINT_MARCHAND = POINT_MARCHAND.POINT_MARCHAND WHERE TPE.ID_TERMINAL = '+tpeId ,(error, results,fields)=>{
//         if(error){
//           throw error
//         }
//         if (results) {
//           const tpeData = results[0];
//           console.log(tpeData)
//           prisma.tpe_livraison.create({
//             data: {
//               nom_tpe_livraison : tpeData.TPE,
//               point_marchand_tpe_livraison : tpeData.POINT_MARCHAND,
//               sn_tpe_livraison : tpeData.SERIAL_NUMBER,
//               zone_gp_tpe_livraison : tpeData.ZONE_GP,
//               statut_livraison_dcm_tpe_livraison : "En attente de livraison DCM",
//               statut_deploiement_tpe_livraison : "En cours de deploiement",
//               date_deploiement_tpe_livraison : format.now(),
//               etat_chargeur_tpelivraison : null,
//               etat_batterie_tpelivraison : null,
//               etat_puce_tpelivraison : null,
//               livraison : {connect :{id :Number(livraison.id)}},
//               agent : {connect :{id : Number(agentSaisieDt)}}
//             }
//           }).then((tpes)=>{
//             return res.status(200).json({ message: "Livraison effectuée", data: livraison,tpes });
//           }).catch(err=>{
//             console.log(err)
//           })
//         }
//       });
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(400).json({ message: "Une erreur s'est produite" });
//   }
// };

// const validerLivraison = async (req, res, next) => {
//   try {
//     const idLivraison = req.params.idLivraison;
//     const agentValidateur = req.body.agentValidateur;

//     const found = await prisma.livraison.findMany({
//       where: { id: Number(idLivraison) },
//     });

//     if (found.length === 0) {
//       return res.status(400).json({ message: "Cette livraison n'existe pas" });
//     }else{
//       const livraison = found[0];

//       if (livraison.agent_validateur_livraison_id !== livraison.agent_saisielivraison_id) {
//         return res.json({ message: "Cette livraison est déjà validée" });
//       }
//       const updated = await prisma.livraison.update({
//         where: { id: Number(idLivraison) },
//         data: {
//           agent_livraison_agent_saisielivraison_idToagent : {
//             connect : {
//               id : Number(livraison.agent_saisielivraison_id)
//             }
//           },
//           agent_livraison_agent_validateur_livraison_idToagent : {
//             connect : {
//               id : Number(agentValidateur)
//             }
//           },
//           datevalidationlivraison : format.now(),
//           statu_livraison : "Livrée DCM",
//           // agent_saisielivraison_id : Number(livraison.agent_saisielivraison_id),
//           date_saisie_livraison : livraison.date_saisie_livraison,
//           numerolivraison : livraison.numerolivraison,
//           tpes : livraison.tpes,
//         }, 
//       });
  
//       const tpeIds = JSON.parse(updated.tpes);
//       const tp = JSON.parse(tpeIds)
  
//       // Récupérer les TPE associés à la livraison
//       const tpePromises = tp.map(async (tpeId) => {
//         const results = await new Promise((resolve, reject) => {
//           cnx.conn.query(
//             "SELECT POINT_MARCHAND.POINT_MARCHAND, TPE.ID_TERMINAL, POINT_MARCHAND.ZONE_GP, TPE.SERIAL_NUMBER FROM TPE INNER JOIN POINT_MARCHAND ON TPE.POINT_MARCHAND = POINT_MARCHAND.POINT_MARCHAND WHERE TPE.ID_TERMINAL = ?",
//             tpeId,
//             (error, results, fields) => {
//               if (error) {
//                 reject(error);
//               } else {
//                 resolve(results);
//               }
//             }
//           );
//         });
//         return results;
//       });
  
//       const tpeResults = await Promise.all(tpePromises);
  
//       // Récupérer les agents dans les zones correspondantes
//       const agentPromises = [];
//       for (const zone of tpeResults) {
//         for (const tpe of zone) {
//           const promise = new Promise((resolve, reject) => {
//             cnx1.conn.query(
//               "SELECT * FROM agent INNER JOIN zone_commerciale ON agent.zone_commerciale_id = zone_commerciale.id WHERE zone_commerciale.nom_zone = ?",
//               tpe.ZONE_GP,
//               (error, results, fields) => {
//                 if (error) {
//                   reject(error);
//                 } else {
//                   resolve(results);
//                 }
//               }
//             );
//           });
//           agentPromises.push(promise);
//         }
//       }
  
  
  
//       // Attendre que toutes les promesses sur les agents soient résolues
//       const agentsData = await Promise.all(agentPromises);
  
//       agentsData.forEach(agentData => {
//         const agent = agentData[0]; // Récupérer les données de l'agent
//         const matchingTpe = tpeResults.find(tpeData => tpeData[0].ZONE_GP === agent.nom_zone); // Trouver le TPE correspondant à l'agent
//         if (matchingTpe) {

//           const tpe = matchingTpe[0]; // Récupérer les données du TPE correspondant
  
//           // Construire le message WhatsApp avec la concatenation de POINT_MARCHAND et SERIAL_NUMBER
//           // const message = `Bonjour ${agent.nom_agent}, vous avez un nouveau message concernant votre TPE ${tpe.POINT_MARCHAND} (${tpe.SERIAL_NUMBER}).`;
          
//           // Appeler la fonction pour envoyer le message WhatsApp
//           sendWhatsapp("+225"+agent.numero_telephone_agent, agent.nom_agent, `${tpe.POINT_MARCHAND} - ${tpe.SERIAL_NUMBER}`).then(msg=>{
//             console.log("message whatsapp envoyé")
//           }).catch(err=>{
//             console.log("Erreur"+err)
//           })
//           if(tpe.ZONE_GP == agent.nom_zone){

//             prisma.tpe_livraison.findMany({
//               where : {sn_tpe_livraison : tpe.SERIAL_NUMBER}
//             }).then(results=>{
//               if(results.length){
//                 prisma.tpe_livraison.updateMany({
//                   where : {sn_tpe_livraison : tpe.SERIAL_NUMBER},
//                   data : {
//                     agent_deploiement_tpe_livraison_id : Number(agent.id),
//                     banque_tpe_livraison : results[0].banque_tpe_livraison,
//                     ecobank_tpe_livraison : results[0].ecobank_tpe_livraison,
//                     date_deploiement_tpe_livraison : format.now(),
//                     moov_tpe_livraison : results[0].moov_tpe_livraison,
//                     mtn_tpe_livraison : results[0].mtn_tpe_livraison,
//                     nom_tpe_livraison : results[0].nom_tpe_livraison,
//                     orange_tpe_livraison : results[0].orange_tpe_livraison,
//                     point_marchand_tpe_livraison : results[0].point_marchand_tpe_livraison,
//                     zone_gp_tpe_livraison : results[0].zone_gp_tpe_livraison,
//                     sn_tpe_livraison : results[0].sn_tpe_livraison,
//                     statut_deploiement_tpe_livraison : results[0].statut_deploiement_tpe_livraison,
//                     statut_livraison_dcm_tpe_livraison : "Livré DCM"
//                   }
//                 }).then(checked=>{
//                   if(checked){
//                     console.log("updated")
//                   }else{
//                     console.log("Not updated")
//                   }
//                 }).catch(err=>{
//                   console.log(err)
//                 })
//               }
//             })
//           }
//           // console.log(tpe.ZONE_GP)
//           // console.log(agent.nom_zone)
//         }
//       });  
//       // console.log(agentsData)
//       // console.log(tpeResults)
//       // console.log(livraison.id)
  
  
//       // Envoyer un message à chaque agent avec les TPE associés
  
  
//       return res.json({ message: "Livraison validée avec succès" });
//     }


//   } catch (error) {
//     console.error("Erreur lors de la validation de la livraison :", error);
//     return res
//       .status(500)
//       .json({
//         message:
//           "Une erreur s'est produite lors de la validation de la livraison",
//       });
//   }
// };

// module.exports = {
//   saveLivraison,
//   getAllLivraison,
//   getOneLivraison,
//   saveLivraison,
//   validerLivraison,
// };
