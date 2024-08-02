const uuid = require("uuid");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const format = require("date-format");
const cnx1 = require("../../services/getData/dbConnect")
const cnx2 = require("../../services/getData/dbConnectlocal")
const {calculateDistance} = require("../../services/getData/calculeDistance");
const { generateAndSendPDF } = require("../../services/getData/pdf");
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const { promisify } = require('util');
const convertImageToBase64 = require("../../services/getData/base64");
const { sendWhatsappRouting } = require("../../services/getData/WhatsaapRouting");
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);


// const mysql = require('mysql2/promise');

// const makeRoutine = async (req, res) => {
//     console.log(req.body)
//     // console.log(req.body)
//     try {
//         // console.log(req.body)
//         // Récupération des données de la requête
//         const { commercialId, pointMarchand, veilleConcurrentielle, tpeList, latitudeReel,longitudeReel,routing_id, commentaire_routine  } = req.body;
//         // console.log(pointMarchand);
        
//         // Recherche de l'agent commercial
//         const agent = await prisma.agent.findUnique({
//             where: { id: Number(commercialId) },
//             include: { zone_commerciale: true, bdm : true }
//         });
//         const routing = await prisma.routing.findUnique({
//             where : {id : Number(routing_id)}
//         })
        
//         if (!agent) {
//             return res.status(400).json({ message: "Cet agent n'existe pas dans la base" });
//         }

//         if(!routing){
//             return res.status(400).json({message: "ce routing n'existe pas dans la base"})
//         }

//         // Vérification du point marchand
//         const pointMarchandQuery = `%${pointMarchand}%`;
//         cnx1.conn.query("SELECT * FROM POINT_MARCHAND WHERE POINT_MARCHAND LIKE ?", [pointMarchandQuery], (error, results, fields) => {
//             if (error) {
//                 console.log(error);
//                 return res.status(500).json({ message: "Une erreur s'est produite lors de la recherche du point marchand" });
//             }

//             if (!results.length) {
//                 return res.status(400).json({ message: "Ce point marchand n'existe pas" });
//             }

//             if (results[0].ZONE_GP !== agent.zone_commerciale.nom_zone) {
//                 console.log(results[0].ZONE_GP,agent.zone_commerciale.nom_zone)
//                 // return res.status(400).json({ message: "Vous n'avez pas le droit de visite" });
//                 if(agent.code_authorisation_agent == null){
//                     return res.status(403).json({ message: "Vous n'avez pas le droit de visite" });
//                 }else if(agent.code_authorisation_agent == req.code){
//                     // console.log("OK")
//                 console.log(latitudeReel,longitudeReel,Number(results[0].LATITUDE), Number(results[0].LONGITUDE))
//                 const distance = calculateDistance(latitudeReel,longitudeReel,Number(results[0].LATITUDE), Number(results[0].LONGITUDE))
//                 // console.log(distance)
//                 if(distance > 2){
//                     return res.status(400).json({message : "Vous devez être chez le point marchand pour effectuer la visite"})
//                 }else{
//                     prisma.routine.create({
//                         data: {
//                             date_routine: format.now(),
//                             veille_concurentielle_routine: veilleConcurrentielle,
//                             point_marchand_routine: pointMarchand,
//                             commercial_routine_id: commercialId,
//                             numero_routine: "ROUTINE-" + uuid.v4().toUpperCase(),
//                             latitude_marchand_routine: results[0].LATITUDE,
//                             longitude_marchand_routine: results[0].LONGITUDE,
//                             routing_id : routing_id,
//                             commentaire_routine : commentaire_routine
//                             // Complétez les champs de routine selon les données de la requête
//                         }
//                     }).then(routine => {
//                         // Enregistrement des TPE associés à cette routine
//                         const tpePromises = tpeList.map(async (tpe) => {
//                             const { etatChargeur, etatTpe, problemeBancaire, problemeMobile, idTerminal,descriptionProblemeMobile,descriptionProblemeBancaire, commenttaire_tpe_routine, image_tpe_routine } = tpe;
//                             let imageUrl = await convertImageToBase64(image_tpe_routine,process.env.CLOUDNAME,process.env.API_KEY,process.env.API_SECRET)
//                             const newTpe = await prisma.tpe_routine.create({
//                                 data: {
//                                     etat_chargeur_tpe_routine: etatChargeur,
//                                     etat_tpe_routine: etatTpe,
//                                     probleme_mobile: problemeMobile,
//                                     description_probleme_mobile: descriptionProblemeMobile,
//                                     probleme_bancaire: problemeBancaire,
//                                     description_problemebancaire: descriptionProblemeBancaire,
//                                     id_terminal_tpe_routine: idTerminal,
//                                     routine_id: routine.id,
//                                     commenttaire_tpe_routine : commenttaire_tpe_routine,
//                                     image_tpe_routine : imageUrl
//                                      // Associez le TPE à la routine créée
//                                 }
//                             });
//                             return newTpe;
//                         });
//                         Promise.all(tpePromises).then((tpeResults) => {
//                             if (!tpeResults || tpeResults.some((tpe) => !tpe)) {
//                                 console.log("Erreur lors de l'enregistrement des TPE");
//                                 return res.status(500).json({ message: "Erreur lors de l'enregistrement des TPE" });
//                             }
//                             const agentpdf = {};
//                             const responsable = agent.bdm
//                             routine.tpe_routine = tpeResults;
//                             agentpdf.nom = agent.nom_agent;
//                             agentpdf.email = agent.email_pro_agent;
//                             // console.log(agentpdf)
//                             const tb = [routine]
//                             console.log(tb)
//                             generateAndSendPDF(tb, agent.nom_agent, responsable ).then(() => {
//                                 return res.status(200).json({ message: "Votre visite a bien été enregistrée" });
//                             }).catch((error) => {
//                                 console.log(error);
//                                 return res.status(500).json({ message: "Une erreur s'est produite lors de l'enregistrement des TPE" });
//                             });
//                         }).catch((error) => {
//                             console.log(error);
//                             return res.status(500).json({ message: "Une erreur s'est produite lors de l'enregistrement des TPE" });
//                         });
//                     }).catch((error) => {
//                         console.log(error);
//                         return res.status(500).json({ message: "Une erreur s'est produite lors de la création de la routine" });
//                     });
//                 }
//                 }
//             }
//             // Création de la routine
//         });
//     } catch (error) {
//         console.log(error);
//         return res.status(500).json({ message: "Une erreur s'est produite lors de l'enregistrement de la visite" });
//     }
// };

