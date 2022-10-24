const mongoose = require("mongoose");
const { conn } = require("../databases/connection");
const encrypt = require("mongoose-encryption");

const archiveSchema = mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    school: mongoose.Types.ObjectId,
    schoolId: String,
    schoolName: String,
    data: Object,
  },
  { timestamps: true }
);

archiveSchema.index(
  {
    school: 1,
    userId: 1,
  },
  { unique: true }
);

archiveSchema.plugin(encrypt, {
  encryptionKey: process.env["ENCKEY"],
  signingKey: process.env["SIGKEY"],
});

module.exports = (dbName) => {
  return conn[dbName].model("Archive", archiveSchema);
};
