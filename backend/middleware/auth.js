import { logger } from "../log/logger.js";
import { conn } from "../databases/connection.js";
import { client } from "../caches/redis.js";

export const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.status(403).send({ message: "You are not logged in." });
  }
};

export const isNotLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    next();
  } else {
    res.status(403).send({ message: "You are already logged in." });
  }
};

export const forceNotLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    req.logout((err) => {
      if (err) return res.status(500).send({ err: err.message });
      next();
    });
  } else {
    next();
  }
};

export const isOwner = (req, res, next) => {
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

export const isAdmin = (req, res, next) => {
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
export const isAdManager = (req, res, next) => {
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

export const isOwnerOrAdmin = (req, res, next) => {
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

export const isReceivedNotifications = (req, res, next) => {
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