// const makeRoutine = async (req, res) => {
//     console.log(req.body)

//     try {
//         const { commercialId, pointMarchand, veilleConcurrentielle, tpeList, latitudeReel, longitudeReel, routing_id, commentaire_routine } = req.body;
        
//         const agent = await prisma.agent.findUnique({
//             where: { id: Number(commercialId) },
//             include: { zone_commerciale: true, bdm: true }
//         });

//         const routing = await prisma.routing.findUnique({
//             where: { id: Number(routing_id) }
//         });

//         if (!agent) {
//             return res.status(400).json({ message: "Cet agent n'existe pas dans la base" });
//         }

//         if (!routing) {
//             return res.status(400).json({ message: "Ce routing n'existe pas dans la base" });
//         }else if(routing_id==0){

//         const pointMarchandQuery = `%${pointMarchand}%`;
//         cnx1.conn.query("SELECT * FROM POINT_MARCHAND WHERE POINT_MARCHAND LIKE ?", [pointMarchandQuery], async (error, results, fields) => {
//             if (error) {
//                 console.log(error);
//                 return res.status(500).json({ message: "Une erreur s'est produite lors de la recherche du point marchand" });
//             }

//             if (!results.length) {
//                 return res.status(400).json({ message: "Ce point marchand n'existe pas" });
//             }
//         // console.log(routing)

//                 const distance = calculateDistance(latitudeReel, longitudeReel, Number(results[0].LATITUDE), Number(results[0].LONGITUDE));
//                 if (distance > 10) {
//                     console.log("la distance est de: "+distance)
//                     return res.status(401).json({ message: "Vous devez être chez le point marchand pour effectuer la visite" });
//                 }
//                 let valRoutingId

//                 if(routing_id == ""){
//                     valRoutingId = 0
//                 }else{
//                     valRoutingId = routing.id
//                 }

//                 const routine = await prisma.routine.create({
//                     data: {
//                         date_routine: format.now(),
//                         veille_concurentielle_routine: veilleConcurrentielle,
//                         point_marchand_routine: pointMarchand,
//                         commercial_routine_id: commercialId,
//                         numero_routine: `ROUTINE-${uuid.v4().toUpperCase()}`,
//                         latitude_marchand_routine: results[0].LATITUDE,
//                         longitude_marchand_routine: results[0].LONGITUDE,
//                         routing_id: valRoutingId,
//                         commentaire_routine: commentaire_routine,
                        
