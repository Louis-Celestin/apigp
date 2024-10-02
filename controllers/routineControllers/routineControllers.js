const uuid = require("uuid");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const format = require("date-format");
const {calculateDistance} = require("../../services/getData/calculeDistance");
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const { promisify } = require('util');
const convertImageToBase64 = require("../../services/getData/base64");
const { sendWhatsappRouting } = require("../../services/getData/WhatsaapRouting");
const  pool1  = require("../../services/getData/dbConnectPowerBi");
const pool2 = require("../../services/getData/dbConnectAlwaysdata");
const { sendNotification } = require("../../services/getData/sendNotification");
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);






// const makeRoutine = async (req, res) => {
//     try {
//         const { commercialId, pointMarchand, veilleConcurrentielle, tpeList, latitudeReel, longitudeReel, routing_id, commentaire_routine } = req.body;

//         if (!commercialId || !pointMarchand || !tpeList || !latitudeReel || !longitudeReel) {
//             return res.status(400).json({ message: "Tous les champs obligatoires doivent être remplis h" });
//         }

//         const agent = await prisma.agent.findUnique({
//             where: { id: Number(commercialId) },
//             include: {bdm_bdm_agent_bdm_idToagent : true}
//         });

//         if (!agent) {
//             return res.status(400).json({ message: "Cet agent n'existe pas dans la base" });
//         }

//         let routing;
//         if (typeof routing_id === "number") {
//             routing = await prisma.routing.findUnique({
//                 where: { id: Number(routing_id) }
//             });
//         } else if (typeof routing_id === "string") {
//             routing = await prisma.routing.findFirst({
//                 where: {
//                     AND: [
//                         { description_routing: "ROUTING PAR DEFAUT" },
//                     ]
//                 }
//             });
//         }
        
        
//         // console.log(routing)
//         const pointMarchandQuery = `%${pointMarchand}%`;
//         const results = await new Promise((resolve, reject) => {
//             cnx3.conn.query("SELECT * FROM pm WHERE nom_pm LIKE ?", [pointMarchandQuery], (error, results) => {
//                 if (error) return reject(error);
//                 resolve(results);
//             });
//         });

//         if (!results.length) {
//             return res.status(400).json({ message: "Ce point marchand n'existe pas" });
//         }

//         const distance = calculateDistance(latitudeReel, longitudeReel, Number(results[0].latitude_pm), Number(results[0].longitude_pm));
//         if (distance > 5) {
//             return res.status(401).json({ message: "Vous devez être chez le point marchand pour effectuer la visite" });
//         }

//         const routine = await prisma.routine.create({
//             data: {
//                 date_routine: new Date(),  // Assuming current date, format.now() is undefined
//                 veille_concurentielle_routine: veilleConcurrentielle,
//                 point_marchand_routine: pointMarchand,
//                 commercial_routine_id: commercialId,
//                 numero_routine: `ROUTINE-${uuid.v4().toUpperCase()}`,
//                 latitude_marchand_routine: results[0].latitude_pm,
//                 longitude_marchand_routine: results[0].longitude_pm,
//                 routing_id: Number(routing.id),
//                 commentaire_routine: commentaire_routine,
//             }
//         });

//         const tpePromises = tpeList.map(async (tpe) => {
//             const { etatChargeur, etatTpe, problemeBancaire, problemeMobile, idTerminal, descriptionProblemeMobile, descriptionProblemeBancaire, commenttaire_tpe_routine, image_tpe_routine } = tpe;

//             const image_url = await convertImageToBase64(image_tpe_routine, process.env.CLOUDNAME, process.env.API_KEY, process.env.API_SECRET);

//             return prisma.tpe_routine.create({
//                 data: {
//                     etat_chargeur_tpe_routine: etatChargeur,
//                     etat_tpe_routine: etatTpe,
//                     probleme_mobile: problemeMobile,
//                     description_probleme_mobile: descriptionProblemeMobile,
//                     probleme_bancaire: problemeBancaire,
//                     description_problemebancaire: descriptionProblemeBancaire,
//                     id_terminal_tpe_routine: idTerminal,
//                     routine_id: routine.id,
//                     commenttaire_tpe_routine: commenttaire_tpe_routine,
//                     image_tpe_routine: image_url
//                 }
//             });
//         });

//         const tpeResults = await Promise.all(tpePromises);
//         if (tpeResults.some(tpe => !tpe)) {
//             return res.status(500).json({ message: "Erreur lors de l'enregistrement des TPE" });
//         }

//         // const responsable = agent.bdm;
//         // routine.tpe_routine = tpeResults;
//         // await generateAndSendPDF([routine], agent, responsable);
//         return res.status(200).json({ message: "Votre visite a bien été enregistrée" });

//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ message: "Une erreur s'est produite lors de l'enregistrement de la visite" });
//     }
// };


// const makeRoutine = async (req, res) => {
//     try {
//         const { commercialId, pointMarchand, veilleConcurrentielle, tpeList, latitudeReel, longitudeReel, routing_id, commentaire_routine } = req.body;

