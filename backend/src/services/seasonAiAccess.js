/**
 * Domain-facing path for alter/policy. This file only re-exports the check.
 * Other domain files still cannot import alter.
 */

export {
  loadGuidelinesTemplateContext,
  resolveAlterContext,
} from "../alter/policy/access.js";