//                     }
//                 })
//                 console.log("voici la routine "+routine)
//                 const tpePromises = tpeList.map(async (tpe) => {
//                     const { etatChargeur, etatTpe, problemeBancaire, problemeMobile, idTerminal, descriptionProblemeMobile, descriptionProblemeBancaire, commenttaire_tpe_routine, image_tpe_routine } = tpe;
//                     // console.log("L'image base64 est : "+image_tpe_routine)
//                 let image_url = await convertImageToBase64(image_tpe_routine, process.env.CLOUDNAME, process.env.API_KEY, process.env.API_SECRET)
    
//                    return await prisma.tpe_routine.create({
//                         data: {
//                             etat_chargeur_tpe_routine: etatChargeur,
//                             etat_tpe_routine: etatTpe,
//                             probleme_mobile: problemeMobile,
//                             description_probleme_mobile: descriptionProblemeMobile,
//                             probleme_bancaire: problemeBancaire,
//                             description_problemebancaire: descriptionProblemeBancaire,
//                             id_terminal_tpe_routine: idTerminal,
//                             routine_id: routine.id,
//                             commenttaire_tpe_routine: commenttaire_tpe_routine,
//                             image_tpe_routine: image_url
//                         }
//                     });
//                 });
    
//                 const tpeResults = await Promise.all(tpePromises);
//                 if (!tpeResults || tpeResults.some((tpe) => !tpe)) {
//                     return res.status(500).json({ message: "Erreur lors de l'enregistrement des TPE" });
//                 }
    
//                 const responsable = agent.bdm;
//                 routine.tpe_routine = tpeResults;
    
//                 const tb = [routine];
//                 await generateAndSendPDF(tb, agent, responsable);
//                 return res.status(200).json({ message: "Votre visite a bien été enregistrée" });
//                 }      
//             )}}catch (error) {
//         console.log(error);
//         return res.status(500).json({ message: "Une erreur s'est produite lors de l'enregistrement de la visite" });
//     }
// }
// const makeRoutine = async (req, res) => {
//     console.log(req.body);

//     try {
//         const { commercialId, pointMarchand, veilleConcurrentielle, tpeList, latitudeReel, longitudeReel, routing_id, commentaire_routine } = req.body;

//         const agent = await prisma.agent.findUnique({
//             where: { id: Number(commercialId) },
//             include: { zone_commerciale: true, bdm: true }
//         });

//         if (!agent) {
//             return res.status(400).json({ message: "Cet agent n'existe pas dans la base" });
//         }

//         let routing = null;
//         if (routing_id !== null && routing_id !== "") {
//             routing = await prisma.routing.findUnique({
//                 where: { id: Number(routing_id) }
//             });


//         }else if(routing_id == null && routing_id == ""){
//             routing = await prisma.routing.findUnique({
//                 where : {
//                     description_routing : "ROUTING PAR DEFAUT",agent_routing_id : Number(commercialId)
//                 }
//             })
//         }else{
//                 return res.status(400).json({ message: "Ce routing n'existe pas dans la base" });
//         }

//         const pointMarchandQuery = `%${pointMarchand}%`;
//         cnx1.conn.query("SELECT * FROM POINT_MARCHAND WHERE POINT_MARCHAND LIKE ?", [pointMarchandQuery], async (error, results, fields) => {
//             if (error) {
//                 console.log(error);
//                 return res.status(500).json({ message: "Une erreur s'est produite lors de la recherche du point marchand" });
//             }

//             if (!results.length) {
//                 return res.status(400).json({ message: "Ce point marchand n'existe pas" });
//             }

//             const distance = calculateDistance(latitudeReel, longitudeReel, Number(results[0].LATITUDE), Number(results[0].LONGITUDE));
//             if (distance > 10) {
//                 console.log("la distance est de: " + distance);
//                 return res.status(401).json({ message: "Vous devez être chez le point marchand pour effectuer la visite" });
//             }

//             const valRoutingId = routing ? routing.id : null;

//             const routine = await prisma.routine.create({
//                 data: {
//                     date_routine: format.now(),
//                     veille_concurentielle_routine: veilleConcurrentielle,
//                     point_marchand_routine: pointMarchand,
//                     commercial_routine_id: commercialId,
//                     numero_routine: `ROUTINE-${uuid.v4().toUpperCase()}`,
//                     latitude_marchand_routine: results[0].LATITUDE,
//                     longitude_marchand_routine: results[0].LONGITUDE,
//                     routing_id: valRoutingId,
//                     commentaire_routine: commentaire_routine,
//                 }
//             });

