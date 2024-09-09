const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        // Or use your service account key
        // credential: admin.credential.cert('path/to/serviceAccountKey.json')
    });
}

/**
 * Send a notification message using Firebase Cloud Messaging.
 * 
 * @param {string} token - The FCM device token.
 * @param {string} agentName - The name of the agent receiving the notification.
 * @param {string[]} pmRouting - The list of merchant points for the routing.
 * @param {string} bdmName - The name of the BDM.
 * @returns {Promise<string>} - A promise that resolves with the message ID or rejects with an error.
 */
const sendNotification = async (token, agentName, pmRouting, bdmName) => {
    const pmRoutingList = pmRouting.join(' '); // Format the list of merchant points
    const messageBody = `
ROUTING COMMERCIAL
Bonjour ${agentName},

Voici le routing pour cette semaine :
${pmRoutingList}
Merci de suivre ce routing et de visiter les points marchands mentionnés. Si tu as des questions ou besoin d'informations supplémentaires, n'hésite pas à me contacter.

Cordialement,
${bdmName}
    `;

    const message = {
        notification: {
            title: 'Votre Nouveau Routing Commercial',
            body: messageBody,
        },
        token: token,
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('Successfully sent message:', response);
        return response;
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

module.exports = { sendNotification };
