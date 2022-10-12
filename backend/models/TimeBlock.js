const mongoose = require("mongoose");

const timeBlockSchema = mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
    },
    day: {
      type: String,
      required: true,
    },
    start: {
      type: String,
      required: true,
    },
    end: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

module.exports = timeBlockSchema;
