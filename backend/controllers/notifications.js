const _ = require("lodash");
const { Notification } = require("../models");
const client = require("../caches/redis");

module.exports.create = async (req, res) => {
  try {
    const _Notification = Notification(req.user.academyId);
    const notification = new _Notification({
      ...req.body,
      from: req.user.userId,
    });
    await notification.save();

    await client.set(
      `isReceivedNotifications/${req.user.academyId}/${req.body.to}`,
      "true"
    );

    return res.status(200).send(notification);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.find = async (req, res) => {
  try {
    const notifications = await Notification(req.user.academyId).find(
      req.query
    );

    await client.del(
      `isReceivedNotifications/${req.user.academyId}/${req.query.to}`
    );

    return res.status(200).send({ notifications });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.check = async (req, res) => {
  try {
    await Notification(req.user.academyId).findByIdAndUpdate(req.params._id, {
      checked: true,
    });

    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.uncheck = async (req, res) => {
  try {
    await Notification(req.user.academyId).findByIdAndUpdate(req.params._id, {
      checked: false,
    });

    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.remove = async (req, res) => {
  try {
    const notification = await Notification(req.user.academyId).findById(
      req.params._id
    );
    if (!notification) return res.status(404).send({ message: "td not found" });

    await notification.remove();
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};
