/**
 * Boot registers the writer. Skills do not import the audit service.
 */

let port = null;

export const registerAuditPort = (fn) => {
  port = typeof fn === "function" ? fn : null;
};

export const resetAuditPort = () => {
  port = null;
};

export const recordSkillAudit = (entry) => {
  if (!port) return Promise.resolve(null);
  return Promise.resolve(port(entry)).catch(() => null);
};
