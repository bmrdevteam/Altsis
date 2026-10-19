/**
 * One capability list for tools, procedural skills, and draft skills.
 * Draft skills are metadata only. Their HTTP executors stay on the old path
 * until the dispatch channel is wired.
 */

import { resolveSkillMeta } from "../core/skillMeta.js";
import { listTools } from "../tools/registry.js";
import { listSkills } from "./registry.js";

const STAFF = ["owner", "admin", "manager", "teacher"];
const FORM_ROLES = ["owner", "admin", "manager"];

const draft = (partial) =>
  resolveSkillMeta({
    kind: "draft",
    channel: "dispatch",
    costTier: "low",
    studentAllowed: false,
    requiredRoles: STAFF,
    reversible: true,
    piiSensitive: false,
    allowedTools: [],
    ...partial,
  });

/**
 * UI draft skills that are not defineSkill entries.
 * form-draft's HTTP path still checks admin and manager only.
 * Owner is listed here so stage 2 can follow the confirmed allow table.
 */
export const DISPATCH_SKILLS = [
  draft({
    id: "syllabus-draft",
    title: "수업",
    description: "강의계획서 항목 초안",
    screens: ["syllabus-edit"],
  }),
  draft({
    id: "evaluation-draft",
    title: "평가",
    description: "평가 항목 초안",
    screens: ["evaluation"],
  }),
  draft({
    id: "archive-draft",
    title: "기록",
    description: "학생 기록 초안",
    screens: ["archive"],
    piiSensitive: true,
  }),
  draft({
    id: "document-draft",
    title: "문서",
    description: "보드 문서 초안",
    screens: ["document"],
  }),
  draft({
    id: "document-review",
    title: "문서 점검",
    description: "문서 점검 리포트",
    screens: ["docs"],
  }),
  draft({
    id: "form-response-draft",
    title: "응답",
    description: "양식 응답 초안",
    screens: ["form-response"],
  }),
  draft({
    id: "activity-draft",
    title: "활동",
    description: "활동 양식 초안",
    screens: ["activity"],
  }),
  draft({
    id: "form-draft",
    title: "양식",
    description: "양식 문서 초안",
    requiredRoles: FORM_ROLES,
    screens: ["form-editor"],
  }),
  draft({
    id: "assessment-grade",
    title: "채점",
    description: "채점 초안",
    screens: ["assessment-grade"],
    piiSensitive: true,
  }),
];

const withSource = (meta, source) => ({ ...meta, source });

export const listCapabilities = () => [
  ...listTools().map((tool) => withSource(tool.meta, "tool")),
  ...listSkills().map((skill) => withSource(skill.meta, "skill")),
  ...DISPATCH_SKILLS.map((meta) => withSource(meta, "dispatch")),
];

export const getCapability = (id) =>
  listCapabilities().find((item) => item.id === String(id || "")) || null;
