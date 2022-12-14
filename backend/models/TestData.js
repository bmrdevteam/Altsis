const mongoose = require("mongoose");
const { conn } = require("../databases/connection");

const testDataSchema = mongoose.Schema(
  {
    label: {
      type: String,
      unique: true,
    },
    data: Object,
  },
  { timestamps: true }
);

testDataSchema.statics.sFuntion1 = function () {
  return "Fields: [label, data]";
};

testDataSchema.methods.mFuntion1 = function () {
  return JSON.stringify(this.data);
};

module.exports = (dbName) => {
  return conn[dbName].model("TestData", testDataSchema);
};
