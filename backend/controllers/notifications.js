const _ = require("lodash");
const { Notification } = require("../models");
const client = require("../caches/redis");
const { getIo } = require("../utils/webSocket");

module.exports.send = async (req, res) => {
  try {
    const baseReceived = {
      type: "received",
      checked: false,
      fromUserId: req.user.userId,
      fromUserName: req.user.userName,
      category: req.body.category,
      title: req.body.title,
      description: req.body.description,
    };

    const notifications = req.body.toUserList.map((user) => ({
      ...baseReceived,
      userId: user.userId,
      userName: user.userName,
    }));

    notifications.push({
      type: "sent",
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
      // await client.set(
      //   `isReceivedNotifications/${req.user.academyId}/${notification.userId}`,
      //   "true"
      // );

      const sid = await client.v4.hGet(req.user.academyId, notification.userId);
      console.log(
        `receiver ${notification.userId} is ${
          sid ? `currently logged in. sid is ${sid}` : `not logged in`
        }`
      );
      if (sid)
        getIo()
          .to(sid)
          .emit(
            "checkNotifications",
            "you should check your new notifications"
          );

      // if (sid) {
      //   getIo()
      //     .sockets.socket(sid)
      //     .send("you should check your new notifications");
      // }
    }

    return res.status(200).send({ notifications: newNotifications });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.find = async (req, res) => {
  try {
    // const notifications = await Notification(req.user.academyId)
    //   .find(req.query)
    //   .sort({ createdAt: -1 })
    //   .limit(requestSize)
    //   .skip(requestSize * (requestPage - 1));

    if (req.params._id) {
      const notification = await Notification(req.user.academyId).findById(
        req.params._id
      );
      if (notification.userId != req.user.userId) return res.status(401).send();
      return res.status(200).send(notification);
    }

    const notifications = await Notification(req.user.academyId)
      .find(req.query)
      .select("-description");

    // if (req.query.type === "received") {
    //   await client.del(
    //     `isReceivedNotifications/${req.user.academyId}/${req.query.userId}`
    //   );
    // }

    return res
      .status(200)
      .send({ notifications: _.sortBy(notifications, "createdAt").reverse() });
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
    const ids = _.split(req.params._ids, "&");
    const result = await Notification(req.user.academyId).deleteMany({
      _id: { $in: ids },
    });

    return res.status(200).send(result);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};
