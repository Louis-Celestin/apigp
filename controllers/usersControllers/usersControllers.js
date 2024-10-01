const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");
const Jwt = require("jsonwebtoken");

const register = async (req, res, next) => {
    const username = req.body.username;
    const password = req.body.password;
    const agent = req.body.agent;
    const role = req.body.role;

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            throw err;
        } else {
            prisma.users
                .create({
                    data: {
                        username_user: username,
                        password_user: hash,
                        agent_user_id: Number(agent),
                        role_user_id: Number(role),
                    },
                })
                .then((results) => {
                    return res.status(200).json({ mesage: "Inscription reussie" });
                })
                .catch((err) => {
                    return res.status(500).json({ message: "Ereur Serveur" + err });
                });
        }
    });
};

// const login = async (req, res, next) => {
//   try {
//     console.log(req.body);

//     const { username, password } = req.body;
//     let bdmId;

//     // Trouver l'utilisateur avec l'agent associé
//     const users = await prisma.users.findMany({
//       include: {
//         agent: true,
//       },
//       where: {
//         username_user: username,
//       },
//     });

//     if (users.length === 0) {
//       return res.status(400).json({ message: "Nom d'utilisateur ou mot de passe incorrect" });
//     }

//     const user = users[0];
//     const isMatch = await bcrypt.compare(password, user.password_user);

//     if (!isMatch) {
//       return res.status(400).json({ message: "Nom d'utilisateur ou mot de passe incorrect" });
//     }

//     // Trouver le BDM associé à l'agent
//     if (user.agent) {
//       const bdm = await prisma.bdm.findMany({
//         where: { agent_bdm_id: Number(user.agent_user_id) },
//         select: { id: true },
//       });

//       if (bdm.length) {
//         bdmId = bdm[0].id;
//       } else {
//         console.log("PAS DE DONNEES");
//       }
//     }

//     // Créer un token JWT
//     const token = Jwt.sign({ iduser: user.id }, "SECRETKEY", { expiresIn: "1h" });
//     user.password_user = undefined;
//     user.agent = undefined;
//     user.token = token;

//     // Inclure globalVariable dans la réponse
//     return res.status(200).json({
//       user,
//       bdmId
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(400).json({ message: "Erreur lors de la connexion" });
//   }
// };

const login = async (req, res, next) => {
  try {
    console.log(req.body);

    const { username, password } = req.body;
    let bdmId;

    // Trouver l'utilisateur avec l'agent associé
    const users = await prisma.users.findMany({
      include: {
        agent: true,
      },
      where: {
        username_user: username,
      },
    });

    if (users.length === 0) {
      return res.status(400).json({ message: "Nom d'utilisateur ou mot de passe incorrect" });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_user);

    if (!isMatch) {
      return res.status(400).json({ message: "Nom d'utilisateur ou mot de passe incorrect" });
    }

    // Trouver le BDM associé à l'agent
    if (user.agent) {
      const bdm = await prisma.bdm.findMany({
        where: { agent_bdm_id: Number(user.agent_user_id) },
        select: { id: true },
      });
      if (bdm.length) {
        bdmId = bdm[0].id;
      } else {
        console.log("PAS DE DONNEES");
      }
    }

    // Créer un token JWT
    const token = Jwt.sign({ iduser: user.id }, "SECRETKEY", { expiresIn: "1h" });
    user.password_user = undefined;
    // user.agent = undefined;
    user.token = token;

    // Inclure globalVariable dans la réponse
    return res.status(200).json({
      user,
      bdmId
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la connexion" });
  }
};



const updateFcmUserToken = async(req,res)=>{

    const userId = req.body.userId
    const fcmToken = req.body.fcmToken

    console.log(userId)
    console.log(fcmToken)

    if(!userId || !fcmToken){
      return res.status(400).json({message:"Tous les champs sont obligatoires"})
    }
    const user = await prisma.users.findUnique({where:{id :Number(userId)}})

    if(!user){
      return res.status(401).json({message:"Cet utilisateur n'existe pas"})
    }else{
  await prisma.users.update({data : {fcm_token_user : fcmToken},where : {id : Number(userId)}}).then((result)=>{
    if(result){
      return res.status(200).json({message:"Token mis à jour"})
    }
  })

    }

  }




// const login = async (req, res, next) => {
//     try {
//       console.log(req.body);
  
//       const { username, password } = req.body;
  
//       // Trouver l'utilisateur avec l'agent associé
//       const users = await prisma.users.findMany({
//         include: {
//           agent: true,
//         },
//         where: {
//           username_user: username,
//         },
//       });
  
//       if (users.length === 0) {
//         return res.status(400).json({ message: "Nom d'utilisateur ou mot de passe incorrect" });
//       }
  
//       const user = users[0];
  
//       // Comparer le mot de passe
//       const isMatch = await bcrypt.compare(password, user.password_user);
  
//       if (!isMatch) {
//         return res.status(400).json({ message: "Nom d'utilisateur ou mot de passe incorrect" });
//       }
  
//       // Créer un token JWT
//       const token = Jwt.sign({ iduser: user.id }, "SECRETKEY", { expiresIn: "1h" });
//       user.password_user = undefined;
//       user.agent = undefined;
  
//       // Trouver le BDM associé à l'agent
//       if (user.agent) {
//         const bdm = await prisma.bdm.findUnique({
//           where: { agent_bdm_id: user.agent.id },
//         });
//         console.log(bdm)
//       }
  
//       user.token = token;
  
//       return res.status(200).json(user);
  
//     } catch (err) {
//       console.error(err);
//       return res.status(400).json({ message: "Erreur lors de la connexion" });
//     }
//   };  
module.exports = { register, login,updateFcmUserToken };