//             console.log("voici la routine " + routine);
//             const tpePromises = tpeList.map(async (tpe) => {
//                 const { etatChargeur, etatTpe, problemeBancaire, problemeMobile, idTerminal, descriptionProblemeMobile, descriptionProblemeBancaire, commenttaire_tpe_routine, image_tpe_routine } = tpe;

//                 let image_url = await convertImageToBase64(image_tpe_routine, process.env.CLOUDNAME, process.env.API_KEY, process.env.API_SECRET);

//                 return await prisma.tpe_routine.create({
//                     data: {
//                         etat_chargeur_tpe_routine: etatChargeur,
//                         etat_tpe_routine: etatTpe,
//                         probleme_mobile: problemeMobile,
//                         description_probleme_mobile: descriptionProblemeMobile,
//                         probleme_bancaire: problemeBancaire,
//                         description_problemebancaire: descriptionProblemeBancaire,
//                         id_terminal_tpe_routine: idTerminal,
//                         routine_id: routine.id,
//                         commenttaire_tpe_routine: commenttaire_tpe_routine,
//                         image_tpe_routine: image_url
//                     }
//                 });
//             });

//             const tpeResults = await Promise.all(tpePromises);
//             if (!tpeResults || tpeResults.some((tpe) => !tpe)) {
//                 return res.status(500).json({ message: "Erreur lors de l'enregistrement des TPE" });
//             }

//             const responsable = agent.bdm;
//             routine.tpe_routine = tpeResults;

//             const tb = [routine];
//             await generateAndSendPDF(tb, agent, responsable);
//             return res.status(200).json({ message: "Votre visite a bien été enregistrée" });
//         });
//     } catch (error) {
//         console.log(error);
//         return res.status(500).json({ message: "Une erreur s'est produite lors de l'enregistrement de la visite" });
//     }
// }

// const makeRoutine = async (req, res) => {
//     // console.log(req.body);

//     try {
//         const { commercialId, pointMarchand, veilleConcurrentielle, tpeList, latitudeReel, longitudeReel, routing_id, commentaire_routine } = req.body;

//         // Validation des entrées
//         if (!commercialId || !pointMarchand || !tpeList || !latitudeReel || !longitudeReel) {
//             return res.status(400).json({ message: "Tous les champs obligatoires doivent être remplis" });
//         }

//         // Vérification de l'agent
//         const agent = await prisma.agent.findUnique({
//             where: { id: Number(commercialId) },
//             include: { zone_commerciale: true, bdm: true }
//         });

//         if (!agent) {
//             return res.status(400).json({ message: "Cet agent n'existe pas dans la base" });
//         }

//         // Vérification du routing
//         console.log(routing_id)

//         let routing
//         if (routing_id !== null) {
//             routing = await prisma.routing.findUnique({
//                 where: { id: Number(routing_id) }
//             });
//             // if (routing) {
//             //     return res.status(400).json({ message: "Ce routing n'existe pas dans la base" });
//             // }
//         } else {
//             routing = await prisma.routing.findUnique({
//                 where: {
//                     description_routing: "ROUTING PAR DEFAUT",
//                     agent_routing_id: Number(commercialId)
//                 }
//             });
//         }

//         // Vérification du point marchand
//         const pointMarchandQuery = `%${pointMarchand}%`;
//         cnx1.conn.query("SELECT * FROM POINT_MARCHAND WHERE POINT_MARCHAND LIKE ?", [pointMarchandQuery], async (error, results) => {
//             if (error) {
//                 console.error(error);
//                 return res.status(500).json({ message: "Une erreur s'est produite lors de la recherche du point marchand" });
//             }

//             if (!results.length) {
//                 return res.status(400).json({ message: "Ce point marchand n'existe pas" });
//             }

//             // Calcul de la distance
//             const distance = calculateDistance(latitudeReel, longitudeReel, Number(results[0].LATITUDE), Number(results[0].LONGITUDE));
//             if (distance > 10) {
//                 console.log("La distance est de: " + distance);
//                 return res.status(401).json({ message: "Vous devez être chez le point marchand pour effectuer la visite" });
//             }
//             // console.log(routing)

