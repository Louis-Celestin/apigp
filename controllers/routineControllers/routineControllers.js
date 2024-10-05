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
const moment = require("moment/moment");
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);





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

const getRoutineInfos = async (req, res, sendRoutineUpdates) => {
    try {
        const { bdmId } = req.body;
        if (!bdmId) {
            return res.status(400).json({ error: "Le bdmId est requis" });
        }

        const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
        const endOfToday = new Date(new Date().setHours(23, 59, 59, 999));

        // Récupérer tous les agents pour le BDM
        const agents = await prisma.agent.findMany({
            where: {
                responsable_agent_id: Number(bdmId)
            }
        });

        // Récupérer les routings
        const routings = await prisma.routing.findMany({
            where: {
                bdm_routing_id: Number(bdmId),
                created_at: {
                    gte: startOfToday,
                    lte: endOfToday
                }
            },
            include: {
                agent: true
            }
        });

        // Récupérer les routines
        const routines = await prisma.routine.findMany({
            where: {
                date_routine: {
                    gte: startOfToday,
                    lte: endOfToday
                },
                agent: {
                    responsable_agent_id: Number(bdmId)
                }
            },
            include: {
                agent: true
            }
        });

        // Récupérer les points marchands des routings
        const pointsMarchandsDesRoutings = routings.flatMap(routing => {
            try {
                const points = JSON.parse(routing.pm_routing);
                return points.map(pm => pm.nom_Pm);
            } catch (error) {
                console.error(`Erreur lors du parsing des points marchands pour le routing ID ${routing.id}:`, error);
                return [];
            }
        });

        // Initialiser les statistiques pour chaque agent à zéro
        const groupedByAgent = {};

        agents.forEach(agent => {
            groupedByAgent[agent.id] = {
                agent: agent,
                routingsCount: 0,
                totalPointsMarchands: 0, // On met à 0 initialement
                routinesCount: 0,
                routineEffectués: 0,
            };
        });

        // Mettre à jour les statistiques pour les routings
        routings.forEach(routing => {
            const agentId = routing.agent.id;
            groupedByAgent[agentId].routingsCount++;
            groupedByAgent[agentId].totalPointsMarchands += pointsMarchandsDesRoutings.length; // Total points marchands
        });

        // Mettre à jour les statistiques pour les routines
        routines.forEach(routine => {
            const agentId = routine.agent.id;
            const isInRoutingPoints = pointsMarchandsDesRoutings.includes(routine.point_marchand_routine);
            if (isInRoutingPoints) {
                groupedByAgent[agentId].routinesCount++;
            } else {
                groupedByAgent[agentId].routineEffectués++;
            }
        });

        const routineInfos = Object.values(groupedByAgent).map(group => ({
            id: group.agent.id,
            agent: `${group.agent.prenom_agent} ${group.agent.nom_agent}`,
            routingsCount: group.routingsCount,
            totalPointsMarchands: group.totalPointsMarchands, // Total des points marchands contenus dans les routings
            routinesCount: group.routinesCount,
            routineEffectués: group.routineEffectués,
        }));

        res.status(200).json(routineInfos);
        sendRoutineUpdates(routineInfos);
    } catch (error) {
        console.error("Erreur dans la récupération des infos de routine :", error);
        if (!res.headersSent) {
            return res.status(500).json({ error: "Une erreur s'est produite lors de la récupération des routines." });
        }
    }
};

