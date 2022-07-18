exports.isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
       next();
    } else {
       res.status(403).send({message:"You are not logged in."});
    }
 };

 exports.isNotLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
       next();
    } else {
        res.status(403).send({message:"You are already logged in."});
    }
 };

 exports.isOwner = (req, res, next) => {
   if (req.isAuthenticated()) {
      if(req.session.passport.user.auth=='owner'){
         next();
      }
      else{
         res.status(401).send({message:"You are not authorized."});
      }
   } else {
      res.status(403).send({message:"You are not logged in."});
   }
};

exports.isAdmin = (req, res, next) => {
   if (req.isAuthenticated()) {
      if(req.session.passport.user.auth=='admin'
      &&req.session.passport.user.academy==req.body.academy){
         next();
      }
      else{
         res.status(401).send({message:"You are not authorized."});
      }
   } else {
      res.status(403).send({message:"You are not logged in."});
   }
};

exports.authorize = (req, res, next) => {
   if (req.isAuthenticated()) {
      if(req.session.passport.user.auth=='owner'&&(req.body.auth=='admin'||req.body.auth=='member')){
         next();
      }
      else if(req.session.passport.user.auth=='admin'&&req.body.auth=='member'){
         next();
      }
      else{
         res.status(401).send({message:"You are not authorized."});
      }
   } else {
      res.status(403).send({message:"You are not logged in."});
   }
};