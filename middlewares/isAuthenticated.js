function isAuthenticated(req,res,next){

    if(req.session.user && req.session.isAuth){
       return next()
    }else{
       return res.redirect('/login');
    }
}

module.exports = isAuthenticated