//         // Validation des champs requis
//         if (!commercialId || !pointMarchand || !tpeList || !latitudeReel || !longitudeReel) {
//             return res.status(400).json({ message: "Tous les champs obligatoires doivent être remplis" });
//         }

//         // Vérification de l'existence de l'agent
//         const agent = await prisma.agent.findUnique({
//             where: { id: Number(commercialId) },
//             include: { bdm_bdm_agent_bdm_idToagent: true }
//         });

//         if (!agent) {
//             return res.status(400).json({ message: "Cet agent n'existe pas dans la base" });
//         }

//         // Vérification du routing
//         let routing;
//         if (typeof routing_id === "number") {
//             routing = await prisma.routing.findUnique({
//                 where: { id: Number(routing_id) }
//             });
//         } else if (typeof routing_id === "string") {
//             routing = await prisma.routing.findFirst({
//                 where: {
//                     AND: [
//                         { description_routing: "ROUTING PAR DEFAUT" }
//                     ]
//                 }
//             });
//         }

//         // Recherche du point marchand dans la base de données
//         const pointMarchandQuery = `%${pointMarchand}%`;
//         const [results] = await pool2.query(
//             "SELECT * FROM pm WHERE nom_pm LIKE ?", 
//             [pointMarchandQuery]
//         );

//         if (results.length === 0) {
//             return res.status(400).json({ message: "Ce point marchand n'existe pas" });
//         }

//         // Calcul de la distance et validation
//         const distance = calculateDistance(latitudeReel, longitudeReel, Number(results[0].latitude_pm), Number(results[0].longitude_pm));
//         if (distance > 5) {
//             return res.status(401).json({ message: "Vous devez être chez le point marchand pour effectuer la visite" });
//         }

//         // Création de la routine
//         const routine = await prisma.routine.create({
//             data: {
//                 date_routine: new Date(),
//                 veille_concurentielle_routine: veilleConcurrentielle,
//                 point_marchand_routine: pointMarchand,
//                 commercial_routine_id: commercialId,
//                 numero_routine: `ROUTINE-${uuid().toUpperCase()}`,
//                 latitude_marchand_routine: results[0].latitude_pm,
//                 longitude_marchand_routine: results[0].longitude_pm,
//                 routing_id: Number(routing.id),
//                 commentaire_routine: commentaire_routine
//             }
//         });

//         // Traitement des TPE
//         const tpePromises = tpeList.map(async (tpe) => {
//             const { etatChargeur, etatTpe, problemeBancaire, problemeMobile, idTerminal, descriptionProblemeMobile, descriptionProblemeBancaire, commenttaire_tpe_routine, image_tpe_routine } = tpe;

//             const image_url = await convertImageToBase64(image_tpe_routine, process.env.CLOUDNAME, process.env.API_KEY, process.env.API_SECRET);

//             return prisma.tpe_routine.create({
//                 data: {
//                     etat_chargeur_tpe_routine: etatChargeur,
//                     etat_tpe_routine: etatTpe,
//                     probleme_mobile: problemeMobile,
//                     description_probleme_mobile: descriptionProblemeMobile,
//                     probleme_bancaire: problemeBancaire,
//                     description_problemebancaire: descriptionProblemeBancaire,
//                     id_terminal_tpe_routine: idTerminal,
//                     routine_id: routine.id,
//                     commenttaire_tpe_routine: commenttaire_tpe_routine,
//                     image_tpe_routine: image_url
//                 }
//             });
//         });

//         const tpeResults = await Promise.all(tpePromises);
//         if (tpeResults.some(tpe => !tpe)) {
//             return res.status(500).json({ message: "Erreur lors de l'enregistrement des TPE" });
//         }

//         // Réponse en cas de succès
//         return res.status(200).json({ message: "Votre visite a bien été enregistrée" });

//     } catch (error) {
//         console.error("Erreur lors de l'enregistrement de la visite:", error);
//         return res.status(500).json({ message: "Une erreur s'est produite lors de l'enregistrement de la visite" });
//     }
// };



// const makeRoutine = async (req, res) => {
//     try {
//         const { commercialId, pointMarchand, veilleConcurrentielle, tpeList, latitudeReel, longitudeReel, routing_id, commentaire_routine } = req.body;

//         // Validation des champs requis
//         if (!commercialId || !pointMarchand || !tpeList || !latitudeReel || !longitudeReel) {
//             return res.status(400).json({ message: "Tous les champs obligatoires doivent être remplis" });
//         }

//         // Vérification de l'existence de l'agent
//         const agent = await prisma.agent.findUnique({
//             where: { id: Number(commercialId) },
//             include: { bdm_bdm_agent_bdm_idToagent: true }
//         });

//         if (!agent) {
//             return res.status(400).json({ message: "Cet agent n'existe pas dans la base" });
//         }

