const mongoose = require("mongoose");
const { conn } = require("../databases/connection");

const notificationSchema = mongoose.Schema(
  {
    from: {
      type: String,
      required: true,
    },
    to: {
      type: String,
      required: true,
    },
    type: String,
    message: {
      type: String,
      required: true,
    },
    checked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationSchema.index({
  to: 1,
  createdAt: 1,
});

module.exports = (dbName) => {
  return conn[dbName].model("Notification", notificationSchema);
};
