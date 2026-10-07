/**
 * Domain-facing Alter surface.
 * Re-exports the existing Alter service modules so other services do not
 * import services/alter* directly. The symbols and behavior stay the same.
 * This file is the allowed seam, like services/aiSafety.js.
 */

export {
  attachmentsToSourceText,
  buildMultimodalUserContent,
} from "./alterAttachments.js";

export {
  ALTER_HOWTO_EXAMPLE_PROMPTS,
  ALTER_SAFETY_ETHICS,
  PAGE_TYPE_LABELS,
  buildAlterChatPageContext,
  buildAlterChatPageData,
  buildAlterChatSystemPrompt,
  buildBoardAlterSystemPrompt,
  detectAlterHowtoIntent,
  withAlterSafety,
} from "./alterCorePrompt.js";

export { retrieveAlterGuide } from "./alterGuideRetrieve.js";
export { buildAlterGuideLinks } from "./alterGuideLinks.js";
