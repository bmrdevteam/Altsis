const _ = require("lodash");
const { Notification } = require("../models");
const client = require("../caches/redis");

module.exports.create = async (req, res) => {
  try {
    const base = {
      fromUserId: req.user.userId,
      fromUserName: req.user.userName,
      type: req.body.type,
      message: req.body.message,
    };

    const notifications = req.body.toUsers.map((toUser) => {
      return {
        ...base,
        toUserId: toUser.userId,
        toUserName: toUser.userName,
      };
    });

    const newNotifications = await Notification(req.user.academyId).insertMany(
      notifications
    );

    for (let notification of newNotifications) {
      await client.set(
        `isReceivedNotifications/${req.user.academyId}/${notification.toUserId}`,
        "true"
      );
    }

    return res.status(200).send({ notifications: newNotifications });
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
      `isReceivedNotifications/${req.user.academyId}/${req.query.toUserId}`
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