//             // Création de la routine
//             const routine = await prisma.routine.create({
//                 data: {
//                     date_routine: format.now(),
//                     veille_concurentielle_routine: veilleConcurrentielle,
//                     point_marchand_routine: pointMarchand,
//                     commercial_routine_id: commercialId,
//                     numero_routine: `ROUTINE-${uuid.v4().toUpperCase()}`,
//                     latitude_marchand_routine: results[0].LATITUDE,
//                     longitude_marchand_routine: results[0].LONGITUDE,
//                     routing_id: routing.id,
//                     commentaire_routine: commentaire_routine,
//                 }
//             });

//             console.log("Voici la routine: " + routine);

//             // Création des TPEs associées
//             const tpePromises = tpeList.map(async (tpe) => {
//                 const { etatChargeur, etatTpe, problemeBancaire, problemeMobile, idTerminal, descriptionProblemeMobile, descriptionProblemeBancaire, commenttaire_tpe_routine, image_tpe_routine } = tpe;

//                 // Conversion de l'image en base64
//                 const image_url = await convertImageToBase64(image_tpe_routine, process.env.CLOUDNAME, process.env.API_KEY, process.env.API_SECRET);

//                 return prisma.tpe_routine.create({
//                     data: {
//                         etat_chargeur_tpe_routine: etatChargeur,
//                         etat_tpe_routine: etatTpe,
//                         probleme_mobile: problemeMobile,
//                         description_probleme_mobile: descriptionProblemeMobile,
//                         probleme_bancaire: problemeBancaire,
//                         description_problemebancaire: descriptionProblemeBancaire,
//                         id_terminal_tpe_routine: idTerminal,
//                         routine_id: routine.id,
//                         commenttaire_tpe_routine: commenttaire_tpe_routine,
//                         image_tpe_routine: image_url
//                     }
//                 });
//             });

//             const tpeResults = await Promise.all(tpePromises);
//             if (tpeResults.some(tpe => !tpe)) {
//                 return res.status(500).json({ message: "Erreur lors de l'enregistrement des TPE" });
//             }

//             const responsable = agent.bdm;
//             routine.tpe_routine = tpeResults;

//             // Génération et envoi du PDF
//             await generateAndSendPDF([routine], agent, responsable);
//             return res.status(200).json({ message: "Votre visite a bien été enregistrée" });
//         });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ message: "Une erreur s'est produite lors de l'enregistrement de la visite" });
//     }
// };

