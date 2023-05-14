import { router as academies } from "./academies.js";
import { router as archives } from "./archives.js";
import { router as enrollments } from "./enrollments.js";
import { router as forms } from "./forms.js";
import { router as notifications } from "./notifications.js";
import { router as registrations } from "./registrations.js";
import { router as schools } from "./schools.js";
import { router as seasons } from "./seasons.js";
import { router as syllabuses } from "./syllabuses.js";
import { router as users } from "./users.js";

import { router as files } from "./files.js";
import { router as courses } from "./courses.js";
import { router as memos } from "./memos.js";
import { router as documents } from "./documents.js";

import { router as test } from "./test.js";

export const routers = [
  { label: "academies", routes: academies },
  { label: "archives", routes: archives },
  { label: "enrollments", routes: enrollments },
  { label: "forms", routes: forms },
  { label: "notifications", routes: notifications },
  { label: "registrations", routes: registrations },
  { label: "schools", routes: schools },
  { label: "seasons", routes: seasons },
  { label: "syllabuses", routes: syllabuses },
  { label: "users", routes: users },
  { label: "files", routes: files },
  { label: "users", routes: users },
  { label: "courses", routes: courses },
  { label: "memos", routes: memos },
  { label: "documents", routes: documents },
  { label: "test", routes: test },
];
