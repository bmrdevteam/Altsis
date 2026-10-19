import { router as academies } from "./academies.js";
import { router as ai } from "./ai.js";
import { router as altFormFavorites } from "./altFormFavorites.js";
import { router as altForms } from "./altForms.js";
import { router as altSheetRows } from "./altSheetRows.js";
import { router as archives } from "./archives.js";
import { router as boardFavorites } from "./boardFavorites.js";
import { router as boards } from "./boards.js";
import { router as calendarEvents } from "./calendarEvents.js";
import { router as calendarSettings } from "./calendarSettings.js";
import { router as comments } from "./comments.js";
import { router as chats } from "./chats.js";
import { router as enrollments } from "./enrollments.js";
import { router as forms } from "./forms.js";
import { router as goals } from "./goals.js";
import { router as notifications } from "./notifications.js";
import { router as posts } from "./posts.js";
import { router as reminders } from "./reminders.js";
import { router as registrations } from "./registrations.js";

import { router as schools } from "./schools.js";
import { router as seasons } from "./seasons.js";
import { router as sites } from "./sites.js";
import { router as surveyResponses } from "./surveyResponses.js";
import { router as syllabuses } from "./syllabuses.js";
import { router as users } from "./users.js";

import { router as files } from "./files.js";
import { router as memos } from "./memos.js";

import { router as themeSettings } from "./themeSettings.js";
import { router as userCalendars } from "./userCalendars.js";
import { router as test } from "./test.js";
import {
  assertSeasonAiAccess,
  executeDispatchSkill,
  registerAlterAgentRunner,
  registerAlterSearchRunner,
  registerChatWeb,
} from "../services/aiSkills.js";
import { runChatAgent } from "../alter/runners/chat/run.js";
import { registerConfirmationPort, registerDispatchExecutor } from "../alter/skills/dispatch.js";
import { registerAuditPort } from "../alter/skills/auditPort.js";
import { confirmationMongoPort } from "../services/alterConfirmations.js";
import { recordAlterAudit, startAuditPurge } from "../services/alterAudit.js";
import { runChatWeb } from "../services/alterChatWeb.js";
import generateImageTool from "../alter/tools/defs/generateImage.tool.js";
import { subscribeDomainEvents } from "../alter/runners/event/subscribe.js";
import { getSkill } from "../alter/skills/registry.js";
import { executeSearchSkill } from "../services/alterSearch.js";

registerAlterAgentRunner(runChatAgent);
registerChatWeb(runChatWeb);
registerConfirmationPort(confirmationMongoPort);
registerAuditPort(recordAlterAudit);
startAuditPurge();
for (const skillId of [
  "syllabus-draft",
  "evaluation-draft",
  "archive-draft",
  "document-draft",
  "document-review",
  "form-response-draft",
  "activity-draft",
  "form-draft",
  "assessment-grade",
]) {
  registerDispatchExecutor(skillId, (args) => executeDispatchSkill({ ...args, skillId }));
}
registerDispatchExecutor("generate_image", async ({ academyId, user, message, seasonId, academy }) => {
  const loaded = academy || (seasonId ? (await assertSeasonAiAccess(academyId, user, seasonId)).academy : null);
  if (!loaded) {
    return { text: "학원 설정을 확인하지 못했습니다.", draft: null, images: [] };
  }
  const data = await generateImageTool.handler(
    {
      academyId,
      user,
      academy: loaded,
      accessChecked: true,
      mode: "chat",
    },
    { prompt: message }
  );
  return {
    text: data.summary || "이미지를 만들지 못했습니다.",
    draft: { kind: "image", images: data.images || [] },
    images: data.images || [],
  };
});
registerAlterSearchRunner(async (args) => {
  const skill = getSkill("school-search");
  if (!skill || !skill.tools.includes("search_school_data")) {
    const err = new Error("검색 스킬이 연결되지 않았습니다.");
    err.status = 500;
    throw err;
  }
  return executeSearchSkill(args);
});
subscribeDomainEvents();

export const routers = [
  { label: "academies", routes: academies },
  { label: "ai", routes: ai },
  { label: "alt-form-favorites", routes: altFormFavorites },
  { label: "alt-forms", routes: altForms },
  { label: "alt-sheet-rows", routes: altSheetRows },
  { label: "archives", routes: archives },
  { label: "board-favorites", routes: boardFavorites },
  { label: "boards", routes: boards },
  { label: "calendar-events", routes: calendarEvents },
  { label: "calendar-settings", routes: calendarSettings },
  { label: "chats", routes: chats },
  { label: "comments", routes: comments },
  { label: "enrollments", routes: enrollments },
  { label: "forms", routes: forms },
  { label: "goals", routes: goals },
  { label: "notifications", routes: notifications },
  { label: "posts", routes: posts },
  { label: "reminders", routes: reminders },
  { label: "registrations", routes: registrations },

  { label: "schools", routes: schools },
  { label: "seasons", routes: seasons },
  { label: "sites", routes: sites },
  { label: "survey-responses", routes: surveyResponses },
  { label: "syllabuses", routes: syllabuses },
  { label: "users", routes: users },
  { label: "files", routes: files },
  { label: "memos", routes: memos },
  { label: "theme-settings", routes: themeSettings },
  { label: "user-calendars", routes: userCalendars },
  ...(process.env.NODE_ENV?.trim() !== "production"
    ? [{ label: "test", routes: test }]
    : []),
];
