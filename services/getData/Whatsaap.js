const axios = require('axios');
require('dotenv').config()

const sendWhatsapp = async(number,mobileCoach,tpes)=>{
  console.log(number)
  console.log(mobileCoach)
  console.log(tpes)

    let data = JSON.stringify({
        "messaging_product": "whatsapp",
        "to": number,
        "type": "template",
        "template": {
          "name": "deploiement_tpe",
          "language": {
            "code": "fr"
          },
          "components": [
              {
                  "type": "body",
                  "parameters":[
                      {
                          "type" : "text",
                          "text" : mobileCoach
                      },
                      {
                          "type" : "text",
                          "text" : tpes
                      }
                  ]
              }
          ]
        }
      });
      
      let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://graph.facebook.com/v18.0/236506329550149/messages',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${process.env.WHATSSAP_TOKEN}`, 
          'Cookie': 'ps_l=0; ps_n=0'
        },
      
        data : data
      };
      
     await axios.request(config)
      .then((response) => {
        console.log(JSON.stringify(response.data));
      })
      .catch((error) => {
        console.log(error);
      });
}
// sendWhatsapp()
module.exports = {sendWhatsapp}
