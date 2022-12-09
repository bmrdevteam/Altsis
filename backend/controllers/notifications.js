const _ = require("lodash");
const { Notification } = require("../models");
const client = require("../caches/redis");

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
      await client.set(
        `isReceivedNotifications/${req.user.academyId}/${notification.userId}`,
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
    const requestPage = parseInt(req.query.page);
    const requestSize = parseInt(req.query.size);
    delete req.query.requestPage;
    delete req.query.requestSize;

    const totalDataCnt = await Notification(req.user.academyId).countDocuments(
      req.query
    );

    const totalPages = Math.ceil(totalDataCnt / requestSize);
    const isLastPage = requestPage === totalPages;
    const isFirstPage = requestPage === 1;

    const notifications = await Notification(req.user.academyId)
      .find(req.query)
      .sort({ createdAt: -1 })
      .limit(requestSize)
      .skip(requestSize * (requestPage - 1));

    if (req.query.type === "received") {
      await client.del(
        `isReceivedNotifications/${req.user.academyId}/${req.query.userId}`
      );
    }

    return res.status(200).send({
      notifications,
      page: {
        totalDataCnt,
        totalPages,
        isLastPage,
        isFirstPage,
        requestPage,
        requestSize,
      },
    });
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
