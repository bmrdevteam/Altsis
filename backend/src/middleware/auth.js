import { conn } from "../_database/mongodb/index.js";
import { client } from "../_database/redis/index.js";
import { PERMISSION_DENIED } from "../messages/index.js";

export const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.status(403).send({ message: PERMISSION_DENIED });
  }
};

export const isNotLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    next();
  } else {
    res.status(403).send({ message: PERMISSION_DENIED });
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
  if (req.isAuthenticated() && req.user.auth === "owner") {
    next();
  } else {
    res.status(403).send();
  }
};

export const ownerToAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.auth === "owner") {
    if (!("academyId" in req.params)) {
      return res.status(400).send();
    }
    if (!conn[req.params.academyId]) {
      return res.status(404).send();
    }
    req.user.academyId = req.params.academyId;
    next();
  } else {
    res.status(403).send();
  }
};

export const isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.auth === "admin") {
    next();
  } else {
    res.status(403).send({ message: PERMISSION_DENIED });
  }
};

// isAdmin || isManager
export const isAdManager = (req, res, next) => {
  if (
    req.isAuthenticated() &&
    (req.user.auth === "admin" || req.user.auth === "manager")
  ) {
    next();
  } else {
    res.status(403).send({ message: PERMISSION_DENIED });
  }
};

// isOwner || isAdmin || isManager
export const isOwAdManager = (req, res, next) => {
  if (
    req.isAuthenticated() &&
    (req.user.auth === "owner" ||
      req.user.auth === "admin" ||
      req.user.auth === "manager")
  ) {
    next();
  } else {
    res.status(403).send({ message: PERMISSION_DENIED });
  }
};


// isOwner || isAdmin
export const isOwAdmin = (req, res, next) => {
  if (
    req.isAuthenticated() &&
    (req.user.auth === "owner" ||
      req.user.auth === "admin")
  ) {
    next();
  } else {
    res.status(403).send({ message: PERMISSION_DENIED });
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
