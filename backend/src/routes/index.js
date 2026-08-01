import { router as academies } from "./academies.js";
import { router as ai } from "./ai.js";
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
import { router as surveyResponses } from "./surveyResponses.js";
import { router as syllabuses } from "./syllabuses.js";
import { router as users } from "./users.js";

import { router as files } from "./files.js";
import { router as memos } from "./memos.js";

import { router as themeSettings } from "./themeSettings.js";
import { router as userCalendars } from "./userCalendars.js";
import { router as test } from "./test.js";

export const routers = [
  { label: "academies", routes: academies },
  { label: "ai", routes: ai },
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
