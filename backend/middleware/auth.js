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

 exports.profileExists=(req, res, next) => {
   if(req.session.profile){
      next();
   }
   else {
       res.status(403).send({message:"Invalid request"});
   }
};
