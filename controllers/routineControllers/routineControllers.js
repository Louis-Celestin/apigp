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
        if (distance > 100) {
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
        },
        orderBy : {date_routine : "desc"}
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
                },
                orderBy : {
                    date_routine : "desc"
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
                where : {agent_routing_id : Number(commercialId)},
                orderBy : {created_at : "desc"}
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
                },
                orderBy : {created_at : "desc"}
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
SELECT nom_bdm,prenom_bdm,routine.id,routine_id,commercial_routine_id,numero_routine,date_routine,point_marchand_routine,veille_concurentielle_routine,commentaire_routine,id_terminal_tpe_routine,etat_tpe_routine,etat_chargeur_tpe_routine,probleme_bancaire,description_problemebancaire,probleme_mobile,description_probleme_mobile,commenttaire_tpe_routine,image_tpe_routine,nom_agent,prenom_agent FROM routine INNER JOIN agent ON routine.commercial_routine_id = agent.id JOIN tpe_routine ON tpe_routine.routine_id = routine.id JOIN routing ON routine.routing_id = routing.id JOIN bdm ON routing.bdm_routing_id = bdm.id WHERE bdm.id = ? ORDER BY date_routine DESC
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
        include:{bdm:true},
        orderBy : {
            created_at : "desc"}
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
SELECT routine.id,routine_id,commercial_routine_id,numero_routine,date_routine,point_marchand_routine,veille_concurentielle_routine,commentaire_routine,id_terminal_tpe_routine,etat_tpe_routine,etat_chargeur_tpe_routine,probleme_bancaire,description_problemebancaire,probleme_mobile,description_probleme_mobile,commenttaire_tpe_routine,image_tpe_routine,nom_agent,prenom_agent FROM routine INNER JOIN agent ON routine.commercial_routine_id = agent.id JOIN tpe_routine ON tpe_routine.routine_id = routine.id ORDER BY date_routine DESC`);

                if (rows.length > 0) {
                    rows.map((row)=>{
                        const formattedDate = moment(row.date_routine).format('DD/MM/YYYY HH:mm:ss'); 
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

const getOneRoutine = async (req, res) => {
    console.log("Voici la variable reçue : " + req.body.agentTypeid);
    const typeAgentId = req.body.agentTypeid;
    const idRoutine = req.body.idRoutine

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
SELECT routine.id,routine_id,commercial_routine_id,numero_routine,date_routine,point_marchand_routine,veille_concurentielle_routine,commentaire_routine,id_terminal_tpe_routine,etat_tpe_routine,etat_chargeur_tpe_routine,probleme_bancaire,description_problemebancaire,probleme_mobile,description_probleme_mobile,commenttaire_tpe_routine,image_tpe_routine,nom_agent,prenom_agent FROM routine INNER JOIN agent ON routine.commercial_routine_id = agent.id JOIN tpe_routine ON tpe_routine.routine_id = routine.id WHERE routine.id = ? ORDER BY date_routine DESC`,[idRoutine]);

                if (rows.length > 0) {
                    rows.map((row)=>{
                        const formattedDate = moment(row.date_routine).format('DD/MM/YYYY HH:mm:ss'); 
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

// changed
const getRoutineInfosForDC = async (req, res, sendRoutineUpdates) => {
    try {
        // Définir le début et la fin de la journée actuelle
        const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
        const endOfToday = new Date(new Date().setHours(23, 59, 59, 999));

        // Récupérer tous les agents pour le BDM
        const agents = await prisma.agent.findMany({
            where: {
                type_agent_id: {
                    notIn: [9, 8],
                },
            },
            include: { users: true },
        });

        // Récupérer les routings
        const routings = await prisma.routing.findMany({
            where: {
                created_at: {
                    gte: startOfToday,
                    lte: endOfToday,
                },
            },
            include: {
                agent: true,
            },
        });

        // Récupérer les routines
        const routines = await prisma.routine.findMany({
            where: {
                date_routine: {
                    gte: startOfToday,
                    lte: endOfToday,
                },
            },
            include: {
                agent: true,
            },
            orderBy: { date_routine: "desc" },
        });

        // Récupérer les points marchands des routings
        const pointsMarchandsDesRoutings = routings.flatMap((routing) => {
            try {
                const points = JSON.parse(routing.pm_routing);
                return points.map((pm) => pm.nom_Pm);
            } catch (error) {
                console.error(`Erreur lors du parsing des points marchands pour le routing ID ${routing.id}:`, error);
                return [];
            }
        });

        // Initialiser les statistiques pour chaque agent
        const groupedByAgent = {};

        agents.forEach((agent) => {
            groupedByAgent[agent.id] = {
                agent,
                routingsCount: 0,
                totalPointsMarchands: 0,
                routinesCount: 0,
                routineEffectués: 0,
            };
        });

        // Mettre à jour les statistiques pour les routings
        routings.forEach((routing) => {
            const agentId = routing.agent.id;
            groupedByAgent[agentId].routingsCount++;
            const points = JSON.parse(routing.pm_routing);
            groupedByAgent[agentId].totalPointsMarchands += points.length; // Total des points marchands
        });

        // Mettre à jour les statistiques pour les routines
        routines.forEach((routine) => {
            const agentId = routine.agent.id;
            const isInRoutingPoints = pointsMarchandsDesRoutings.includes(routine.point_marchand_routine);
            if (isInRoutingPoints) {
                groupedByAgent[agentId].routinesCount++;
            } else {
                groupedByAgent[agentId].routineEffectués++;
            }
        });

        // Formater la réponse selon la structure souhaitée
        const routineInfos = Object.values(groupedByAgent).map((group) => ({
            agentImage: group.agent.users.image_profile_user,
            id: group.agent.id,
            agent: `${group.agent.prenom_agent} ${group.agent.nom_agent}`,
            routingsCount: group.routingsCount,
            totalPointsMarchands: group.totalPointsMarchands,
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

// Changed
const getRoutineInfosForDCByDateRange = async (req, res, sendRoutineUpdates) => {
    const { dateDebut, dateFin } = req.body;

    if (!dateDebut || !dateFin) {
        return res.status(400).json({ error: "Il faut indiquer les dates" });
    }

    if (dateDebut > dateFin || dateFin < dateDebut) {
        return res.status(400).json({ error: "Indiquez les bons intervalles de dates" });
    }

    try {
        const startOfToday = new Date(`${dateDebut}T00:00:00Z`);
        const endOfToday = new Date(`${dateFin}T23:59:59Z`);

        // Récupérer tous les agents pour le BDM
        const agents = await prisma.agent.findMany({
            where: {
                type_agent_id: {
                    notIn: [9, 8], // Exclure les agents ayant un type_agent_id 8 ou 9
                },
            },
            include: { users: true },
        });

        // Récupérer les routings
        const routings = await prisma.routing.findMany({
            where: {
                created_at: {
                    gte: startOfToday,
                    lte: endOfToday,
                },
            },
            include: {
                agent: true,
            },
        });

        // Récupérer les routines
        const routines = await prisma.routine.findMany({
            where: {
                date_routine: {
                    gte: startOfToday,
                    lte: endOfToday,
                },
            },
            include: {
                agent: true,
            },
            orderBy: {
                date_routine: "desc",
            },
        });

        // Récupérer les points marchands des routings
        const pointsMarchandsDesRoutings = routings.flatMap((routing) => {
            try {
                const points = JSON.parse(routing.pm_routing);
                return points.map((pm) => pm.nom_Pm);
            } catch (error) {
                console.error(`Erreur lors du parsing des points marchands pour le routing ID ${routing.id}:`, error);
                return [];
            }
        });

        // Initialiser les statistiques pour chaque agent
        const groupedByAgent = {};

        agents.forEach((agent) => {
            groupedByAgent[agent.id] = {
                agent,
                routingsCount: 0,
                totalPointsMarchands: 0,
                routinesCount: 0,
                routineEffectués: 0,
            };
        });

        // Mettre à jour les statistiques pour les routings
        routings.forEach((routing) => {
            const agentId = routing.agent.id;
            if (groupedByAgent[agentId]) {
                groupedByAgent[agentId].routingsCount++;
                const points = JSON.parse(routing.pm_routing); // Extraction des points marchands pour le routing
                groupedByAgent[agentId].totalPointsMarchands += points.length; // Total des points marchands
            } else {
                console.warn(`L'agent avec ID ${agentId} pour le routing ${routing.id} n'a pas été trouvé.`);
            }
        });

        // Mettre à jour les statistiques pour les routines
        routines.forEach((routine) => {
            const agentId = routine.agent.id;

            // Vérifier si l'agent est bien présent dans groupedByAgent
            if (groupedByAgent[agentId]) {
                const isInRoutingPoints = pointsMarchandsDesRoutings.includes(routine.point_marchand_routine);
                if (isInRoutingPoints) {
                    groupedByAgent[agentId].routinesCount++;
                } else {
                    groupedByAgent[agentId].routineEffectués++;
                }
            } else {
                console.warn(`L'agent avec ID ${agentId} pour la routine ${routine.id} n'a pas été trouvé.`);
            }
        });

        // Formater la réponse selon la structure souhaitée
        const routineInfos = Object.values(groupedByAgent).map((group) => ({
            agentImage: group.agent.users.image_profile_user,
            id: group.agent.id,
            agent: `${group.agent.prenom_agent} ${group.agent.nom_agent}`,
            routingsCount: group.routingsCount,
            totalPointsMarchands: group.totalPointsMarchands,
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

// Changed
const getRoutineInfosForDcByCommercialByDateRange = async (req, res, sendRoutineUpdates) => {
    const { dateDebut, dateFin, idCommercial } = req.body;

    if (!dateDebut || !dateFin || !idCommercial) {
        return res.status(400).json({ error: "Il faut indiquer les dates et le commercial" });
    }

    if (dateDebut > dateFin || dateFin < dateDebut) {
        return res.status(400).json({ error: "Indiquez les bons intervalles de dates" });
    }

    try {
        const startOfToday = new Date(`${dateDebut}T00:00:00Z`);
        const endOfToday = new Date(`${dateFin}T23:59:59Z`);

        // Récupérer tous les agents pour le BDM
        const agents = await prisma.agent.findMany({
            where: {
                type_agent_id: {
                    notIn: [9, 8]
                },
                id: Number(idCommercial) // Filtrer par commercial
            },
            include: { users: true, zone_commerciale : true }
        });

        // Récupérer les routings pour le commercial
        const routings = await prisma.routing.findMany({
            where: {
                created_at: {
                    gte: startOfToday,
                    lte: endOfToday
                },
                agent_routing_id: Number(idCommercial) // Filtrer par commercial
            },
            include: {
                agent: true
            }
        });

        // Récupérer les routines pour le commercial
        const routines = await prisma.routine.findMany({
            where: {
                date_routine: {
                    gte: startOfToday,
                    lte: endOfToday
                },
                commercial_routine_id: Number(idCommercial) // Filtrer par commercial
            },
            include: {
                agent: true
            },
            orderBy: {
                date_routine: "desc"
            }
        });


                 const bdm = await prisma.bdm.findUnique({
                         where : {
                         id : Number(agents[0].responsable_agent_id)
                        }
                })

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
                bdmAgent: bdm.nom_bdm, // Supposons qu'il y ait un champ pour le BDM
                zone_commerciale: agent.zone_commerciale.nom_zone, // Supposons qu'il y ait un champ pour la zone
                routingsCount: 0,
                totalPointsMarchands: 0,
                routinesCount: 0,
                routineEffectués: 0,
                listePmroutinesVisités: [],
                listePmAvisiter: [], // Liste à visiter
                listeInterventios: []
            };
        });

        // Mettre à jour les statistiques pour les routings
        routings.forEach(routing => {
            const agentId = routing.agent.id;
            groupedByAgent[agentId].routingsCount++;
            groupedByAgent[agentId].totalPointsMarchands = pointsMarchandsDesRoutings.length; // Total points marchands

            // Mise à jour de la liste des points marchands à visiter
            try {
                const points = JSON.parse(routing.pm_routing);
                points.forEach(pm => {
                    const index = groupedByAgent[agentId].listePmAvisiter.findIndex(p => p.nom_Pm === pm.nom_Pm);
                    if (index !== -1) {
                        groupedByAgent[agentId].listePmAvisiter[index].count++;
                    } else {
                        groupedByAgent[agentId].listePmAvisiter.push({ nom_Pm: pm.nom_Pm, count: 1 });
                    }
                });
            } catch (error) {
                console.error(`Erreur lors du parsing des points marchands pour le routing ID ${routing.id}:`, error);
            }
        });

        // Mettre à jour les statistiques pour les routines
        routines.forEach(routine => {
            const agentId = routine.agent.id;
            const isInRoutingPoints = pointsMarchandsDesRoutings.includes(routine.point_marchand_routine);

            if (isInRoutingPoints) {
                groupedByAgent[agentId].routinesCount++;
                
                // Mise à jour de la liste des points marchands visités
                const visitedPmIndex = groupedByAgent[agentId].listePmroutinesVisités.findIndex(pm => pm.nom_Pm === routine.point_marchand_routine);
                if (visitedPmIndex !== -1) {
                    groupedByAgent[agentId].listePmroutinesVisités[visitedPmIndex].count++;
                } else {
                    groupedByAgent[agentId].listePmroutinesVisités.push({ nom_Pm: routine.point_marchand_routine, count: 1});
                }
            } else {
                groupedByAgent[agentId].routineEffectués++;
            }

            // Mise à jour de la liste des interventions
            const interventionIndex = groupedByAgent[agentId].listeInterventios.findIndex(pm => pm.nom_Pm === routine.point_marchand_routine);
            if (interventionIndex !== -1) {
                groupedByAgent[agentId].listeInterventios[interventionIndex].count++;
            } else {
                groupedByAgent[agentId].listeInterventios.push({
                    idRoutine : routine.id,
                    nom_Pm: routine.point_marchand_routine,
                    date: moment(routine.date_routine).format('YYYY-MM-DD HH:mm:ss') // Utilisation de moment pour formater la date
                });
            }


            
        });

        const routineInfos = Object.values(groupedByAgent).map(group => ({
            agentImage: group.agent.users.image_profile_user,
            id: group.agent.id,
            agent: `${group.agent.prenom_agent} ${group.agent.nom_agent}`,
            bdmAgent: `${bdm.nom_bdm} ${bdm.prenom_bdm}`,
            zone_commerciale: group.zone_commerciale,
            routingsCount: group.routingsCount,
            totalPointsMarchands: group.totalPointsMarchands,
            routinesCount: group.routinesCount,
            routineEffectués: group.routineEffectués,
            listePmroutinesVisités: group.listePmroutinesVisités,
            listePmAvisiter: group.listePmAvisiter, // Liste des points marchands à visiter
            listeInterventios: group.listeInterventios
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

//changed
// const getRoutineInfosForDcByCommercial = async (req, res, sendRoutineUpdates) => {
//     const { idCommercial } = req.body;

//     if (!idCommercial) {
//         return res.status(400).json({ error: "Il faut indiquer le commercial" });
//     }
//         // Définir le début et la fin de la journée actuelle
//         const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
//         const endOfToday = new Date(new Date().setHours(23, 59, 59, 999));
//     try {
//         // Récupérer tous les agents pour le BDM
//         const agents = await prisma.agent.findMany({
//             where: {
//                 type_agent_id: {
//                     notIn: [9, 8]
//                 },
//                 id: Number(idCommercial) // Filtrer par commercial
//             },
//             include: { users: true, zone_commerciale: true }
//         });

//         // Récupérer tous les routings pour le commercial
//         const routings = await prisma.routing.findMany({
//             where: {
//                 agent_routing_id: Number(idCommercial),// Filtrer par commercial
//                 created_at: {
//                     gte: startOfToday,
//                     lte: endOfToday,
//                 },
//             },
//             include: {
//                 agent: true
//             }
//         });

//         // Récupérer toutes les routines pour le commercial
//         const routines = await prisma.routine.findMany({
//             where: {
//                 commercial_routine_id: Number(idCommercial), // Filtrer par commercial
//                 date_routine: {
//                     gte: startOfToday,
//                     lte: endOfToday,
//                 },
//             },
//             include: {
//                 agent: true
//             },
//             orderBy: {
//                 date_routine: "desc"
//             }
//         });

//         // Recuperer le BDM

//         const bdm = await prisma.bdm.findUnique({
//             where : {
//                 id : Number(agents[0].responsable_agent_id)
//             }
//         })

//         // Récupérer les points marchands des routings
//         const pointsMarchandsDesRoutings = routings.flatMap(routing => {
//             try {
//                 const points = JSON.parse(routing.pm_routing);
//                 return points.map(pm => pm.nom_Pm);
//             } catch (error) {
//                 console.error(`Erreur lors du parsing des points marchands pour le routing ID ${routing.id}:`, error);
//                 return [];
//             }
//         });

//         console.log(pointsMarchandsDesRoutings)

//         // Initialiser les statistiques pour chaque agent à zéro
//         const groupedByAgent = {};
        
//         agents.forEach(agent => {
//             groupedByAgent[agent.id] = {
//                 agent: agent,
//                 bdmAgent: agent.bdmAgent || "non defini", // Supposons qu'il y ait un champ pour le BDM
//                 zone_commerciale: agent.zone_commerciale.nom_zone, // Supposons qu'il y ait un champ pour la zone
//                 routingsCount: 0,
//                 totalPointsMarchands: 0,
//                 routinesCount: 0,
//                 routineEffectués: 0,
//                 listePmroutinesVisités: [],
//                 listePmAvisiter: [], // Liste à visiter
//                 listeInterventios: []
//             };
//         });

//         // Mettre à jour les statistiques pour les routings
        
//         routings.forEach(routing => {
            
//             const agentId = routing.agent.id;
//             groupedByAgent[agentId].routingsCount++;
//             groupedByAgent[agentId].totalPointsMarchands = pointsMarchandsDesRoutings.length; // Total points marchands

//             // Mise à jour de la liste des points marchands à visiter
//             try {
//                 const points = JSON.parse(routing.pm_routing);
//                 points.forEach(pm => {
//                     const index = groupedByAgent[agentId].listePmAvisiter.findIndex(p => p.nom_Pm === pm.nom_Pm);
//                     if (index !== -1) {
//                         groupedByAgent[agentId].listePmAvisiter[index].count++;
//                     } else {
//                         groupedByAgent[agentId].listePmAvisiter.push({ nom_Pm: pm.nom_Pm, count: 1 });
//                     }
//                 });
//             } catch (error) {
//                 console.error(`Erreur lors du parsing des points marchands pour le routing ID ${routing.id}:`, error);
//             }
//         });

//         // Mettre à jour les statistiques pour les routines
//         routines.forEach(routine => {
//             const agentId = routine.agent.id;
//             const isInRoutingPoints = pointsMarchandsDesRoutings.includes(routine.point_marchand_routine);

//             if (isInRoutingPoints) {
//                 groupedByAgent[agentId].routinesCount++;
                
//                 // Mise à jour de la liste des points marchands visités
//                 const visitedPmIndex = groupedByAgent[agentId].listePmroutinesVisités.findIndex(pm => pm.nom_Pm === routine.point_marchand_routine);
//                 if (visitedPmIndex !== -1) {
//                     groupedByAgent[agentId].listePmroutinesVisités[visitedPmIndex].count++;
//                 } else {
//                     groupedByAgent[agentId].listePmroutinesVisités.push({ nom_Pm: routine.point_marchand_routine, count: 1 });
//                 }
//             } else {
//                 groupedByAgent[agentId].routineEffectués++;
//             }

//             // Mise à jour de la liste des interventions
//             const interventionIndex = groupedByAgent[agentId].listeInterventios.findIndex(pm => pm.nom_Pm === routine.point_marchand_routine);
//             if (interventionIndex !== -1) {
//                 groupedByAgent[agentId].listeInterventios[interventionIndex].count++;
//             } else {
//                 groupedByAgent[agentId].listeInterventios.push({ nom_Pm: routine.point_marchand_routine, count: 1 });
//             }
//         });

//         const routineInfos = Object.values(groupedByAgent).map(group => ({
//             agentImage: group.agent.users.image_profile_user,
//             id: group.agent.id,
//             agent: `${group.agent.prenom_agent} ${group.agent.nom_agent}`,
//             bdmAgent: `${bdm.nom_bdm} ${bdm.prenom_bdm}`,
//             zone_commerciale: group.agent.zone_commerciale.nom_zone,
//             routingsCount: group.routingsCount,
//             totalPointsMarchands: group.totalPointsMarchands,
//             routinesCount: group.routinesCount,
//             routineEffectués: group.routineEffectués,
//             listePmroutinesVisités: group.listePmroutinesVisités,
//             listePmAvisiter: group.listePmAvisiter, // Liste des points marchands à visiter
//             listeInterventios: group.listeInterventios
//         }));

//         res.status(200).json(routineInfos);
//         sendRoutineUpdates(routineInfos);
//     } catch (error) {
//         console.error("Erreur dans la récupération des infos de routine :", error);
//         if (!res.headersSent) {
//             return res.status(500).json({ error: "Une erreur s'est produite lors de la récupération des routines." });
//         }
//     }
// };
const getRoutineInfosForDcByCommercial = async (req, res, sendRoutineUpdates) => {
    const { idCommercial } = req.body;

    if (!idCommercial) {
        return res.status(400).json({ error: "Il faut indiquer le commercial" });
    }

    try {

        // Aujourd'hui
        const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
        const endOfToday = new Date(new Date().setHours(23, 59, 59, 999));

        // Récupérer tous les agents pour le BDM
        const agents = await prisma.agent.findMany({
            where: {
                type_agent_id: {
                    notIn: [9, 8]
                },
                id: Number(idCommercial) // Filtrer par commercial
            },
            include: { users: true, zone_commerciale: true }
        });

        // Récupérer tous les routings pour le commercial
        const routings = await prisma.routing.findMany({
            where: {
                agent_routing_id: Number(idCommercial), // Filtrer par commercial
                created_at: {
                    gte: startOfToday,
                    lte: endOfToday,
                },
            },
            include: {
                agent: true
            }
        });

        // Récupérer toutes les routines pour le commercial
        const routines = await prisma.routine.findMany({
            where: {
                commercial_routine_id: Number(idCommercial), // Filtrer par commercial
                date_routine: {
                    gte: startOfToday,
                    lte: endOfToday,
                },
            },
            include: {
                agent: true
            },
            orderBy: {
                date_routine: "desc"
            }
        });

        // Recuperer le BDM
        const bdm = await prisma.bdm.findUnique({
            where : {
                id : Number(agents[0].responsable_agent_id)
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
                bdmAgent: agent.bdmAgent || "non défini", // Supposons qu'il y ait un champ pour le BDM
                zone_commerciale: agent.zone_commerciale.nom_zone, // Supposons qu'il y ait un champ pour la zone
                routingsCount: 0,
                totalPointsMarchands: 0,
                routinesCount: 0,
                routineEffectués: 0,
                listePmroutinesVisités: [],
                listePmAvisiter: [], // Liste à visiter
                listeInterventios: [] // Liste des interventions avec date
            };
        });

        // Mettre à jour les statistiques pour les routings
        routings.forEach(routing => {
            const agentId = routing.agent.id;
            groupedByAgent[agentId].routingsCount++;
            groupedByAgent[agentId].totalPointsMarchands = pointsMarchandsDesRoutings.length; // Total points marchands

            // Mise à jour de la liste des points marchands à visiter
            try {
                const points = JSON.parse(routing.pm_routing);
                points.forEach(pm => {
                    const index = groupedByAgent[agentId].listePmAvisiter.findIndex(p => p.nom_Pm === pm.nom_Pm);
                    if (index !== -1) {
                        groupedByAgent[agentId].listePmAvisiter[index].count++;
                    } else {
                        groupedByAgent[agentId].listePmAvisiter.push({ nom_Pm: pm.nom_Pm, count: 1 });
                    }
                });
            } catch (error) {
                console.error(`Erreur lors du parsing des points marchands pour le routing ID ${routing.id}:`, error);
            }
        });

        // Mettre à jour les statistiques pour les routines
        routines.forEach(routine => {
            const agentId = routine.agent.id;
            const isInRoutingPoints = pointsMarchandsDesRoutings.includes(routine.point_marchand_routine);

            if (isInRoutingPoints) {
                groupedByAgent[agentId].routinesCount++;
                
                // Mise à jour de la liste des points marchands visités
                const visitedPmIndex = groupedByAgent[agentId].listePmroutinesVisités.findIndex(pm => pm.nom_Pm === routine.point_marchand_routine);
                if (visitedPmIndex !== -1) {
                    groupedByAgent[agentId].listePmroutinesVisités[visitedPmIndex].count++;
                } else {
                    groupedByAgent[agentId].listePmroutinesVisités.push({ nom_Pm: routine.point_marchand_routine, count: 1 });
                }
            } else {
                groupedByAgent[agentId].routineEffectués++;
            }

            // Mise à jour de la liste des interventions avec date
            groupedByAgent[agentId].listeInterventios.push({
                nom_Pm: routine.point_marchand_routine,
                date: moment(routine.date_routine).format('YYYY-MM-DD HH:mm:ss') // Utilisation de moment pour formater la date
            });
        });

        const routineInfos = Object.values(groupedByAgent).map(group => ({
            agentImage: group.agent.users.image_profile_user,
            id: group.agent.id,
            agent: `${group.agent.prenom_agent} ${group.agent.nom_agent}`,
            bdmAgent: `${bdm.nom_bdm} ${bdm.prenom_bdm}`,
            zone_commerciale: group.agent.zone_commerciale.nom_zone,
            routingsCount: group.routingsCount,
            totalPointsMarchands: group.totalPointsMarchands,
            routinesCount: group.routinesCount,
            routineEffectués: group.routineEffectués,
            listePmroutinesVisités: group.listePmroutinesVisités,
            listePmAvisiter: group.listePmAvisiter, // Liste des points marchands à visiter
            listeInterventios: group.listeInterventios // Liste des interventions avec date
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

//changed
const getRoutineInfos = async (req, res, sendRoutineUpdates) => {
    try {
        const { bdmId } = req.body;
        if (!bdmId) {
            return res.status(400).json({ error: "Le bdmId est requis" });
        }

        // Définir le début et la fin d'aujourd'hui
        const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
        const endOfToday = new Date(new Date().setHours(23, 59, 59, 999));

        // Récupérer tous les agents pour le BDM sans filtrer par type_agent_id
        const agents = await prisma.agent.findMany({
            where: {
                responsable_agent_id: Number(bdmId)
            },
            include: { users: true }
        });

        // Récupérer les routings pour le BDM
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

        // Récupérer les routines pour le BDM
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
            },
            orderBy: { date_routine: "desc" }
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
            agentImage: group.agent.users.image_profile_user,
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

//changed
const getRoutineInfosByDateRange = async (req, res, sendRoutineUpdates) => {
    const { bdmId, dateDebut, dateFin } = req.body;

    if (!bdmId || !dateDebut || !dateFin) {
        return res.status(400).json({ error: "Il faut indiquer le bdmId et les dates" });
    }

    if (dateDebut > dateFin || dateFin < dateDebut) {
        return res.status(400).json({ error: "Indiquez les bons intervalles de dates" });
    }

    try {
        const startOfRange = new Date(`${dateDebut}T00:00:00Z`);
        const endOfRange = new Date(`${dateFin}T23:59:59Z`);

        // Récupérer tous les agents pour le BDM
        const agents = await prisma.agent.findMany({
            where: {
                responsable_agent_id: Number(bdmId)
            },
            include: { users: true }
        });

        // Récupérer les routings pour le BDM
        const routings = await prisma.routing.findMany({
            where: {
                bdm_routing_id: Number(bdmId),
                created_at: {
                    gte: startOfRange,
                    lte: endOfRange
                }
            },
            include: {
                agent: true
            }
        });

        // Récupérer les routines pour les agents du BDM
        const routines = await prisma.routine.findMany({
            where: {
                date_routine: {
                    gte: startOfRange,
                    lte: endOfRange
                },
                agent: {
                    responsable_agent_id: Number(bdmId)
                }
            },
            include: {
                agent: true
            },
            orderBy: { date_routine: "desc" }
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
                // Compter le nombre total de points marchands dans le routing
                const points = JSON.parse(routing.pm_routing);
                groupedByAgent[agentId].totalPointsMarchands += points.length;
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

        const routineInfos = Object.values(groupedByAgent).map(group => ({
            agentImage: group.agent.users.image_profile_user,
            id: group.agent.id,
            agent: `${group.agent.prenom_agent} ${group.agent.nom_agent}`,
            routingsCount: group.routingsCount,
            totalPointsMarchands: group.totalPointsMarchands,
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

module.exports = { makeRoutine 
    ,generateAuthCode 
    ,getRoutine
    ,getRoutineByCommercial
    ,getSnBypointMarchand 
    ,validateAuthCode 
    ,createRouting 
    ,getRoutingByCommercial
    ,importBase64File
    ,getAllRoutingsByBdm
    ,getMyAgents
    ,getPms
    ,getAllRoutinesByBdm
    ,getAllMerchants
    ,getProfile
    ,updateMerchant
    ,getRoutineInfos
    ,getRoutineInfosByDateRange
    ,allRoutines
    ,allRoutings
    ,getRoutineInfosForDC
    ,getRoutineInfosForDcByCommercial
    ,getRoutineInfosForDcByCommercialByDateRange
    ,getRoutineInfosForDCByDateRange
    ,getOneRoutine
};


