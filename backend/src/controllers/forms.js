/**
 * FormAPI namespace
 * @namespace APIs.FormAPI
 * @see TForm in {@link Models.Form}
 */
import { logger } from "../log/logger.js";
import {
  FIELD_IN_USE,
  FIELD_REQUIRED,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";
import { Form, Registration } from "../models/index.js";

/**
 * @memberof APIs.FormAPI
 * @function *common
 *
 * @param {Object} req
 * @param {Object} res
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 404    | FORM_NOT_FOUND | if form is not found  |
 */

/**
 * @memberof APIs.FormAPI
 * @function CForm API
 * @description 양식 생성 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/forms"} req.url
 *
 * @param {Object} req.user - "admin"|"manager"
 *
 * @param {Object} req.body
 * @param {string} req.body.title
 * @param {string} req.body.type
 * @param {Object[]} req.body.data
 *
 * @param {Object} res
 * @param {Object} res.form - created form
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 409    | TITLE_IN_USE | if title is duplicate
 *
 *
 */
export const create = async (req, res) => {
  try {
    for (let field of ["title", "type", "data"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    if (
      await Form(req.user.academyId).findOne({
        title: req.body.title,
        type: req.body.type,
      })
    ) {
      return res.status(409).send({
        message: FIELD_IN_USE("title"),
      });
    }

    const form = await Form(req.user.academyId).create({
      type: req.body.type,
      title: req.body.title,
      data: req.body.data,
      userId: req.user.userId,
      userName: req.user.userName,
    });
    return res.status(200).send({ form });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.FormAPI
 * @function CCopyForm API
 * @description 양식 복사 생성 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/forms/:_id/copy"} req.url
 *
 * @param {Object} req.user - "admin"|"manager"
 *
 * @param {Object} req.body
 *
 * @param {Object} res
 * @param {Object} res.form - copied form
 *
 *
 */
export const copy = async (req, res) => {
  try {
    const formToCopy = await Form(req.user.academyId).findById(req.params._id);
    if (!formToCopy) {
      return res.status(404).send({
        message: __NOT_FOUND("form"),
      });
    }

    /* create and save document */
    const form = await Form(req.user.academyId).create({
      type: formToCopy.type,
      title: `${formToCopy.title}의 사본`,
      data: formToCopy.data,
      userId: req.user.userId,
      userName: req.user.userName,
    });
    return res.status(200).send({ form });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.FormAPI
 * @function RForms API
 * @description 양식 목록 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/forms"} req.url
 *
 * @param {Object} req.query
 * @param {string?} req.query.type
 * @param {boolean?} req.query.archived
 *
 * @param {Object} req.user - "admin"|"manager"
 *
 * @param {Object} res
 * @param {Object[]} res.forms
 *
 *
 */

/**
 * @memberof APIs.FormAPI
 * @function RForm API
 * @description 양식 조회 API
 * @version 2.0.1
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/forms/:_id"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 * @param {Object} res.form
 *
 *
 */
/**
 * 사용자의 양식 열람 권한 확인
 * @param {Object} form - 양식 문서
 * @param {Object} user - req.user
 * @param {string|null} role - "student" | "teacher" | null
 * @returns {boolean}
 */
const hasFormViewPermission = (form, user, role) => {
  if (user.auth === "admin" || user.auth === "manager") {
    return true;
  }

  const permission = form.permissionView;
  if (!permission) {
    return role === "teacher";
  }

  for (let exception of permission.exceptions) {
    if (exception.userId === user.userId) {
      return exception.isAllowed;
    }
  }

  if (role && permission[role]) {
    return true;
  }

  return false;
};

/**
 * 사용자의 역할 조회 (아카데미 내 활성 등록 기준)
 * @param {string} academyId
 * @param {Object} user - req.user
 * @returns {Promise<string|null>} "student" | "teacher" | null
 */
const getUserRole = async (academyId, user) => {
  const registration = await Registration(academyId).findOne({
    user: user._id,
    isActivated: true,
  });
  return registration?.role || null;
};

export const find = async (req, res) => {
  try {
    /* RForm */
    if (req.params._id) {
      const form = await Form(req.user.academyId).findById(req.params._id);
      if (!form) {
        return res.status(404).send({ message: __NOT_FOUND("form") });
      }

      if (req.user.auth !== "admin" && req.user.auth !== "manager") {
        const role = await getUserRole(req.user.academyId, req.user);
        if (!hasFormViewPermission(form, req.user, role)) {
          return res.status(403).send({ message: PERMISSION_DENIED });
        }
      }

      return res.status(200).send({ form });
    }

    /* RForms */
    const query = {};
    if ("type" in req.query) {
      query["type"] = req.query.type;
    }
    if ("archived" in req.query) {
      query["archived"] = req.query.archived === "true";
    }

    const forms = await Form(req.user.academyId).find(query).select("-data");

    if (req.user.auth !== "admin" && req.user.auth !== "manager") {
      const role = await getUserRole(req.user.academyId, req.user);
      const filteredForms = forms.filter((form) =>
        hasFormViewPermission(form, req.user, role)
      );
      return res.status(200).send({ forms: filteredForms });
    }

    return res.status(200).send({ forms });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.FormAPI
 * @function UForm API
 * @description 양식 수정 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/forms/:_id"} req.url
 *
 * @param {Object} req.user - "admin"|"manager"
 *
 * @param {Object} req.body
 * @param {string} req.body.title
 * @param {Object[]} req.body.data
 *
 * @param {Object} res
 * @param {Object} res.form - updated form
 *
 *
 */
export const update = async (req, res) => {
  try {
    for (let field of ["title", "data"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const form = await Form(req.user.academyId).findById(req.params._id);
    if (!form) {
      return res.status(404).send({ message: __NOT_FOUND("field") });
    }

    form["title"] = req.body.title;
    form["data"] = req.body.data;
    await form.save();
    return res.status(200).send({ form });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.FormAPI
 * @function UArchiveForm API
 * @description 양식 보관 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/forms/:_id/archive"} req.url
 *
 * @param {Object} req.user - "admin"|"manager"
 *
 * @param {Object} req.body
 *
 * @param {Object} res
 * @param {Object} res.form - updated form
 *
 *
 */
export const archive = async (req, res) => {
  try {
    const form = await Form(req.user.academyId).findById(req.params._id);
    if (!form) {
      return res.status(404).send({ message: __NOT_FOUND("field") });
    }

    form["archived"] = true;
    await form.save();
    return res.status(200).send({ form });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.FormAPI
 * @function URestoreForm API
 * @description 양식 복원 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/forms/:_id/restore"} req.url
 *
 * @param {Object} req.user - "admin"|"manager"
 *
 * @param {Object} req.body
 *
 * @param {Object} res
 * @param {Object} res.form - updated form
 *
 *
 */
export const restore = async (req, res) => {
  try {
    const form = await Form(req.user.academyId).findById(req.params._id);
    if (!form) {
      return res.status(404).send({ message: __NOT_FOUND("field") });
    }

    form["archived"] = false;
    await form.save();
    return res.status(200).send({ form });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.FormAPI
 * @function DForm API
 * @description 양식 삭제 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"DELETE"} req.method
 * @param {"/forms/:_id"} req.url
 *
 * @param {Object} req.user - "admin"|"manager"
 *
 * @param {Object} res
 *
 *
 */
export const remove = async (req, res) => {
  try {
    const form = await Form(req.user.academyId).findById(req.params._id);
    if (!form) {
      return res.status(404).send({ message: __NOT_FOUND("form") });
    }
    await form.remove();
    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.FormAPI
 * @function UFormPermission API
 * @description 양식 열람 권한 수정 API
 * @version 2.0.0
 *
 * @param {Object} req
 * @param {"PUT"} req.method
 * @param {"/forms/:_id/permission"} req.url
 *
 * @param {Object} req.body
 * @param {boolean?} req.body.teacher - 교사 권한
 * @param {boolean?} req.body.student - 학생 권한
 *
 * @param {Object} res
 * @param {Object} res.form - 수정된 양식
 */
export const updatePermission = async (req, res) => {
  try {
    const form = await Form(req.user.academyId).findById(req.params._id);
    if (!form) {
      return res.status(404).send({ message: __NOT_FOUND("form") });
    }

    const current = form.permissionView || {
      teacher: true,
      student: false,
      exceptions: [],
    };
    const updatedPermission = {
      teacher:
        "teacher" in req.body ? req.body.teacher : current.teacher ?? true,
      student:
        "student" in req.body ? req.body.student : current.student ?? false,
      exceptions: current.exceptions || [],
    };

    const updatedForm = await Form(req.user.academyId).findByIdAndUpdate(
      req.params._id,
      { $set: { permissionView: updatedPermission } },
      { new: true }
    );

    return res.status(200).send({ form: updatedForm });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.FormAPI
 * @function CFormPermissionException API
 * @description 양식 열람 권한 예외 추가 API
 * @version 2.0.0
 *
 * @param {Object} req
 * @param {"POST"} req.method
 * @param {"/forms/:_id/permission/exceptions"} req.url
 *
 * @param {Object} req.body
 * @param {string} req.body.user - user._id
 * @param {string} req.body.userId
 * @param {string} req.body.userName
 * @param {boolean} req.body.isAllowed
 *
 * @param {Object} res
 * @param {Object} res.form - 수정된 양식
 */
export const addPermissionException = async (req, res) => {
  try {
    const form = await Form(req.user.academyId).findById(req.params._id);
    if (!form) {
      return res.status(404).send({ message: __NOT_FOUND("form") });
    }

    for (let field of ["user", "userId", "userName", "isAllowed"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const current = form.permissionView || {
      teacher: true,
      student: false,
      exceptions: [],
    };
    const exceptions = (current.exceptions || []).filter(
      (e) => e.userId !== req.body.userId
    );
    exceptions.push({
      user: req.body.user,
      userId: req.body.userId,
      userName: req.body.userName,
      isAllowed: req.body.isAllowed,
    });

    const updatedForm = await Form(req.user.academyId).findByIdAndUpdate(
      req.params._id,
      {
        $set: {
          permissionView: {
            teacher: current.teacher ?? true,
            student: current.student ?? false,
            exceptions,
          },
        },
      },
      { new: true }
    );

    return res.status(200).send({ form: updatedForm });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.FormAPI
 * @function DFormPermissionException API
 * @description 양식 열람 권한 예외 삭제 API
 * @version 2.0.0
 *
 * @param {Object} req
 * @param {"DELETE"} req.method
 * @param {"/forms/:_id/permission/exceptions"} req.url
 *
 * @param {Object} req.query
 * @param {string} req.query.userId - 삭제할 사용자의 userId
 *
 * @param {Object} res
 * @param {Object} res.form - 수정된 양식
 */
export const removePermissionException = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res.status(400).send({ message: FIELD_REQUIRED("userId") });
    }

    const form = await Form(req.user.academyId).findById(req.params._id);
    if (!form) {
      return res.status(404).send({ message: __NOT_FOUND("form") });
    }

    const current = form.permissionView || {
      teacher: true,
      student: false,
      exceptions: [],
    };
    const exceptions = (current.exceptions || []).filter(
      (e) => e.userId !== req.query.userId
    );

    const updatedForm = await Form(req.user.academyId).findByIdAndUpdate(
      req.params._id,
      {
        $set: {
          permissionView: {
            teacher: current.teacher ?? true,
            student: current.student ?? false,
            exceptions,
          },
        },
      },
      { new: true }
    );

    return res.status(200).send({ form: updatedForm });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
