const {PrismaClient} = require('@prisma/client')
const prisma = new PrismaClient()


const checklivraisonFields = (req,res,next)=>{

    const agentSaisieLivraison = req.body.agentSaisie
    const agentValidateurLivraison = req.body.agentValidateur
    const tpes = req.body.tpes
    



    

}


module.exports = {checklivraisonFields}