const { logger } = require("../log/logger");
const { conn } = require("../databases/connection");
const client = require("../caches/redis");

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
      next();
    });
  } else {
    next();
  }
};

exports.isOwner = (req, res, next) => {
  if (req.isAuthenticated()) {
    if (req.user.auth == "owner") {
      if (req.params.academyId) {
        if (conn[req.params.academyId]) {
          req.user.academyId = req.params.academyId;
        } else {
          return res.status(404).send({ message: "Academy not found" });
        }
      }
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

authRank = {
  owner: 1,
  admin: 2,
  manager: 3,
  member: 4,
};

exports.isLower = (auth1, auth2) => {
  return authRank[auth1] > authRank[auth2];
};

exports.isReceivedNotifications = (req, res, next) => {
  if (!req.query.updated) next();
  else {
    client.get(
      `isReceivedNotifications/${req.user.academyId}/${req.query.userId}`,
      (err, value) => {
        if (err) res.status(409).send({ message: err.message });
        if (value) next();
        else {
          res.status(200).send();
        }
      }
    );
  }
};
