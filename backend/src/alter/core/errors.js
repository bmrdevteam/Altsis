/** Existing schedule error shape. A single AlterError type is P10. */
export const scheduleError = (status, message, code = "INVALID_SCHEDULE") => {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
};