//         // Vérification du routing
//         let routing;
//         if (typeof routing_id === "number") {
//             routing = await prisma.routing.findUnique({
//                 where: { id: Number(routing_id) }
//             });
//         } else if (typeof routing_id === "string") {
//             routing = await prisma.routing.findFirst({
//                 where: {
//                     AND: [
//                         { description_routing: "ROUTING PAR DEFAUT" }
//                     ]
//                 }
//             });
//         }
        
//         // Recherche du point marchand dans la base de données
//         console.log(pointMarchand)
//         const pointMarchandQuery = `%${pointMarchand}%`;
//         const [results] = await pool2.query(
//             "SELECT * FROM pm WHERE nom_pm LIKE ?", 
//             [pointMarchandQuery]
//         );

//         console.log(results)

//         if (results.length === 0) {
//             return res.status(400).json({ message: "Ce point marchand n'existe pas" });
//         }

//         // Calcul de la distance et validation
//         const distance = calculateDistance(latitudeReel, longitudeReel, Number(results[0].latitude_pm), Number(results[0].longitude_pm));
//         if (distance > 5) {
//             return res.status(401).json({ message: "Vous devez être chez le point marchand pour effectuer la visite" });
//         }

//         // Transaction pour garantir l'atomicité
//         const routine = await prisma.$transaction(async (prisma) => {
//             // Création de la routine
//             const routine = await prisma.routine.create({
//                 data: {
//                     date_routine: new Date(),
//                     veille_concurentielle_routine: veilleConcurrentielle,
//                     point_marchand_routine: pointMarchand,
//                     commercial_routine_id: commercialId,
//                     numero_routine: `ROUTINE-${uuid.v4().toUpperCase()}`,
//                     latitude_marchand_routine: results[0].latitude_pm,
//                     longitude_marchand_routine: results[0].longitude_pm,
//                     routing_id: Number(routing.id),
//                     commentaire_routine: commentaire_routine
//                 }
//             });

//             // Traitement des TPE
//             const tpePromises = tpeList.map(async (tpe) => {
//                 const { etatChargeur, etatTpe, problemeBancaire, problemeMobile, idTerminal, descriptionProblemeMobile, descriptionProblemeBancaire, commenttaire_tpe_routine, image_tpe_routine } = tpe;

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
//                 throw new Error("Erreur lors de l'enregistrement des TPE");
//             }

//             return routine;
//         });

//         // Réponse en cas de succès
//         return res.status(200).json({routine, message: "Votre visite a bien été enregistrée" });

//     } catch (error) {
//         console.error("Erreur lors de l'enregistrement de la visite:", error);
//         return res.status(500).json({ message: "Une erreur s'est produite lors de l'enregistrement de la visite" });
//     }
// };

const makeRoutine = async (req, res) => {
    try {
        const { commercialId, pointMarchand, veilleConcurrentielle, tpeList, latitudeReel, longitudeReel, routing_id, commentaire_routine } = req.body;

        // Validation des champs requis
        if (!commercialId || !pointMarchand || !tpeList || !latitudeReel || !longitudeReel) {
            return res.status(400).json({ message: "Tous les champs obligatoires doivent être remplis" });
        }

        // Vérification de l'existence de l'agent
        const agent = await prisma.agent.findUnique({
            where: { id: Number(commercialId) },
            include: { bdm_bdm_agent_bdm_idToagent: true }
        });

        if (!agent) {
            return res.status(400).json({ message: "Cet agent n'existe pas dans la base" });
        }

        // Vérification du routing
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
                        {agent_routing_id : Number(commercialId)}
                    ]
                }
            });
        }

        console.log(`Voici le routing trouvé ${routing.description_routing} avec le ID ${routing.id}`)
        // Recherche du point marchand dans la base de données avec tentatives de reconnexion
        const pointMarchandQuery = `%${pointMarchand}%`;
        let retries = 3;
        let results;

        while (retries > 0) {
            try {
                [results] = await pool2.query(
                    "SELECT * FROM pm WHERE nom_pm LIKE ?", 
                    [pointMarchandQuery]
                );

                if (results.length > 0) {
                    break; // Sortir de la boucle si la requête réussit
                } else {
                    return res.status(400).json({ message: "Ce point marchand n'existe pas" });
                }
            } catch (error) {
                if (error.code === 'ECONNRESET') {
                    console.warn('Connexion réinitialisée, tentative de reconnexion...');
                    retries--;
                    if (retries === 0) {
                        throw new Error('Impossible de récupérer les données après plusieurs tentatives');
                    }
                } else {
                    throw error;
                }
            }
        }

        // Calcul de la distance et validation
        const distance = calculateDistance(latitudeReel, longitudeReel, Number(results[0].latitude_pm), Number(results[0].longitude_pm));
        if (distance > 5) {
            return res.status(401).json({ message: "Vous devez être chez le point marchand pour effectuer la visite" });
        }

        // Transaction pour garantir l'atomicité
        const routine = await prisma.$transaction(async (prisma) => {
            // Création de la routine
            const routine = await prisma.routine.create({
                data: {
                    date_routine: new Date(),
                    veille_concurentielle_routine: veilleConcurrentielle,
                    point_marchand_routine: pointMarchand,
                    commercial_routine_id: commercialId,
                    numero_routine: `ROUTINE-${uuid.v4().toUpperCase()}`,
                    latitude_marchand_routine: results[0].latitude_pm,
                    longitude_marchand_routine: results[0].longitude_pm,
                    routing_id: Number(routing.id),
                    commentaire_routine: commentaire_routine
                }
            });

            // Traitement des TPE
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
                throw new Error("Erreur lors de l'enregistrement des TPE");
            }

            return routine;
        });

        // Réponse en cas de succès
        return res.status(200).json({routine, message: "Votre visite a bien été enregistrée" });

    } catch (error) {
        console.error("Erreur lors de l'enregistrement de la visite:", error);
        return res.status(500).json({ message: "Une erreur s'est produite lors de l'enregistrement de la visite" });
    }
};


