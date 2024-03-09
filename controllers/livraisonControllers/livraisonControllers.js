const uuid = require("uuid");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const format = require("date-format");
const cnx = require("../../services/getData/dbConnect");
const cnx1 = require("../../services/getData/dbConnectlocal")
const getTpe = require("../../services/getData/getTpes");
const { sendWhatsapp } = require("../../services/getData/Whatsaap");

const getAllLivraison = async (req, res, next) => {
  const livraisons = await prisma.livraison.findMany();
  return res.status(200).json({ livraisons });
};

const getOneLivraison = async (req, res, next) => {
  const idLivraison = req.params.idLivraison;
  await prisma.livraison
    .findMany({
      where: { id: Number(idLivraison) },
    })
    .then((id) => {
      if (id.length) {
        return res.status(200).json({ data: id });
      } else {
        return res
          .status(400)
          .json({ message: "cette livraison n'existe pas" });
      }
    })
    .catch((err) => {
      console.log(err);
    });
};

const saveLivraison = async (req, res, next) => {
  const numeroLivraion = "DC-" + uuid.v4().toUpperCase();
  const statutLivraison = "En attente";
  const agentSaisieDt = req.body.agentSaisieDt;
  const dateLivraison = format.now();
  const tpes = req.body.tpes;

  await prisma.livraison
    .create({
      data: {
        date_livraison: dateLivraison,
        numero_livraison: numeroLivraion,
        statut_livraison: statutLivraison,
        tpes: tpes,
        agent_saisielivraison_id: Number(agentSaisieDt),
        agent_validateur_livraison_id: null,
      },
    })
    .then((livraison) => {
      if (livraison) {
        console.log(livraison.tpes);
        const parsedArray = JSON.parse(livraison.tpes);
        const tpes = JSON.parse(parsedArray);
        console.log(tpes);
        for (let i = 0; i < tpes.length; i++) {
          prisma.tpe_livraison
            .create({
              data: {
                sn_tpe_livraison: String(tpes[i]),
              },
            })
            .then((res) => {
              console.log(res);
            })
            .catch((err) => {
              console.log(err);
            });
        }
        return res
          .status(200)
          .json({ message: "Livraison enregistrée", data: livraison });
      }
    })
    .catch((err) => {
      console.log(err);
      return res.status(400).json({ message: "Une erreur s'est produite" });
    });
};

const validerLivraison = async (req, res, next) => {
  try {
    const idLivraison = req.params.idLivraison;
    const agentValidateur = req.body.agentValidateur;

    const found = await prisma.livraison.findMany({
      where: { id: Number(idLivraison) },
    });

    if (found.length === 0) {
      return res.status(400).json({ message: "Cette livraison n'existe pas" });
    }

    const livraison = found[0];

    if (livraison.agent_validateur_livraison_id !== null) {
      return res.json({ message: "Cette livraison est déjà validée" });
    }

    const updated = await prisma.livraison.update({
      where: { id: Number(idLivraison) },
      data: {
        agent_saisielivraison_id: Number(livraison.agent_saisielivraison_id),
        agent_validateur_livraison_id: Number(agentValidateur),
        date_livraison: format.now(),
        numero_livraison: livraison.numero_livraison,
        statut_livraison: "En attente de déploiement",
      },
    });

    const tpeIds = JSON.parse(updated.tpes);
    const tp = JSON.parse(tpeIds)

    // Récupérer les TPE associés à la livraison
    const tpePromises = tp.map(async (tpeId) => {
      const results = await new Promise((resolve, reject) => {
        cnx.conn.query(
          "SELECT POINT_MARCHAND.POINT_MARCHAND, TPE.ID_TERMINAL, POINT_MARCHAND.ZONE_GP, TPE.SERIAL_NUMBER FROM TPE INNER JOIN POINT_MARCHAND ON TPE.POINT_MARCHAND = POINT_MARCHAND.POINT_MARCHAND WHERE TPE.ID_TERMINAL = ?",
          tpeId,
          (error, results, fields) => {
            if (error) {
              reject(error);
            } else {
              resolve(results);
            }
          }
        );
      });
      return results;
    });

    const tpeResults = await Promise.all(tpePromises);

    // Récupérer les agents dans les zones correspondantes
    const agentPromises = [];
    for (const zone of tpeResults) {
      for (const tpe of zone) {
        const promise = new Promise((resolve, reject) => {
          cnx1.conn.query(
            "SELECT * FROM agent INNER JOIN zone_commerciale ON agent.zone_commerciale_id = zone_commerciale.id WHERE zone_commerciale.nom_zone = ?",
            tpe.ZONE_GP,
            (error, results, fields) => {
              if (error) {
                reject(error);
              } else {
                resolve(results);
              }
            }
          );
        });
        agentPromises.push(promise);
      }
    }



    // Attendre que toutes les promesses sur les agents soient résolues
    const agentsData = await Promise.all(agentPromises);

    agentsData.forEach(agentData => {
      const agent = agentData[0]; // Récupérer les données de l'agent
      const matchingTpe = tpeResults.find(tpeData => tpeData[0].ZONE_GP === agent.nom_zone); // Trouver le TPE correspondant à l'agent

      if (matchingTpe) {
        const tpe = matchingTpe[0]; // Récupérer les données du TPE correspondant

        // Construire le message WhatsApp avec la concatenation de POINT_MARCHAND et SERIAL_NUMBER
        // const message = `Bonjour ${agent.nom_agent}, vous avez un nouveau message concernant votre TPE ${tpe.POINT_MARCHAND} (${tpe.SERIAL_NUMBER}).`;
        
        // Appeler la fonction pour envoyer le message WhatsApp
        sendWhatsapp("+225"+agent.numero_telephone_agent, agent.nom_agent, `${tpe.POINT_MARCHAND} - ${tpe.SERIAL_NUMBER}`).then(msg=>{
          console.log("ok")
        }).catch(err=>{
          console.log("Erreur"+err)
        })
      }
    });

    console.log(agentsData)
    console.log(tpeResults)
    // Envoyer un message à chaque agent avec les TPE associés


    return res.json({ message: "Livraison validée avec succès" });
  } catch (error) {
    console.error("Erreur lors de la validation de la livraison :", error);
    return res
      .status(500)
      .json({
        message:
          "Une erreur s'est produite lors de la validation de la livraison",
      });
  }
};

module.exports = {
  saveLivraison,
  getAllLivraison,
  getOneLivraison,
  saveLivraison,
  validerLivraison,
};
