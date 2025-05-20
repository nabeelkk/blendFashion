const jwt = require('jsonwebtoken');

const authenticateJwt = (req,res,next)=>{
    const token = req.cookies.token

    if(!token){
        res.redirect('/admin/login');
    }

    jwt.verify(token,process.env.JWT_SECRET,(err,admin)=>{
        if(err){
            return res.redirect('/admin/login?error=Inavalid%20Token')
        }
        req.admin = admin;
        next();
    })

}

const authenticateSession = (req,res,next)=>{
    if(!req.session.admin){
        return res.redirect('/admin/login');
    }
    req.admin = req.session.admin;
    next();
}

const adminAuth =(req,res,next)=>{
    if(req.session && req.session.admin){
        next();
    }else{
        res.redirect('/admin/login');
    }
}





const authMiddleware = process.env.AUTH_METHOD === 'JWT' ? authenticateJwt : authenticateSession;
module.exports = {authMiddleware , adminAuth};