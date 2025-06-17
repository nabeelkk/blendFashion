require('dotenv').config();
const express = require('express');
const ejsLayout = require('express-ejs-layouts');
const session = require('express-session');
const flash = require('connect-flash');
const adminRouter = require('./routes/adminRoutes');
const userRouter = require('./routes/userRoutes');
const connectDb = require('./config/db');
const cookieParser = require('cookie-parser');
const nocache = require('nocache')
const passport = require('passport')
const cors = require('cors')
const fileUpload = require('express-fileupload')
const path = require('path')
const fs = require('fs')





const port = 5001||process.env.PORT;
const app = express();

connectDb();

require('./config/passport');
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:false,
    cookie: { secure: false,maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(flash());
app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

app.use(nocache());
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: tempDir
}));

app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    next();
}); 
app.use(cors());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('public/uploads'));
app.use(ejsLayout);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/',userRouter)
app.use('/admin',adminRouter);

app.set('view engine','ejs');
app.set('layout','layouts/main')
app.set('views', path.join(__dirname, 'views'));

app.listen(port,()=>{
    console.log(`server running on http://localhost:${port}`) })
  