const makeRoutine = async (req, res) => {
    console.log(typeof req.body.routing_id)
    try {
        const { commercialId, pointMarchand, veilleConcurrentielle, tpeList, latitudeReel, longitudeReel, routing_id, commentaire_routine } = req.body;

        if (!commercialId || !pointMarchand || !tpeList || !latitudeReel || !longitudeReel) {
            return res.status(400).json({ message: "Tous les champs obligatoires doivent être remplis" });
        }

        const agent = await prisma.agent.findUnique({
            where: { id: Number(commercialId) },
            include: { zone_commerciale: true, bdm: true }
        });

        if (!agent) {
            return res.status(400).json({ message: "Cet agent n'existe pas dans la base" });
        }

        let routing;
        if (typeof routing_id === "number") {
            routing = await prisma.routing.findUnique({
                where: { id: Number(routing_id) }
            });
        } else if (typeof routing_id === "string") {
            routing = await prisma.routing.findFirst({
                where: {
                    AND: [
                        { description_routing: "ROUTING PAR DEFAUT" },
                    ]
                }
            });
        }
        
        
        console.log(routing)
        const pointMarchandQuery = `%${pointMarchand}%`;
        const results = await new Promise((resolve, reject) => {
            cnx1.conn.query("SELECT * FROM POINT_MARCHAND WHERE POINT_MARCHAND LIKE ?", [pointMarchandQuery], (error, results) => {
                if (error) return reject(error);
                resolve(results);
            });
        });

        if (!results.length) {
            return res.status(400).json({ message: "Ce point marchand n'existe pas" });
        }

        const distance = calculateDistance(latitudeReel, longitudeReel, Number(results[0].LATITUDE), Number(results[0].LONGITUDE));
        if (distance > 10) {
            return res.status(401).json({ message: "Vous devez être chez le point marchand pour effectuer la visite" });
        }

        const routine = await prisma.routine.create({
            data: {
                date_routine: new Date(),  // Assuming current date, format.now() is undefined
                veille_concurentielle_routine: veilleConcurrentielle,
                point_marchand_routine: pointMarchand,
                commercial_routine_id: commercialId,
                numero_routine: `ROUTINE-${uuid.v4().toUpperCase()}`,
                latitude_marchand_routine: results[0].LATITUDE,
                longitude_marchand_routine: results[0].LONGITUDE,
                routing_id: Number(routing.id),
                commentaire_routine: commentaire_routine,
            }
        });

        const tpePromises = tpeList.map(async (tpe) => {
            const { etatChargeur, etatTpe, problemeBancaire, problemeMobile, idTerminal, descriptionProblemeMobile, descriptionProblemeBancaire, commenttaire_tpe_routine, image_tpe_routine } = tpe;

            const image_url = await convertImageToBase64(image_tpe_routine, process.env.CLOUDNAME, process.env.API_KEY, process.env.API_SECRET);

            return prisma.tpe_routine.create({
                data: {
                    etat_chargeur_tpe_routine: etatChargeur,
                    etat_tpe_routine: etatTpe,
                    probleme_mobile: problemeMobile,
                    description_probleme_mobile: descriptionProblemeMobile,
                    probleme_bancaire: problemeBancaire,
                    description_problemebancaire: descriptionProblemeBancaire,
                    id_terminal_tpe_routine: idTerminal,
                    routine_id: routine.id,
                    commenttaire_tpe_routine: commenttaire_tpe_routine,
                    image_tpe_routine: image_url
                }
            });
        });

        const tpeResults = await Promise.all(tpePromises);
        if (tpeResults.some(tpe => !tpe)) {
            return res.status(500).json({ message: "Erreur lors de l'enregistrement des TPE" });
        }

        const responsable = agent.bdm;
        routine.tpe_routine = tpeResults;

        await generateAndSendPDF([routine], agent, responsable);
        return res.status(200).json({ message: "Votre visite a bien été enregistrée" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Une erreur s'est produite lors de l'enregistrement de la visite" });
    }
};



const getRoutine = async(req,res)=>{
     prisma.routine.findMany({
        include:{
            tpe_routine : true
        }
     }).then(results=>{
        if(results.length){
            return res.status(200).json(results)
        }else{
            return res.status(400).json({message : "Aucune routine trouvée"})
        }
     }).catch(err=>{
        console.log(err)
     })
}

const getRoutineByCommercial = async(req,res)=>{
    console.log(req.body)
    const agentId = req.body.agentId;
    prisma.agent.findUnique({
        where : {
            id : Number(agentId)
        }
    }).then(agent=>{
        if(agent){
            prisma.routine.findMany({
                where : {commercial_routine_id : Number(agentId)},
                include : {
                    tpe_routine : true
                }
            }).then(routine=>{
                if(routine.length){
                    return res.status(200).json(routine)
                }else{
                    return res.status(400).json({message : "Vous n'avez pas de routine"})
                }
            }).catch(err=>{
                console.log(err)
            })
        }else{
            return res.status(400).json({message : "Ce commercial n'existe pas"})
        }
    }).catch(err=>{
        console.log(err)
    })

}

const getSnBypointMarchand = async(req,res)=>{
    const pointMarchand = req.body.pointMarchand;

    cnx1.conn.query("SELECT SERIAL_NUMBER FROM TPE INNER JOIN POINT_MARCHAND ON TPE.POINT_MARCHAND = POINT_MARCHAND.POINT_MARCHAND WHERE TPE.POINT_MARCHAND LIKE ?", [pointMarchand], (error, results, fields) => {
        if (error) {
            console.log(error);
            return res.status(500).json({ message: "Une erreur s'est produite lors de la recherche des TPE" });
        }

        if (!results.length) {
            return res.status(400).json({ message: "Aucun TPE trouvé pour ce point marchand" });
        }

        return res.status(200).json(results);
    });
    
}


const generateAuthCode = async(req,res)=>{
    const {agentID,respoId} = req.body;

    prisma.agent.findUnique({
        where : {
            id : Number(agentID)
        }
    }).then(agent=>{
        if(agent){
            prisma.bdm.findUnique({
                where : {
                    id : Number(respoId)
                }
            }).then(respo=>{
                if(respo){
                    const code = Math.floor(1000 + Math.random() * 9000);
                    
                    prisma.agent.update({
                        where : {
                            id : Number(agentID)
                        },
                        data : {
                            code_authorisation_agent : code.toString()
                        }
                    }).then(agent=>{
                        if(agent){
                            return res.status(200).json({message : "Code généré avec succès"})
                        }
                    }).catch(err=>{
                        console.log(err)
                    })
                }else{
                    return res.status(400).json({message : "Ce responsable n'existe pas"})
                }
            }).catch(err=>{
                console.log(err)
            })
        }else{
            return res.status(400).json({message : "Cet agent n'existe pas"})
        }
    }).catch(err=>{
        console.log(err)
    })
}

const validateAuthCode = async(req,res)=>{
    const {agentID,code} = req.body;

    prisma.agent.findUnique({
        where : {
            id : Number(agentID)
        }
    }).then(agent=>{
        if(agent){
            if(agent.code_authorisation_agent == code){
                return res.status(200).json({message : "Code validé"})
            }else{
                return res.status(400).json({message : "Code invalide"})
            }
        }else{
            return res.status(400).json({message : "Cet agent n'existe pas"})
        }
    }).catch(err=>{
        console.log(err)
    })

}


const createRouting = async(req,res)=>{



    const bdmId = req.body.bdm;
    const agentId = req.body.agent;
    const description_routing = req.body.description_routing;
    const date_debut_routing = req.body.date_debut_routing;
    const date_fin_routing = req.body.date_fin_routing;
    const pm_routing = req.body.pm_routing;

    if(!bdmId || !agentId || !description_routing || !date_debut_routing || !date_fin_routing || !pm_routing){
        return res.status(400).json({message : "Veuillez remplir tous les champs"})
    }else if(date_debut_routing > date_fin_routing){
        return res.status(400).json({message : "La date de fin doit être supérieure à la date de début"})
    }else if(date_debut_routing < format.now()){
        return res.status(400).json({message : "La date de début doit être supérieure à la date actuelle"})
    }else if(date_fin_routing < format.now()){
        return res.status(400).json({message : "La date de fin doit être supérieure à la date actuelle"})
    }else{
        await prisma.bdm.findMany({
            where : {id : Number(bdmId)}
        }).then(bdm=>{
            if(bdm.length){
                prisma.agent.findMany({
                    where : {id: Number(agentId)}
                }).then(agent=>{
                    if(agent.length){
                        prisma.routing.create({
                            data : {
                                date_debut_routing : new Date(date_debut_routing),
                                date_fin_routing : new Date(date_fin_routing),
                                description_routing : description_routing,
                                pm_routing : JSON.stringify(pm_routing),
                                agent : {connect : {id : Number(agentId)}},
                                bdm: {connect : {id : Number(bdmId)}}                               
                            }
                        }).then(routing=>{
                            if(routing){
                                 prisma.agent.findMany({
                                    where : {id : Number(agentId)}
                                }).then(agentwha=>{
                                    if(agentwha.length){
                                        sendWhatsappRouting("+225"+agentwha[0].numero_telephone_agent, `${agentwha[0].nom_agent} ${agentwha[0].prenom_agent}`, pm_routing, `${bdm[0].nom_bdm} ${bdm[0].prenom_bdm}`).then(msg=>{
                                            if(msg){
                                                console.log("OK")
                                            }else{
                                                console.log("NON OK")
                                            }
                                          }).catch(err=>{
                                            console.log("Erreur"+err)
                                          })
                                        return res.status(200).json({message : "Routing créé avec succès"})
                                    }else{
                                        console.log("RAMBA")
                                    }
                                }).catch(err=>{
                                    console.log(err)
                                })
                                
                            }else{
                                return res.status(400).json({message : "Une erreur s'est produite lors de la création du routing"})
                            }
                        }).catch(err=>{
                            console.log(err)
                        })
                    }
                }).catch(err=>{
                    console.log(err)
                })
            }else{
                return res.status(400).json({message : "Ce responsable n'existe pas"})
            
            }
        }).catch(err=>{
            console.log(err)
        })
    }

 

}


const getRoutingByCommercial = async (req,res)=>{

    const commercialId = req.body.agentId
    
    await prisma.agent.findMany({
        where : {id : Number(commercialId)}
    }).then(commercial=>{
        if(commercial.length){
            prisma.routing.findMany({
                where : {agent_routing_id : Number(commercialId)}
            }).then(routing=>{
                if(routing.length){
                    return res.status(200).json(routing)
                }else{
                    return res.status(400).json({message : "Vous n'avez pas de routing"})
                }
            }).catch(err=>{
                console.log(err)
            })
        }else{
            return res.status(400).json({message : "cet agent n'existe pas"})
        }
    }
).catch(err=>{
    console.log(err)
})
}


const importBase64File = async (req, res) => {
    // Configure Cloudinary
    cloudinary.config({
        cloud_name : process.env.CLOUDNAME,
        api_key : "771994422841589",
        api_secret : "jacz7dPJsL89IUi38iBDzfvpXVg"
    })

    try {
        // Vérification de l'image dans le corps de la requête
        if (!req.body.image) {
            return res.status(400).json({ error: 'No image provided' });
        }

        // Récupérer l'image en base64 depuis le corps de la requête
        const base64Image = req.body.image;

        // Convertir la base64 en un fichier temporaire
        const imagePath = './temp-image.jpg';
        const imageBuffer = Buffer.from(base64Image, 'base64');
        await writeFile(imagePath, imageBuffer);

        // Envoyer l'image à Cloudinary
        const cloudinaryResponse = await cloudinary.uploader.upload(imagePath);

        // Supprimer le fichier temporaire
        await unlink(imagePath);

        // Renvoyer l'URL de l'image à l'application Flutter
        res.status(200).json({ imageUrl: cloudinaryResponse.secure_url });
    } catch (err) {
        console.error('Erreur lors de l\'envoi de l\'image à Cloudinary :', err);
        res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'image' });
    }
};


