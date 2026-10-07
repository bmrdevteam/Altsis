/** Existing import path. The adapter lives in alter/providers. */
export {
  SCRIPTED_AGENT_API_KEY,
  SCRIPTED_AGENT_FINAL_TEXT,
  SCRIPTED_DEMO_ONLY_AGENT_MESSAGE,
  SCRIPTED_SCHEDULE_FINAL_TEXT,
  createScriptedAdapter,
  isAlterAgentScriptedEnabled,
  isScriptedDemoKey,
  isScriptedScheduleRequest,
  scriptedAgentGenerate,
  scriptedDemoKeyBlocked,
  scriptedScheduleArguments,
} from "../alter/providers/scripted.js";