const getRoutineInfosByDateRange = async (req, res, sendRoutineUpdates) => {
    try {
        const { bdmId, dateDebut, dateFin } = req.body;

if (!bdmId) {
    return res.status(400).json({ error: "Le bdmId est requis" });
}

// Vérification et conversion des dates au format YYYY-MM-DD
const startOfDateDebut = new Date(`${dateDebut}T00:00:00Z`);
const endOfDateFin = new Date(`${dateFin}T23:59:59Z`);

// Validation des dates
if (isNaN(startOfDateDebut.getTime()) || isNaN(endOfDateFin.getTime())) {
    return res.status(400).json({ error: "Les dates fournies ne sont pas valides." });
}

const agents = await prisma.agent.findMany({
    where: {
        responsable_agent_id: Number(bdmId)
    }
});

// Récupérer les routings
const routings = await prisma.routing.findMany({
    where: {
        bdm_routing_id: Number(bdmId),
        created_at: {
            gte: startOfDateDebut,
            lte: endOfDateFin
        }
    },
    include: {
        agent: true
    }
});

// Récupérer les routines
const routines = await prisma.routine.findMany({
    where: {
        date_routine: {
            gte: startOfDateDebut,
            lte: endOfDateFin
        },
        agent: {
            responsable_agent_id: Number(bdmId)
        }
    },
    include: {
        agent: true
    }
});

        // Récupérer les points marchands des routings
        const pointsMarchandsDesRoutings = routings.flatMap(routing => {
            try {
                const points = JSON.parse(routing.pm_routing);
                return points.map(pm => pm.nom_Pm);
            } catch (error) {
                console.error(`Erreur lors du parsing des points marchands pour le routing ID ${routing.id}:`, error);
                return [];
            }
        });

        // Initialiser les statistiques pour chaque agent à zéro
        const groupedByAgent = {};

        agents.forEach(agent => {
            groupedByAgent[agent.id] = {
                agent: agent,
                routingsCount: 0,
                totalPointsMarchands: 0,
                routinesCount: 0,
                routineEffectués: 0,
            };
        });

// Mettre à jour les statistiques pour les routings
routings.forEach(routing => {
    const agentId = routing.agent.id;
    if (groupedByAgent[agentId]) {
        groupedByAgent[agentId].routingsCount++;
        groupedByAgent[agentId].totalPointsMarchands += pointsMarchandsDesRoutings.length; // Total points marchands
    }
});

// Mettre à jour les statistiques pour les routines
routines.forEach(routine => {
    const agentId = routine.agent.id;
    if (groupedByAgent[agentId]) {
        const isInRoutingPoints = pointsMarchandsDesRoutings.includes(routine.point_marchand_routine);
        if (isInRoutingPoints) {
            groupedByAgent[agentId].routinesCount++;
        } else {
            groupedByAgent[agentId].routineEffectués++;
        }
    }
});


        // Formatage de la réponse
        const routineInfos = Object.values(groupedByAgent).map(group => ({
            id: group.agent.id,
            agent: `${group.agent.prenom_agent} ${group.agent.nom_agent}`,
            routingsCount: group.routingsCount,
            totalPointsMarchands: group.totalPointsMarchands,
            routinesCount: group.routinesCount,
            routineEffectués: group.routineEffectués,
        }));

        console.log("Infos des routines :", routineInfos);

        res.status(200).json(routineInfos);
        sendRoutineUpdates(routineInfos);
    } catch (error) {
        console.error("Erreur dans la récupération des infos de routine :", error);
        if (!res.headersSent) {
            return res.status(500).json({ error: "Une erreur s'est produite lors de la récupération des routines." });
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
    await prisma.routing.findMany({
        include:{bdm:true}
    }).then((routings)=>{
        routings.map((routing)=>{
            routing.fullName = `${routing.bdm.nom_bdm} ${routing.bdm.prenom_bdm}`
        })
        routings.map((routing)=>{
            routing.bdm = undefined
        })
        routings.map((routing)=>{
            
            const formattedDate = moment(routing.created_at).format('DD/MM/YYYY'); 
            routing.created_at = formattedDate
        })
        routings.map((routing)=>{
            
            const formattedDate = moment(routing.date_debut_routing).format('DD/MM/YYYY'); 
            routing.date_debut_routing = formattedDate
        })
        routings.map((routing)=>{
            
            const formattedDate = moment(routing.date_fin_routing).format('DD/MM/YYYY'); 
            routing.date_fin_routing = formattedDate
        })
        if(routings.length){
            return res.status(200).json({routings})
        }else{
            return res.status(400).json({message:"Aucune donnée"})
        }
    }).catch(err=>{
        console.log(err)
    })
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
SELECT * FROM routine INNER JOIN agent ON routine.commercial_routine_id = agent.id JOIN tpe_routine ON tpe_routine.routine_id = routine.id`);

                if (rows.length > 0) {
                    rows.map((row)=>{
                        const formattedDate = moment(row.date_routine).format('DD/MM/YYYY'); 
                        row.date_routine = formattedDate

                        const fullName = `${row.nom_agent} ${row.prenom_agent}`
                        row.fullName = fullName
                        row.nom_agent = undefined
                        row.prenom_agent = undefined
                    })
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

const getRoutineInfosForDC = async (req, res, sendRoutineUpdates) => {
    try {


        const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
        const endOfToday = new Date(new Date().setHours(23, 59, 59, 999));

        // Récupérer tous les agents pour le BDM
        const agents = await prisma.agent.findMany({
            where:{
                type_agent_id : {
                    notIn:[9,8]
                }
            }
        });

        // Récupérer les routings
        const routings = await prisma.routing.findMany({
            where: {
                created_at: {
                    gte: startOfToday,
                    lte: endOfToday
                }
            },
            include: {
                agent: true
            }
        });

        // Récupérer les routines
        const routines = await prisma.routine.findMany({
            where: {
                date_routine: {
                    gte: startOfToday,
                    lte: endOfToday
                },
            },
            include: {
                agent: true
            }
        });

        // Récupérer les points marchands des routings
        const pointsMarchandsDesRoutings = routings.flatMap(routing => {
            try {
                const points = JSON.parse(routing.pm_routing);
                return points.map(pm => pm.nom_Pm);
            } catch (error) {
                console.error(`Erreur lors du parsing des points marchands pour le routing ID ${routing.id}:`, error);
                return [];
            }
        });

        // Initialiser les statistiques pour chaque agent à zéro
        const groupedByAgent = {};

        agents.forEach(agent => {
            groupedByAgent[agent.id] = {
                agent: agent,
                routingsCount: 0,
                totalPointsMarchands: 0, // On met à 0 initialement
                routinesCount: 0,
                routineEffectués: 0,
            };
        });

        // Mettre à jour les statistiques pour les routings
        routings.forEach(routing => {
            const agentId = routing.agent.id;
            groupedByAgent[agentId].routingsCount++;
            groupedByAgent[agentId].totalPointsMarchands += pointsMarchandsDesRoutings.length; // Total points marchands
        });

        // Mettre à jour les statistiques pour les routines
        routines.forEach(routine => {
            const agentId = routine.agent.id;
            const isInRoutingPoints = pointsMarchandsDesRoutings.includes(routine.point_marchand_routine);
            if (isInRoutingPoints) {
                groupedByAgent[agentId].routinesCount++;
            } else {
                groupedByAgent[agentId].routineEffectués++;
            }
        });

        const routineInfos = Object.values(groupedByAgent).map(group => ({
            id: group.agent.id,
            agent: `${group.agent.prenom_agent} ${group.agent.nom_agent}`,
            routingsCount: group.routingsCount,
            totalPointsMarchands: group.totalPointsMarchands, // Total des points marchands contenus dans les routings
            routinesCount: group.routinesCount,
            routineEffectués: group.routineEffectués,
        }));

        res.status(200).json(routineInfos);
        sendRoutineUpdates(routineInfos);
    } catch (error) {
        console.error("Erreur dans la récupération des infos de routine :", error);
        if (!res.headersSent) {
            return res.status(500).json({ error: "Une erreur s'est produite lors de la récupération des routines." });
        }
    }
};

const getRoutineInfosForDcByCommercial = async (req, res, sendRoutineUpdates) => {
    const { idCommercial } = req.body;

    try {
        if (!idCommercial) {
            return res.status(400).json({ error: "L'idCommercial est requis" });
        }

        const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
        const endOfToday = new Date(new Date().setHours(23, 59, 59, 999));

        // Étape 1 : Récupérer les informations du commercial (agent)
        const agents = await prisma.agent.findMany({
            where: {
                id: Number(idCommercial)
            },
            include: {
                zone_commerciale: true,
            }
        });

        const bdm = await prisma.bdm.findUnique({
            where : {
                id : Number(agents[0].responsable_agent_id)
            }
        })

        if (!agents.length) {
            return res.status(404).json({ error: "Agent non trouvé" });
        }

        const agent = agents[0];

        // Étape 2 : Récupérer les routings du commercial pour aujourd'hui
        const routings = await prisma.routing.findMany({
            where: {
                agent_routing_id: Number(idCommercial),
                created_at: {
                    gte: startOfToday,
                    lte: endOfToday
                }
            }
        });

        // Étape 3 : Récupérer les routines effectuées aujourd'hui par le commercial
        const routines = await prisma.routine.findMany({
            where: {
                commercial_routine_id: Number(idCommercial),
                date_routine: {
                    gte: startOfToday,
                    lte: endOfToday
                }
            }
        });

        // Étape 4 : Récupérer et regrouper les points marchands des routings
        const pointsMarchandsDesRoutings = routings.flatMap(routing => {
            try {
                const points = JSON.parse(routing.pm_routing);
                return points.map(pm => pm.nom_Pm);
            } catch (error) {
                console.error(`Erreur lors du parsing des points marchands pour le routing ID ${routing.id}:`, error);
                return [];
            }
        });

        // Grouper les points marchands par nom et compter les occurrences
        const groupByPm = (points) => {
            const grouped = {};
            points.forEach(pm => {
                if (grouped[pm]) {
                    grouped[pm]++;
                } else {
                    grouped[pm] = 1;
                }
            });
            return Object.keys(grouped).map(nom_Pm => ({ nom_Pm, count: grouped[nom_Pm] }));
        };

        // Étape 5 : Filtrer les PM visités qui sont aussi dans les routings
        const listePmroutinesVisités = groupByPm(routines.flatMap(routine => routine.point_marchand_routine));

        // Étape 6 : Récupérer tous les PM à partir des routings pour listePmAvisiter
        const listePmAvisiter = groupByPm(pointsMarchandsDesRoutings); // Tous les PM dans les routings

        // Étape 7 : Compter les interventions (on considère ici que toutes les routines sont des interventions)
        const listeInterventios = groupByPm(routines.flatMap(routine => routine.point_marchand_routine));

        // Étape 8 : Calculer les statistiques pour l'agent
        const routineInfos = {
            id: agent.id,
            agent: `${agent.prenom_agent} ${agent.nom_agent}`,
            bdmAgent : `${bdm.nom_bdm} ${bdm.prenom_bdm}`,
            zone_commerciale : agents[0].zone_commerciale.nom_zone,
            routingsCount: routings.length, // Nombre de routings
            totalPointsMarchands: pointsMarchandsDesRoutings.length, // Total des points marchands des routings
            routinesCount: routines.length, // Nombre de routines effectuées
            routineEffectués: listePmroutinesVisités.length, // Nombre de PM visités
            listePmroutinesVisités, // Liste des points marchands visités dans les routings
            listePmAvisiter, // Liste des points marchands à visiter
            listeInterventios // Liste des points marchands avec interventions
        };

        // Envoyer la réponse
        res.status(200).json([routineInfos]);
        sendRoutineUpdates([routineInfos]);

    } catch (error) {
        console.error("Erreur dans la récupération des infos de routine :", error);
        if (!res.headersSent) {
            return res.status(500).json({ error: "Une erreur s'est produite lors de la récupération des routines." });
        }
    }
};


module.exports = { makeRoutine , getRoutine, getRoutineByCommercial, getSnBypointMarchand , generateAuthCode , validateAuthCode , createRouting ,getRoutingByCommercial, importBase64File, getAllRoutingsByBdm, getMyAgents, getPms, getAllRoutinesByBdm, getAllMerchants, getProfile,updateMerchant,getRoutineInfos,getRoutineInfosByDateRange,allRoutines,allRoutings,getRoutineInfosForDC,getRoutineInfosForDcByCommercial};


