import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";
import encrypt from "mongoose-encryption";

const archiveSchema = mongoose.Schema(
  {
    user: { type: mongoose.Types.ObjectId, required: true },
    userId: String,
    userName: String,
    school: { type: mongoose.Types.ObjectId, required: true },
    schoolId: String,
    schoolName: String,
    data: { type: Object, default: {} },
  },
  { timestamps: true }
);

archiveSchema.index(
  {
    school: 1,
    user: 1,
  },
  { unique: true }
);

archiveSchema.plugin(encrypt, {
  encryptionKey: process.env["ENCKEY_A"],
  signingKey: process.env["SIGKEY_A"],
  encryptedFields: ["data"],
});

archiveSchema.methods.clean = async function () {
  const user = this;
  try {
    user.data["인적 사항"]["주민등록번호"] = "000000-111111";
    user.data["인적 사항"]["주소"] = "아름다운 이땅에 금수강산에";
    user.data["인적 사항"]["성명(부)"] = "아버지";
    user.data["인적 사항"]["생년월일(부)"] = "2022년11월16일";
    user.data["인적 사항"]["성명(모)"] = "어머니";
    user.data["인적 사항"]["생년월일(모)"] = "2022년11월16일";
    return;
  } catch (err) {
    return err;
  }
};

export const Archive = (dbName) => {
  return conn[dbName].model("Archive", archiveSchema);
};
