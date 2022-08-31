exports.isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.status(403).send({ message: "You are not logged in." });
    }
};

exports.isNotLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        next();
    } else {
        res.status(403).send({ message: "You are already logged in." });
    }
};

exports.forceNotLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        req.logout((err) => {
            if (err) return res.status(500).send({ err: err.message });
        });
    }
    next();
};

exports.isOwner = (req, res, next) => {
    if (req.isAuthenticated()) {
        if (req.user.auth == "owner") {
            next();
        } else {
            res.status(401).send({ message: "You are not authorized." });
        }
    } else {
        res.status(403).send({ message: "You are not logged in." });
    }
};

exports.isAdmin = (req, res, next) => {
    if (req.isAuthenticated()) {
        if (req.user.auth == "admin") {
            next();
        } else {
            res.status(401).send({ message: "You are not authorized." });
        }
    } else {
        res.status(403).send({ message: "You are not logged in." });
    }
};
// isAdmin + isManager
exports.isAdManager = (req, res, next) => {
    if (req.isAuthenticated()) {
        if (req.user.auth == "admin" || req.user.auth == "manager") {
            next();
        } else {
            res.status(401).send({ message: "You are not authorized." });
        }
    } else {
        res.status(403).send({ message: "You are not logged in." });
    }
};

exports.isOwnerOrAdmin = (req, res, next) => {
    if (req.isAuthenticated()) {
        if (req.user.auth == "owner" || req.user.auth == "admin") {
            next();
        } else {
            res.status(401).send({ message: "You are not authorized." });
        }
    } else {
        res.status(403).send({ message: "You are not logged in." });
    }
};
