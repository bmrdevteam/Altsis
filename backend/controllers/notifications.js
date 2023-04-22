const { logger } = require("../log/logger");
const _ = require("lodash");
const { Notification } = require("../models");
const client = require("../caches/redis");
const { getIo } = require("../utils/webSocket");
const ObjectId = require("mongoose").Types.ObjectId;

module.exports.send = async (req, res) => {
  try {
    // received notifications
    const notifications = req.body.toUserList.map((user) => ({
      type: "received",
      user: user.user,
      userId: user.userId,
      userName: user.userName,
      checked: false,
      fromUser: req.user._id,
      fromUserId: req.user.userId,
      fromUserName: req.user.userName,
      category: req.body.category,
      title: req.body.title,
      description: req.body.description,
    }));

    // sent notifications
    notifications.push({
      type: "sent",
      user: req.user._id,
      userId: req.user.userId,
      userName: req.user.userName,
      toUserList: req.body.toUserList,
      category: req.body.category,
      title: req.body.title,
      description: req.body.description,
    });

    const newNotifications = await Notification(req.user.academyId).insertMany(
      notifications
    );

    for (let notification of _.filter(newNotifications, { type: "received" })) {
      const socketData = await client.v4.hGet(
        req.user.academyId,
        notification.userId
      ); // if receiver is logged in
      if (socketData) {
        JSON.parse(socketData).sid.forEach((sid) => {
          getIo()
            .to(sid)
            .emit(
              "checkNotifications",
              "you should check your new notifications"
            );
        });
      }

      // if (sid) {
      //   getIo()
      //     .sockets.socket(sid)
      //     .send("you should check your new notifications");
      // }
    }

    return res.status(200).send({ notifications: newNotifications });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

module.exports.find = async (req, res) => {
  try {
    if (req.params._id) {
      const notification = await Notification(req.user.academyId).findById(
        req.params._id
      );

      if (!notification.user._id.equals(req.user._id))
        return res.status(401).send();
      return res.status(200).send(notification);
    }
    if (!req.query.user) return res.status(400).send();
    if (req.query.user !== req.user._id.toString())
      return res.status(401).send();

    const notifications = await Notification(req.user.academyId)
      .find(req.query)
      .select("-description");

    return res
      .status(200)
      .send({ notifications: _.sortBy(notifications, "createdAt").reverse() });
  } catch (err) {
    logger.error(err.message);
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
    logger.error(err.message);
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
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

module.exports.remove = async (req, res) => {
  try {
    if (!req.query._ids) return res.status(400).send();
    const _idList = _.split(req.query._ids, ",");
    const notifications = await Notification(req.user.academyId).find({
      _id: { $in: _idList },
    });

    const removes = [];
    notifications.forEach((notification) => {
      if (!notification.user.equals(req.user._id))
        return res.status(401).send();
      removes.push(notification.remove());
    });

    await Promise.all(removes);
    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};
