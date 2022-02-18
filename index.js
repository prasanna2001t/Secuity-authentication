//jshint esversion:6
const express = require('express')
const BodyParser = require('body-parser')
const ejs = require('ejs')
const md5= require('md5')
const mongoose = require('mongoose')
const { append, render } = require('express/lib/response')
const app =express()
const passport = require('passport')
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const passportLocal = require('passport-local')
const findOrCreate = require('mongoose-find-or-create')
const passportLocalMongoose=require('passport-local-mongoose')
const  session  = require('express-session')
const encrypt = require('mongoose-encryption')

require('dotenv').config()

app.use(BodyParser.urlencoded({extended:true}))
app.set('view engine','ejs')
app.use(express.static("public"))
app.use(session({
    secret: process.env.SECRETS,
    resave: false,
    saveUninitialized: false,

}))

app.use(passport.initialize())
app.use(passport.session())
mongoose.connect('mongodb+srv://prasanna:Prasannades1!@cluster0.inwka.mongodb.net/SecurityDB?retryWrites=true&w=majority')


const userSchema = new mongoose.Schema({
  username:String,
    password:String,
    googleId:String,
    secrets:String
})
userSchema.plugin(passportLocalMongoose)
userSchema.plugin(findOrCreate)

const userModel = mongoose.model("User",userSchema)
passport.use(userModel.createStrategy());
passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    userModel.findById(id, function(err, user) {
      done(err, user);
    });
  });
  passport.use(new GoogleStrategy({
    clientID:     process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://googleapis/oauth2/v3/userinfo",
 
  },
  function(request, accessToken, refreshToken, profile, done) {
    userModel.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));             

app.get("/",(req,res)=>{
    res.render("home")
})
app.get("/register",(req,res)=>{
    res.render('register')
})
app.get("/login",(req,res)=>{
    res.render('login')
})
app.get("/secrets",(req,res)=>{
        if(req.isAuthenticated()){
            userModel.find({secrets:{$ne:null}},(err,data)=>{
                if(err){
                    console.log(err);
                }
                else{
                
                       
                           res.render("secrets",{Secret:data})
                           console.log(data);
                        }
                    })
                }
            })
 
app.get("/submit",(req,res)=>{
    if(req.isAuthenticated()){
    res.render("submit")
    }else{
        res.redirect("/login")
    }
})
app.post("/register",(req,res)=>{
    userModel.register({username:req.body.username},req.body.password,(err,data)=>{
        if(err){
            console.log(err);
            res.redirect("/register")
        }
        else{
            passport.authenticate("local")(req,res,()=>{
                res.redirect("/secrets")
            })
        }
    })
})
app.post("/login",(req,res)=>{
    const userinfo=new userModel({username:req.body.username,password:req.body.password})
    req.login(userinfo,(err,data)=>{
        if(err){
            console.log(err);
        }
        else{
           passport.authenticate("local")(req,res,()=>{
                res.redirect("/secrets")
            })
        }
    })
})
app.get("/logout",(req,res)=>{
    req.logout()
    res.redirect("/")
})
app.get('/auth/google',
  passport.authenticate('google', { scope:
      [  'profile' ] }
));

app.get( '/auth/google/secrets',
    passport.authenticate( 'google', {
        successRedirect: '/secrets',
        failureRedirect: '/login'
}));
app.get("/submit",(req,res)=>{
    if(req.isAuthenticated()){
    res.render("submit")
    }
    else{
        res.redirect("/login")
    }
})
app.post("/submit",(req,res)=>{
    console.log(req.user.id);
    userModel.findById(req.user.id,(err,data)=>{
        if(err){
            console.log(err);
        }
        else{
            if(data){
                data.secrets=req.body.secret
                data.save((err)=>{
                    if(err){
                        console.log(err);
                    }
                    else{
                    res.redirect("/secrets")
                             }             })
                
            }
        }
    })
    }
)
app.listen(process.env.PORT||3000,()=>{
    console.log("Server started");
})