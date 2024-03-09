const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport(
    { 
        host: 'smtp.office365.com',
        port: '587',
        auth: { user: 'louis@greenpayci.com', pass: 'Qor78540' },
        secureConnection: false,
        tls: { ciphers: 'SSLv3' },
        
    })


async function main(){
    const info = await transporter.sendMail({
        from : ' "Support Dev-Green-Pay" <louis@greenpayci.com>',
        to : "kevin@greenpayci.com",
        subject : "AVIS DE DEPLOIEMENT TPE",
        text : "Bonjour Kevin, je vous informe que vous avez le terminal de ....... a recuperer pour un deploiement"
    }).then(sent=>{
        if(sent.messageId){
            console.log(sent.messageId)
        }else{
            console.log("Not sent")
        }
    }).catch(err=>{
        console.log(err)
    })
}
main()