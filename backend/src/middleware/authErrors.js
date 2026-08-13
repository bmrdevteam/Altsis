import { NOT_LOGGED_IN, PERMISSION_DENIED } from "../messages/index.js";

/**
 * If the request is not authenticated, send 401 and return true.
 * Callers should return immediately when this is true.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {boolean}
 */
export const rejectUnauthenticated = (req, res) => {
  if (typeof req.isAuthenticated === "function" && req.isAuthenticated()) {
    return false;
  }
  res.status(401).send({ message: NOT_LOGGED_IN });
  return true;
};

export { NOT_LOGGED_IN, PERMISSION_DENIED };
