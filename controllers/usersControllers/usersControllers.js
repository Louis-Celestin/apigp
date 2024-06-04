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

const login = async (req, res, next) => {

    console.log(req.body)

    const username = req.body.username;
    const password = req.body.password;

    

    prisma.users
        .findMany({
            include: {
                agent: true
            },
            where: {
                username_user: username,
            },
        })
        .then((user) => {
            if (user.length) {
                bcrypt
                    .compare(
                        password, user[0].password_user, (err,isMatch)=>{

                            if(isMatch){
                                const token = Jwt.sign({iduser : user[0].id},"SECRETKEY", {expiresIn : "1h"})
                                user[0].password_user = undefined
                                user[0].agent = undefined
                                user[0].token = token
                                return res.status(200).json(
                                    user[0]
                                )
                            }else{
                                return res.status(400).json({message : "nom utilisateur ou mot de passe incorrect"})
                            }
                        }
                    )

                    }}).catch(err=>{
                        return res.status(400).json({message : "nom utilisateur ou mot de passe incorrect"})
                    })
};
module.exports = { register, login };
