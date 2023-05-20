import passport from "passport";
import { logger } from "../log/logger.js";
import _ from "lodash";

const clientRedirectURL = `${process.env.URL}/dev/google`;

export const callback = async (req, res, next) => {
  passport.authenticate("workspace", async (authError, user) => {
    try {
      if (authError) {
        return res.redirect(
          clientRedirectURL + `?message=${encodeURIComponent("AUTH_ERROR")}`
        );
      }

      return res.redirect(
        clientRedirectURL + `?message=${encodeURIComponent("SUCCESS")}`
      );
    } catch (err) {
      return res.redirect(
        clientRedirectURL + `?message=${encodeURIComponent("ERROR")}`
      );
    }
  })(req, res, next);
};

export const find = async (req, res) => {
  try {
    return res.status(200).send({ workspace: req.user.workspace });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const updateAccessToken = async (req, res) => {
  try {
    if (!("accessToken" in req.body) || !("expires" in req.body)) {
      return res.status(400).send({});
    }

    const user = req.user;
    if (!user.workspace) {
      return res.status(404).send({});
    }

    user.workspace.accessToken = req.body.accessToken;
    user.workspace["expires"] = new Date(req.body.expires);
    await user.save();

    return res.status(200).send({ workspace: user.workspace });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const updateCalendars = async (req, res) => {
  try {
    if (!("items" in req.body)) {
      return res.status(400).send({});
    }

    const user = req.user;
    if (!user.workspace) {
      return res.status(404).send({});
    }

    user.workspace.calendars = {
      items: req.body.items,
    };
    await user.save();

    return res.status(200).send({ workspace: user.workspace });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};
export const removeCalendars = async (req, res) => {
  try {
    const user = req.user;
    if (!user.workspace) {
      return res.status(404).send({});
    }

    user.workspace.calendars = undefined;
    await user.save();

    return res.status(200).send({ workspace: user.workspace });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/* delete */

export const remove = async (req, res) => {
  try {
    const user = req.user;

    user.workspace = undefined;
    await user.save();

    return res.status(200).send({ message: "hello world! /v2" });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};
