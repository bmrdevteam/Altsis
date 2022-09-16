const Form = require("../models/Form");
const { wrapWithErrorHandler } = require("../utils/errorHandler");

const create = async (req, res) => {
  const exForm = await Form(req.user.dbName).findOne({
    title: req.body.title,
    type: req.body.type,
  });
  if (exForm) {
    return res.status(409).send({
      message: "already existing form title and type",
    });
  }
  const _Form = Form(req.user.dbName);
  const form = new _Form(req.body);
  form["userId"] = req.user.userId;
  form["userName"] = req.user.userName;
  await form.save();
  return res.status(200).send({ form });
};

const getAll = async (req, res) => {
  const forms = await Form(req.user.dbName).find({});
  return res.status(200).send({ forms });
};

const get = async (req, res) => {
  const form = await Form(req.user.dbName).findOne({
    _id: req.params._id,
  });
  return res.status(200).send({ form });
};

const update = async (req, res) => {
  const form = await Form(req.user.dbName).findById(req.params._id);
  if (!form) {
    return res.status(404).send({ message: "no form" });
  }
  //const fields = ["type", "title", "contents"]; // temp-1.1: form의 data가 object type인 경우
  const fields = ["type", "title", "data"]; // temp1-2. form의 data가 Array type인 경우

  if (req.params.field) {
    if (fields.includes(req.params.field)) {
      form[req.params.field] = req.body.new;
    } else {
      return res.status(400).send({
        message: `field '${req.params.field}' does not exist or cannot be updated`,
      });
    }
  } else {
    fields.forEach((field) => {
      form[field] = req.body.new[field];
    });
  }
  const exForm = await Form(req.user.dbName).findOne({
    title: form.title,
    type: form.type,
  });
  if (exForm) {
    return res.status(409).send({
      message: "already existing form title and type",
    });
  }

  await form.save();
  return res.status(200).send({ form });
};

const remove = async (req, res) => {
  const doc = await Form(req.user.dbName).findByIdAndDelete(req.params._id);
  return res.status(200).send({ doc });
};

module.exports = wrapWithErrorHandler({
  create,
  getAll,
  get,
  update,
  remove,
});
