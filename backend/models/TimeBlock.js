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

timeBlockSchema.methods.isEqual = function (timeBlock) {
  if (
    this.label != timeBlock.label ||
    this.day != timeBlock.day ||
    this.start != timeBlock.start ||
    this.end != timeBlock.end
  ) {
    return false;
  }
  return true;
};

timeBlockSchema.methods.isOverlapped = function (timeBlock) {
  if (this.day != timeBlock.day) {
    return false;
  }
  if (this.start >= timeBlock.end || this.end <= timeBlock.start) {
    return false;
  }
  return true;
};

module.exports = timeBlockSchema;
