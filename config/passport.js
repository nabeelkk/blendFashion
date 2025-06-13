const passport = require('passport');
const googleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../modal/userModal');

passport.use(new googleStrategy({
    clientID:process.env.GOOGLE_CLIENTID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:"http://blendfashion.nabeelkk.store/user/google/callback"
},

    async (accessToken,refreshToken,profile,done)=>{
        try {
            
            let user = await User.findOne({googleId:profile.id});
            
            if(!user){ 

                const newUser = new User({
                    name:profile.displayName,
                    email:profile.emails[0].value,
                    googleId:profile.id,
                    isVerified:true,
                    isBlocked:false,
                    isDeleted:false
                })
                await newUser.save()
                return done(null,newUser)
            }
            if(user.isBlocked){
                return done(null,false)
            }
            
            return done(null,user)
        } catch (error) {
            done(error,null)
        }
    }

))

passport.serializeUser((user,done)=>done(null,user.id));
passport.deserializeUser(async(id,done)=>{
    try {
        const user = await User.findById(id);
        done(null,user)
    } catch (error) {
        done(error,null);
    }
})