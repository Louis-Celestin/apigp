const prisma = require('@prisma/client');

const validate = async (agentID, code) => {
    try {
        const agent = await prisma.agent.findUnique({
            where: { id: Number(agentID) }
        });

        if (!agent) {
            return { valid: false, message: "Cet agent n'existe pas" };
        }

        if (agent.code_authorisation_agent === code) {
            return { valid: true };
        } else {
            return { valid: false, message: "Code invalide" };
        }
    } catch (error) {
        console.log(error);
        throw new Error("Une erreur s'est produite lors de la validation du code d'autorisation");
    }
};

module.exports = {
    validate
};
