/**
 * APIs namespace
 * @namespace APIs
 */

/**
 * *API namespace
 * @namespace APIs.*API
 */

/**
 * @memberof APIs.*API
 * @function * API
 * @description 모든 API에 공통적으로 적용됨
 * @version 2.0.0
 *
 * @param {Object} req
 * @param {Object} res
 *
 * @throws {}
 * | status | message           | description                           |
 * | :----- | :---------------  | :--------------------------------     |
 * | 400    | {field}_REQUIRED  | if parameter {field} is not given     |
 * | 400    | {field}_INVALID   | if parameter {field} is invalid       |
 * | 403    | NOT_LOGGED_IN     | if user is not logged in              |
 * | 403    | ALREADY_LOGGED_IN | if user is already logged in          |
 * | 403    | PERMISSION_DENIED | if user has no permission             |
 * | 500    | Internal Server Error | if server has no handler to this error |
 */
