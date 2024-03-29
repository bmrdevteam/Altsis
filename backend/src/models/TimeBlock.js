import mongoose from "mongoose";

const timeBlockSchema = mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
    },
    day: {
      type: String,
    },
    start: {
      type: String,
    },
    end: {
      type: String,
    },
  },
  { _id: false }
);

export { timeBlockSchema };
