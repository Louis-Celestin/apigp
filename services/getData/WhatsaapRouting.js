const axios = require('axios');

const sendWhatsappRouting = async (number, mobileCoach, pms, resposable) => {
    console.log('Number:', number);
    console.log('Mobile Coach:', mobileCoach);
    console.log('Points Marchands:', pms);
    console.log('Responsable:', resposable);

    // Extraction des noms des points marchands et remplacement des nouvelles lignes par des virgules
    let pmTexts = pms.map(pm => pm.nom_Pm).join('; ');

    let data = JSON.stringify({
        "messaging_product": "whatsapp",
        "to": number,
        "type": "template",
        "template": {
            "name": "validation_tpe",
            "language": {
                "code": "fr"
            },
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {
                            "type": "text",
                            "text": mobileCoach
                        },
                        {
                            "type": "text",
                            "text": pmTexts
                        },
                        {
                            "type": "text",
                            "text": resposable
                        }
                    ]
                }
            ]
        }
    });

    console.log('Data JSON:', data);

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://graph.facebook.com/v20.0/236506329550149/messages',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer EAAZAn2JABS9cBO5G71ApZA3TyfGmrnhTqHheRoALuqaztSq7NB899GkCYkkb9DDvAAHcOgAZAqSWZBxZBL35LsoM85ZBAO8Vl21WZAfE8lqnPHaHTZAG9yZCGcXBlHP4ctJdLyU9925j3xfZAsopmvh0ry7OJozKx4huMGLVI6LMQEmAILzpU4gCiLVqwk9M3ETDHWs0QdmJRBaPVDdEo9vpUZD', // Remplacez par votre token d'autorisation
            'Cookie': 'ps_l=0; ps_n=0'
        },
        data: data
    };

    try {
        const response = await axios(config);
        console.log('Response:', JSON.stringify(response.data));
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
};

module.exports = { sendWhatsappRouting };
