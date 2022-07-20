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
      if(req.session.passport.user.auth=='admin'){
         req.academy=req.session.passport.user.academy;
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
      if(req.session.passport.user.auth=='owner'){
         req.auth='admin'; //owner can CRUD admins
         if(req.body.academy){
            req.academy=req.body.academy;
            next();
         }
         else if(req.query.academy){
            req.academy=req.query.academy;
            delete req.query.academy;
            next();
         }
         else{
            return res.status(409).send({message:"academy info is needed"});
         }
      }
      else if(req.session.passport.user.auth=='admin'){
         req.auth='member'; //admin can CRUD members
         req.academy=req.session.passport.user.academy;
         next();
      }
      else{
         return res.status(401).send({message:"You are not authorized."});
      }
   } else {
      return res.status(403).send({message:"You are not logged in."});
   }
};