const getAllRoutingsByBdm = async(req,res)=>{
    const bdmId = req.body.bdmId
    console.log(bdmId)
  await  prisma.bdm.findMany({
        where : {id : Number(bdmId)}
    }).then(bdm=>{
        if(bdm.length){
            prisma.routing.findMany({
                where : {
                    bdm_routing_id : Number(bdmId)
                },
                include: {
                    agent : true
                }
            }).then(routing=>{
                if(routing.length){
                    return res.status(200).json(routing)
                }else{
                    return res.status(400).json({message : "Vous n'avez aucun routing"})
                }
            }).catch(err=>{
                console.log(err)
            })
        }else{
            return res.status(400).json({message : "Ce BDM n'existe pas"})
        }
    }).catch(err=>{
        console.log(err)
    })
}

const getMyAgents = async(req,res)=>{

    const bdmId = req.body.bdmId

    prisma.bdm.findMany({
        where : {id : Number(bdmId)}
    }).then(bdm=>{
        if(bdm.length){
            prisma.agent.findMany({
                where : {responsable_agent_id : Number(bdmId)}
            }).then(agent=>{
                if(agent.length){
                    return res.status(200).json(agent)
                }else{
                    return res.status(400).json({message : "Vous n'avez pas encore d'agent commercial"})
                }
            }).catch(err=>console.log(err))
        }else{
            return res.status(400).json({message :"Ce BDM n'existe pas"})
        }
    }).catch(err=>console.log(err))
}

