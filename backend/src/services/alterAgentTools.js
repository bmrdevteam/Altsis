/**
 * Compatibility path. Definitions live in alter/tools and are registered once.
 * Callers keep this import until the agent loop reads the registry directly.
 */

export { createAgentTools, toNativeTools, toFenceText, finalizeToolResult } from "../alter/tools/registry.js";
export {
  EVAL_STATUS_LABEL,
  isEmptyEnrollmentEval,
  normalizeTodoScope,
  partitionCourseTodos,
  projectCourseTodo,
  projectSchoolTodo,
} from "../alter/tools/lib/todoProjection.js";
