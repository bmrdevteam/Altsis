/**
 * RequestStat namespace
 * @namespace Models.RequestStat
 * @version 1.0.0
 *
 * @description 일별 API 요청 통계
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

const requestStatSchema = mongoose.Schema({
  date: {
    type: String,
    required: true,
  },
  requests: {
    type: Number,
    default: 0,
  },
  totalResponseTime: {
    type: Number,
    default: 0,
  },
  dataIn: {
    type: Number,
    default: 0,
  },
  dataOut: {
    type: Number,
    default: 0,
  },
  uniqueUsers: {
    type: [String],
    default: [],
  },
});

requestStatSchema.index({ date: 1 }, { unique: true });

export const RequestStat = (dbName) => {
  return conn[dbName].model("RequestStat", requestStatSchema);
};