const getRoutine = async(req,res)=>{
    await prisma.routine.findMany({
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
   await prisma.agent.findUnique({
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
                    return res.status(401).json({message : "Vous n'avez pas de routine"})
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

// const getSnBypointMarchand = async (req, res) => {
//     const pointMarchand = req.body.pointMarchand;

//     try {
//         const [results] = await pool1.query(
//             "SELECT SERIAL_NUMBER FROM TPE INNER JOIN POINT_MARCHAND ON TPE.POINT_MARCHAND = POINT_MARCHAND.POINT_MARCHAND WHERE TPE.POINT_MARCHAND LIKE ?",
//             [pointMarchand]
//         );

//         if (results.length > 0) {
//             return res.status(200).json(results);
//         } else {
//             return res.status(400).json({ message: "Aucun TPE trouvé pour ce point marchand" });
//         }
//     } catch (error) {
//         console.log(error);
//         return res.status(500).json({ message: "Une erreur s'est produite lors de la recherche des TPE" });
//     }
// };

const getSnBypointMarchand = async (req, res) => {
    const pointMarchand = req.body.pointMarchand;
    let retries = 3;

    while (retries > 0) {
        try {
            const [results] = await pool1.query(
                "SELECT SERIAL_NUMBER FROM TPE INNER JOIN POINT_MARCHAND ON TPE.POINT_MARCHAND = POINT_MARCHAND.POINT_MARCHAND WHERE TPE.POINT_MARCHAND LIKE ?",
                [pointMarchand]
            );

            if (results.length > 0) {
                return res.status(200).json(results);
            } else {
                return res.status(401).json({ message: "Aucun TPE trouvé pour ce point marchand" });
            }
        } catch (error) {
            if (error.code === 'ECONNRESET') {
                console.warn('Connexion réinitialisée, tentative de reconnexion...');
                retries--;
                if (retries === 0) {
                    console.error('Impossible de récupérer les données après plusieurs tentatives');
                    return res.status(500).json({ message: "Erreur lors de la récupération des données" });
                }
            } else {
                console.error("Erreur lors de la recherche des TPE:", error);
                return res.status(500).json({ message: "Une erreur s'est produite lors de la recherche des TPE" });
            }
        }
    }
};


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
                                bdm: {connect : {id : Number(bdmId)}}  ,
                                created_at : new Date()                             
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
                                          try {
                                             prisma.users.findMany({
                                                where:{agent_user_id : Number(agentwha[0].id)}
                                              }).then((userNotif)=>{
                                                sendNotification(userNotif[0].fcm_token_user,`${agentwha[0].nom_agent} ${agentwha[0].prenom_agent}`,pm_routing,`${bdm[0].nom_bdm} ${bdm[0].prenom_bdm}`).then((sent)=>{
                                                    if(sent.length){
                                                        console.log("Notif envoyée")
                                                    }else{
                                                        console.log('Notif non envoyée')
                                                    }
                                                })
                                              })
                                              
                                          } catch (error) {
                                            console.log(error)
                                          }
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
                    return res.status(401).json({message : "Vous n'avez pas de routing"})
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

// const getPms = async (req, res) => {
//     try {
//         const [results] = await pool1.query("SELECT * FROM POINT_MARCHAND");

//         if (results.length > 0) {
//             return res.status(200).json(results);
//         } else {
//             return res.status(404).json({ message: "Aucun point marchand trouvé" });
//         }
//     } catch (error) {
//         console.error("Erreur lors de la récupération des points marchands:", error);
//         return res.status(500).json({ message: "Erreur serveur" });
//     }
// };


// const getAllRoutinesByBdm = async (req, res) => {
//     const bdmId = Number(req.body.bdmId);  // Assurez-vous que bdmId est passé comme paramètre de la requête
//     console.log(bdmId);

//     if (!bdmId) {
//         return res.status(400).json({ message: "bdmId est requis" });
//     }

//     try {
//         const [rows] = await pool2.query(`
//             SELECT 
//                 nom_agent, prenom_agent, point_marchand_routine, date_routine, 
//                 veille_concurentielle_routine, commentaire_routine, id_terminal_tpe_routine, 
//                 etat_tpe_routine, etat_chargeur_tpe_routine, probleme_bancaire, 
//                 description_problemebancaire, probleme_mobile, description_probleme_mobile, 
//                 commenttaire_tpe_routine, image_tpe_routine 
//             FROM 
//                 routine 
//             INNER JOIN 
//                 routing ON routine.routing_id = routing.id 
//             JOIN 
//                 bdm 
//             JOIN 
//                 tpe_routine ON tpe_routine.routine_id = routing.id 
//             JOIN 
//                 agent ON agent.id = routine.commercial_routine_id 
//             WHERE 
//                 bdm.id = ?
//         `, [bdmId]);

//         if (rows.length > 0) {
//             return res.status(200).json(rows);
//         } else {
//             return res.status(404).json({ message: "Aucune donnée trouvée pour cet ID BDM" });
//         }
//     } catch (error) {
//         console.error("Erreur lors de la récupération des données:", error);
//         return res.status(500).json({ message: "Erreur serveur" });
//     }
// };


// const getAllMerchants = async (req, res) => {
//     const SOFTPOS = "SOFTPOS";

//     try {
//         const [results] = await pool1.query(
//             "SELECT POINT_MARCHAND FROM POINT_MARCHAND WHERE POINT_MARCHAND.GROUPE <> ?",
//             [SOFTPOS]
//         );

//         if (!results.length) {
//             return res.status(400).json({ message: "Aucun PM trouvé" });
//         }

//         return res.status(200).json(results);
//     } catch (error) {
//         console.log(error);
//         return res.status(500).json({ message: "Une erreur s'est produite lors de la recherche des PM" });
//     }
// };

const getPms = async (req, res) => {
    try {
        // Réessayez la requête jusqu'à 3 fois en cas d'échec
        let retries = 3;
        while (retries > 0) {
            try {
                const [results] = await pool1.query("SELECT * FROM POINT_MARCHAND");

                if (results.length > 0) {
                    return res.status(200).json(results);
                } else {
                    return res.status(401).json({ message: "Aucun point marchand trouvé" });
                }
            } catch (error) {
                if (error.code === 'ECONNRESET') {
                    console.warn('Connexion réinitialisée, tentative de reconnexion...');
                    retries--;
                    if (retries === 0) {
                        throw new Error('Impossible de récupérer les données après plusieurs tentatives');
                    }
                } else {
                    throw error;
                }
            }
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des points marchands:", error);
        return res.status(500).json({ message: "Erreur serveur" });
    }
};

const getAllRoutinesByBdm = async (req, res) => {
    const bdmId = Number(req.body.bdmId);  // Assurez-vous que bdmId est passé comme paramètre de la requête
    console.log(bdmId);

    if (!bdmId) {
        return res.status(400).json({ message: "bdmId est requis" });
    }

    try {
        // Réessayez la requête jusqu'à 3 fois en cas d'échec
        let retries = 3;
        while (retries > 0) {
            try {
                const [rows] = await pool2.query(`
SELECT * FROM routine INNER JOIN agent ON routine.commercial_routine_id = agent.id JOIN tpe_routine ON tpe_routine.routine_id = routine.id JOIN routing ON routing.id = routine.routing_id JOIN bdm ON routing.bdm_routing_id = bdm.id WHERE bdm.id = ?
                `, [bdmId]);

                if (rows.length > 0) {
                    return res.status(200).json(rows);
                } else {
                    return res.status(404).json({ message: "Aucune donnée trouvée pour cet ID BDM" });
                }
            } catch (error) {
                if (error.code === 'ECONNRESET') {
                    console.warn('Connexion réinitialisée, tentative de reconnexion...');
                    retries--;
                    if (retries === 0) {
                        throw new Error('Impossible de récupérer les données après plusieurs tentatives');
                    }
                } else {
                    throw error;
                }
            }
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
        return res.status(500).json({ message: "Erreur serveur" });
    }
};

const getAllMerchants = async (req, res) => {
    const SOFTPOS = "SOFTPOS";

    try {
        // Réessayez la requête jusqu'à 3 fois en cas d'échec
        let retries = 3;
        while (retries > 0) {
            try {
                const [results] = await pool1.query(
                    "SELECT POINT_MARCHAND FROM POINT_MARCHAND WHERE POINT_MARCHAND.GROUPE <> ?",
                    [SOFTPOS]
                );

                if (!results.length) {
                    return res.status(401).json({ message: "Aucun PM trouvé" });
                }

                return res.status(200).json(results);
            } catch (error) {
                if (error.code === 'ECONNRESET') {
                    console.warn('Connexion réinitialisée, tentative de reconnexion...');
                    retries--;
                    if (retries === 0) {
                        throw new Error('Impossible de récupérer les données après plusieurs tentatives');
                    }
                } else {
                    throw error;
                }
            }
        }
    } catch (error) {
        console.error("Erreur lors de la recherche des PM:", error);
        return res.status(500).json({ message: "Une erreur s'est produite lors de la recherche des PM" });
    }
};

const updateMerchant = async (req, res) => {
    const { latitude, longitude, pm } = req.body;
    console.log(latitude,longitude,pm)

    if (!latitude || !longitude || !pm) {
        return res.status(400).json({ message: "Tous les champs sont requis" });
    }else{

        const checkPm = await prisma.pm.findMany({where:{
            nom_pm : pm
        }})
        if(checkPm.length==0){
            prisma.pm.create({
                data : {
                    nom_pm : pm,
                    latitude_pm: latitude.toString(),
                    longitude_pm : longitude.toString()
                }
            }).then((pm)=>{
                if(pm){
                    return res.status(200).json({message : "le message a bien été enregistré"})
                }else{
                    return res.status(400).json({message : "Erreur lors de la création du point marchand"})
                }
            }).catch(err=>{
                console.log(err)
            })
        }else{
            console.log("NON OK")
            return res.status(401).json({message : "Ce point Marchand existe déja dans la Base"})
        }

    }


    
};

const getProfile = async (req,res)=>{

    const agentId = req.body.agentId
    
    if(!agentId){
        return res.status(400).json({message : "Tous les champs sont obligatoires"}
        
        )
    }else{
        const agent = await prisma.agent.findMany({where:{id : Number(agentId)}})
        return res.status(200).json(agent)
    }
}

// const getRoutineInfos = async (req, res) => {
//     try {
//         const { bdmId } = req.body;

//         // Récupérer les routings avec les agents associés
//         const routingByAgent = await prisma.routing.findMany({
//             include: {
//                 routine: {
//                     include: {
//                         agent: {
//                             include: {
//                                 users: true
//                             }
//                         }
//                     }
//                 }
//             },
//             where: {
//                 bdm_routing_id: Number(bdmId),
//                 created_at: {
//                     gte: new Date(new Date().setHours(0, 0, 0, 0)), // Début de la journée
//                     lte: new Date(new Date().setHours(23, 59, 59, 999)) // Fin de la journée
//                 }
//             }
//         });

//         // Log des descriptions et nombre de routings récupérés pour vérifier
//         console.log("Nombre de routings récupérés :", routingByAgent.length);
//         console.log("Descriptions des routings récupérés :", routingByAgent.map(r => r.description_routing));

//         // Grouper les routings par agent
//         const groupedByAgent = routingByAgent.reduce((acc, routing) => {
//             const firstRoutine = routing.routine && routing.routine[0];
//             if (!firstRoutine || !firstRoutine.agent) {
//                 return acc;
//             }

//             const agentId = firstRoutine.agent.id;

//             if (!acc[agentId]) {
//                 acc[agentId] = {
//                     agent: firstRoutine.agent,
//                     routings: []
//                 };
//             }

//             acc[agentId].routings.push(routing);
//             return acc;
//         }, {});

//         const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
//         const endOfToday = new Date(new Date().setHours(23, 59, 59, 999));

//         // Mapper les données pour préparer la réponse
//         const routineInfos = Object.values(groupedByAgent).map(agentGroup => {
//             const agent = agentGroup.agent;
//             const agentFullName = `${agent.prenom_agent} ${agent.nom_agent}`;

//             const todayRoutings = agentGroup.routings.filter(routing => {
//                 const dateCreated = new Date(routing.created_at);
//                 return dateCreated >= startOfToday && dateCreated <= endOfToday;
//             });

//             // Compter les points marchands et les routines aujourd'hui
//             const routingDetails = todayRoutings.map(routing => {
//                 let pointsMarchands = 0;
//                 try {
//                     pointsMarchands = JSON.parse(routing.pm_routing || '[]').length; // Vérification et parsing du champ pm_routing
//                 } catch (error) {
//                     console.error("Erreur lors du parsing des points marchands:", error);
//                 }

//                 const todayRoutineCount = routing.routine.filter(routine => {
//                     const dateRoutine = new Date(routine.date_routine);
//                     return dateRoutine >= startOfToday && dateRoutine <= endOfToday;
//                 }).length;

//                 return {
//                     routingId: routing.id,
//                     pointsMarchands,
//                     routinesCount: todayRoutineCount // Nombre de routines effectuées aujourd'hui pour ce routing
//                 };
//             });

//             const totalPointsMarchands = routingDetails.reduce((total, routing) => total + routing.pointsMarchands, 0);
//             const totalRoutinesToday = routingDetails.reduce((total, routing) => total + routing.routinesCount, 0);

//             return {
//                 agent: agentFullName,
//                 routingsCount: todayRoutings.length,
//                 totalPointsMarchands, // Nombre total de points marchands pour l'agent
//                 routinesCount: totalRoutinesToday, // Nombre total de routines effectuées aujourd'hui
//                 routingDetails // Détails de chaque routing (nombre de points marchands et de routines)
//             };
//         });

//         // Ajout d'un log pour vérifier les données juste avant de les renvoyer
//         console.log("Données à renvoyer :", JSON.stringify(routineInfos, null, 2));

//         // Envoyer la réponse avec les informations des routines
//         return res.status(200).json(routineInfos);
//     } catch (error) {
//         console.error("Erreur dans la récupération des infos de routine :", error);
//         return res.status(500).json({ error: "Une erreur s'est produite lors de la récupération des routines" });
//     }
// };

const getRoutineInfos = async (req, res, sendRoutineUpdates) => {
    try {
        const { bdmId } = req.body;

        // Récupérer tous les agents qui peuvent être associés à des routings
        const agents = await prisma.agent.findMany({
            include: {
                users: true
            }
        });

        // Récupérer les routings avec les agents associés
        const routingByAgent = await prisma.routing.findMany({
            include: {
                routine: {
                    include: {
                        agent: {
                            include: {
                                users: true
                            }
                        }
                    }
                }
            },
            where: {
                bdm_routing_id: Number(bdmId),
                created_at: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0)), // Début de la journée
                    lte: new Date(new Date().setHours(23, 59, 59, 999)) // Fin de la journée
                }
            }
        });

        // Grouper les routings par agent
        const groupedByAgent = routingByAgent.reduce((acc, routing) => {
            const firstRoutine = routing.routine && routing.routine[0];
            if (!firstRoutine || !firstRoutine.agent) {
                return acc;
            }

            const agentId = firstRoutine.agent.id;

            if (!acc[agentId]) {
                acc[agentId] = {
                    agent: firstRoutine.agent,
                    routings: []
                };
            }

            acc[agentId].routings.push(routing);
            return acc;
        }, {});

        const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
        const endOfToday = new Date(new Date().setHours(23, 59, 59, 999));

        // Mapper les données pour préparer la réponse, y compris les agents sans routings
        const routineInfos = agents.map(agent => {
            const agentId = agent.id;
            const agentFullName = `${agent.prenom_agent} ${agent.nom_agent}`;

            // Obtenir les routings pour cet agent ou une liste vide s'il n'y en a pas
            const agentGroup = groupedByAgent[agentId] || { routings: [] };

            // Tous les routings pour l'agent
            const todayRoutings = agentGroup.routings.filter(routing => {
                const dateCreated = new Date(routing.created_at);
                return dateCreated >= startOfToday && dateCreated <= endOfToday;
            });

            // Calculer les points marchands et routines effectuées aujourd'hui
            let totalPointsMarchands = 0;
            let totalRoutinesToday = 0;

            todayRoutings.forEach(routing => {
                let pointsMarchands = 0;
                try {
                    // Récupérer et compter les points marchands à partir du champ pm_routing
                    pointsMarchands = JSON.parse(routing.pm_routing || '[]').length;
                } catch (error) {
                    console.error("Erreur lors du parsing des points marchands:", error);
                }

                totalPointsMarchands += pointsMarchands;

                const todayRoutineCount = routing.routine.filter(routine => {
                    const dateRoutine = new Date(routine.date_routine);
                    return dateRoutine >= startOfToday && dateRoutine <= endOfToday;
                }).length;

                totalRoutinesToday += todayRoutineCount;
            });

            return {
                agent: agentFullName,
                routingsCount: todayRoutings.length, // Nombre total de routings assignés
                totalPointsMarchands, // Nombre total de points marchands
                routinesCount: totalRoutinesToday // Nombre de routines effectuées aujourd'hui
            };
        });

        // Envoyer la réponse avec les informations des routines
        res.status(200).json(routineInfos);
        sendRoutineUpdates(routineInfos);
    } catch (error) {
        console.error("Erreur dans la récupération des infos de routine avec dates :", error);
        if (!res.headersSent) {
            return res.status(500).json({ error: "Une erreur s'est produite lors de la récupération des routines avec dates" });
        }
    }
};

const getRoutineInfosByDateRange = async (req, res,sendRoutineUpdates) => {
    try {
        const { bdmId, startDate, endDate } = req.body;

        // Vérification des dates
        const start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
        const end = new Date(new Date(endDate).setHours(23, 59, 59, 999));

        // Récupérer tous les agents qui peuvent être associés à des routings
        const agents = await prisma.agent.findMany({
            include: {
                users: true
            }
        });

        // Récupérer les routings avec les agents associés dans la période donnée
        const routingByAgent = await prisma.routing.findMany({
            include: {
                routine: {
                    include: {
                        agent: {
                            include: {
                                users: true
                            }
                        }
                    }
                }
            },
            where: {
                bdm_routing_id: Number(bdmId),
                created_at: {
                    gte: start, // Début de la période
                    lte: end // Fin de la période
                }
            }
        });

        // Grouper les routings par agent
        const groupedByAgent = routingByAgent.reduce((acc, routing) => {
            const firstRoutine = routing.routine && routing.routine[0];
            if (!firstRoutine || !firstRoutine.agent) {
                return acc;
            }

            const agentId = firstRoutine.agent.id;

            if (!acc[agentId]) {
                acc[agentId] = {
                    agent: firstRoutine.agent,
                    routings: []
                };
            }

            acc[agentId].routings.push(routing);
            return acc;
        }, {});

        // Mapper les données pour préparer la réponse, y compris les agents sans routings
        const routineInfos = agents.map(agent => {
            const agentId = agent.id;
            const agentFullName = `${agent.prenom_agent} ${agent.nom_agent}`;

            // Obtenir les routings pour cet agent ou une liste vide s'il n'y en a pas
            const agentGroup = groupedByAgent[agentId] || { routings: [] };

            // Tous les routings pour l'agent dans l'intervalle de dates
            const dateFilteredRoutings = agentGroup.routings.filter(routing => {
                const dateCreated = new Date(routing.created_at);
                return dateCreated >= start && dateCreated <= end;
            });

            // Calculer les points marchands et routines effectuées dans l'intervalle de dates
            let totalPointsMarchands = 0;
            let totalRoutines = 0;

            dateFilteredRoutings.forEach(routing => {
                let pointsMarchands = 0;
                try {
                    // Récupérer et compter les points marchands à partir du champ pm_routing
                    pointsMarchands = JSON.parse(routing.pm_routing || '[]').length;
                } catch (error) {
                    console.error("Erreur lors du parsing des points marchands:", error);
                }

                totalPointsMarchands += pointsMarchands;

                const routineCount = routing.routine.filter(routine => {
                    const dateRoutine = new Date(routine.date_routine);
                    return dateRoutine >= start && dateRoutine <= end;
                }).length;

                totalRoutines += routineCount;
            });

            return {
                agent: agentFullName,
                routingsCount: dateFilteredRoutings.length, // Nombre total de routings assignés dans l'intervalle
                totalPointsMarchands, // Nombre total de points marchands dans l'intervalle
                routinesCount: totalRoutines // Nombre de routines effectuées dans l'intervalle
            };
        });

        // Envoyer la réponse avec les informations des routines dans la période donnée
        return res.status(200).json(routineInfos);
    } catch (error) {
        console.error("Erreur dans la récupération des infos de routine avec dates :", error);
        if (!res.headersSent) {
            return res.status(500).json({ error: "Une erreur s'est produite lors de la récupération des routines avec dates" });
        }
    }
};

const allRoutings = async (req, res) => {
    console.log("Voici la variable reçue : " + req.body.agentTypeid);
    const typeAgentId = req.body.agentTypeid;
    console.log(typeof req.body.agentTypeid);

    if (!typeAgentId) {
        return res.status(400).json({ message: "Veuillez fournir votre identité" });
    }

    if (typeAgentId !== 9) {
        return res.status(400).json({ message: "Vous devez être le directeur commercial pour avoir accès à cette ressource" });
    }


};

const allRoutines = async (req, res) => {
    console.log("Voici la variable reçue : " + req.body.agentTypeid);
    const typeAgentId = req.body.agentTypeid;
    console.log(typeof req.body.agentTypeid);

    if (!typeAgentId) {
        return res.status(400).json({ message: "Veuillez fournir votre identité" });
    }

    if (typeAgentId !== 9) {
        return res.status(400).json({ message: "Vous devez être le directeur commercial pour avoir accès à cette ressource" });
    }

    try {
        // Réessayez la requête jusqu'à 3 fois en cas d'échec
        let retries = 3;
        while (retries > 0) {
            try {
                const [rows] = await pool2.query(`
SELECT * FROM routine INNER JOIN agent ON routine.commercial_routine_id = agent.id JOIN tpe_routine ON tpe_routine.routine_id = routine.id JOIN routing ON routing.id = routine.routing_id JOIN bdm ON routing.bdm_routing_id = bdm.id `);

                if (rows.length > 0) {
                    return res.status(200).json(rows);
                } else {
                    return res.status(404).json({ message: "Aucune donnée trouvée" });
                }
            } catch (error) {
                if (error.code === 'ECONNRESET') {
                    console.warn('Connexion réinitialisée, tentative de reconnexion...');
                    retries--;
                    if (retries === 0) {
                        throw new Error('Impossible de récupérer les données après plusieurs tentatives');
                    }
                } else {
                    throw error;
                }
            }
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
        return res.status(500).json({ message: "Erreur serveur" });
    }
};








module.exports = { makeRoutine , getRoutine, getRoutineByCommercial, getSnBypointMarchand , generateAuthCode , validateAuthCode , createRouting ,getRoutingByCommercial, importBase64File, getAllRoutingsByBdm, getMyAgents, getPms, getAllRoutinesByBdm, getAllMerchants, getProfile,updateMerchant,getRoutineInfos,getRoutineInfosByDateRange,allRoutines,allRoutings};


