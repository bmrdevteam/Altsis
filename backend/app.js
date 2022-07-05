const express = require('express');
const cookieParser = require('cookie-parser');;
const mongoose=require('mongoose')
const cors = require('cors')
const passport=require('passport')
const session=require('express-session')

const config=require('./config/config.js')
const passportConfig=require('./passport')

const testRouter = require('./routes/test');
const userRouter = require('./routes/user');

const app = express();
passportConfig();

mongoose.connect(config["url"])
.then(() => console.log('MongoDB connection is made.'))
.catch(err => console.log(err));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors())

app.use(
  session({
     resave: false, // req마다 session 새로 저장
     saveUninitialized: false, // uninitialized session 저장하는 것을 막음
     secret: config['session-key'],
     cookie: {
        httpOnly: true,
        secure: false,
     },
  }),
);
app.use(passport.initialize()); 
app.use(passport.session());

app.use('/api/user', userRouter);
app.use('/api/test', testRouter);

module.exports = app;

app.set('port',process.env.PORT||3000);
var server=app.listen(app.get('port'),function(){
  console.log('Express server listening on port '+server.address().port);
});