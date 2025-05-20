const nodemailer = require('nodemailer');

const transport = nodemailer.createTransport({
    service:'gmail',
    auth:{
        user:process.env.MYGMAIL,
        pass:process.env.GMAILPASS
    },
    tls:{
        rejectUnauthorized:false
    }
})



module.exports = transport