const getPms = (req, res) => {
    cnx1.conn.query("SELECT * FROM POINT_MARCHAND", (error, results) => {
        if (error) {
            console.error("Erreur lors de la récupération des points marchands:", error);
            return res.status(500).json({ message: "Erreur serveur" });
        }

        if (results.length > 0) {
            return res.status(200).json(results);
        } else {
            return res.status(404).json({ message: "Aucun point marchand trouvé" });
        }
    });
};


const getAllRoutinesByBdm = (req, res) => {
    const bdmId = Number(req.body.bdmId);  // Assurez-vous que bdmId est passé comme paramètre de la requête
    console.log(bdmId)
    if (!bdmId) {
        return res.status(400).json({ message: "bdmId est requis" });
    }

    cnx2.conn.query(`
        SELECT nom_agent,prenom_agent,point_marchand_routine,date_routine,veille_concurentielle_routine,commentaire_routine,id_terminal_tpe_routine,etat_tpe_routine,etat_chargeur_tpe_routine,probleme_bancaire,description_problemebancaire,probleme_mobile,description_probleme_mobile,commenttaire_tpe_routine,image_tpe_routine FROM routine INNER JOIN routing ON routine.routing_id = routing.id JOIN bdm JOIN tpe_routine ON tpe_routine.routine_id = routing.id JOIN agent ON agent.id =routine.commercial_routine_id WHERE bdm.id =?`, 
        [bdmId], 
        (error, rows) => {
            if (error) {
                console.error("Erreur lors de la récupération des données:", error);
                return res.status(500).json({ message: "Erreur serveur" });
            }

            if (rows.length > 0) {
                return res.status(200).json(rows);
            } else {
                return res.status(404).json({ message: "Aucune donnée trouvée pour cet ID BDM" });
            }
        }
    );
};


module.exports = { makeRoutine , getRoutine, getRoutineByCommercial, getSnBypointMarchand , generateAuthCode , validateAuthCode , createRouting ,getRoutingByCommercial, importBase64File, getAllRoutingsByBdm, getMyAgents, getPms, getAllRoutinesByBdm};


