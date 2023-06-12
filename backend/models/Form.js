import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

// temp-1.1: form의 data가 object type인 경우
var dataSchema = mongoose.Schema(
  {
    header: mongoose.Schema(
      {
        rows: Number,
        cols: Number,
        permission: String,
      },
      { _id: false }
    ),
    contents: [
      mongoose.Schema(
        {
          type: String,
          dataLink: {
            type: [String],
            default: undefined,
          },
          attributes: mongoose.Schema(
            {
              value: String,
              checked: Boolean,
              required: Boolean,
              placeholder: String,
              option: {
                type: [String],
                default: undefined,
              },
            },
            { _id: false }
          ),
          table: mongoose.Schema(
            {
              row: Number,
              col: Number,
              atrributes: mongoose.Schema(
                {
                  colspan: Number,
                  rowspan: Number,
                },
                { _id: false }
              ),
              style: mongoose.Schema(
                {
                  background: String,
                  font: String,
                  "text-align": String,
                  border: String,
                },
                { _id: false }
              ),
            },
            { _id: false }
          ),
        },
        { _id: false }
      ),
    ],
  },
  { _id: false }
);

const formSchema = mongoose.Schema(
  {
    userId: String,
    userName: String,
    type: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    archived: {
      type: Boolean,
      default: false,
    },
    data: {
      // type: Object   // temp1-1. form의 data가 Object type인 경우
      type: Array, // temp1-2. form의 data가 Array type인 경우
      // required:true
    },
  },
  { timestamps: true }
);

// formSchema.index(
//   {
//     type: 1,
//     title: 1,
//   },
//   { unique: true }
// );

export const Form = (dbName) => {
  return conn[dbName].model("Form", formSchema);
};
