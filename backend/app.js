const express = require('express');
const cookieParser = require('cookie-parser');;
const mongoose=require('mongoose')
const cors = require('cors')
const session=require('express-session')
const passport=require('passport')

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
        httpOnly: true, // 브라우저에서 쿠키값에 대한 접근을 하지 못하게 막는다.
        secure: false, // HTTPS 통신 외에서는 쿠키를 전달하지 않는다.
     },
  }),
);
app.use(passport.initialize()); 
app.use(passport.session()); //반드시 app.use(session(...)) 아래에 있어야 함

app.use('/api/user', userRouter);
app.use('/api/test', testRouter);

module.exports = app;

app.set('port',process.env.PORT||3000);
var server=app.listen(app.get('port'),function(){
  console.log('Express server listening on port '+server.address().port);
});