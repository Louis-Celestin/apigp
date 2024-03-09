const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const validator = require("validator")
const bcrypt = require("bcryptjs")

const checkUser = async (req,res,next)=>{

    const username = req.body.username
    const password  = req.body.password
    const agent = req.body.agent
    const role = req.body.role

    if(validator.isEmpty(req.body.username) || validator.isEmpty(req.body.password) || validator.isEmpty(req.body.agent) || validator.isEmpty(req.body.role)){
        console.log("Tous les champs sont obligatoires")
    }else{
        prisma.users.findMany({
            where:{
                username_user : req.body.username
            }
        }).then(result=>{
            if(result.length){
                return res.status(400).json({message: "Deja existant"})
            }
            
        }).catch(err=>{
            console.log("Erreur : "+err)
        })
    }

    next()
}

const checkIfExists = async(req,res,next)=>{
    const username = req.body.username
    const password = req.body.password

    if(validator.isEmpty(username) || validator.isEmpty(password)){
        return res.status(400).json({message : "Tous les champs sont obligatoires"})
    }else{
        await prisma.users.findMany({
            where : {
                username_user : username
            }
        }).then(users =>{
            if(!users.length){
                return res.status(400).json({message : "cet utilisateur n'existe pas"})
            }  
        })
    }
    next()
}

module.exports = {checkUser,checkIfExists}