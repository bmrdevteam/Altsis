/**
 * Courses this teacher owns or teaches: time, room, enrolled count.
 * Student names stay out.
 */

import { z } from "zod";
import { logger } from "../../../log/logger.js";
import { Enrollment, Syllabus } from "../../../models/index.js";
import { defineTool } from "../defineTool.js";
import { clip, compact } from "../lib/compact.js";
import { gateTeacher } from "../lib/readGate.js";

const LIMIT = 20;

const clamp = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return LIMIT;
  return Math.max(1, Math.min(LIMIT, Math.floor(n)));
};

const projectTime = (blocks) =>
  (Array.isArray(blocks) ? blocks : [])
    .slice(0, 8)
    .map((block) =>
      compact({
        label: clip(block?.label, 40),
        day: clip(block?.day, 8),
        start: clip(block?.start, 8),
        end: clip(block?.end, 8),
      })
    );

export const listMyCourses = async (academyId, schoolId, seasonId, userId, limit) => {
  const rows = await Syllabus(academyId)
    .find({
      season: seasonId,
      school: schoolId,
      $or: [{ user: userId }, { "teachers._id": userId }],
    })
    .select("classTitle classroom time")
    .limit(limit)
    .lean();
  const ids = (rows || []).map((row) => row._id);
  const counts = new Map();
  if (ids.length) {
    const grouped = await Enrollment(academyId).aggregate([
      { $match: { syllabus: { $in: ids } } },
      { $group: { _id: "$syllabus", n: { $sum: 1 } } },
    ]);
    for (const row of grouped || []) counts.set(String(row._id), row.n || 0);
  }
  return (rows || []).map((row) =>
    compact({
      classTitle: clip(row.classTitle, 80),
      room: clip(row.classroom, 40),
      time: projectTime(row.time),
      enrolled: counts.get(String(row._id)) || 0,
    })
  );
};

export default defineTool({
  name: "get_my_courses",
  label: "내 수업",
  description: "내가 맡거나 개설한 수업의 시간, 강의실, 수강 인원. 수강생 이름은 포함하지 않습니다.",
  input: z
    .object({
      limit: z.number().int().min(1).max(20).optional(),
    })
    .strict(),
  permission: { roles: ["teacher"], access: "self" },
  readOnly: true,
  untrustedOutput: true,
  promptHints: [
    "내가 맡거나 개설한 수업의 시간·강의실·수강 인원은 get_my_courses입니다.",
    "수강생 이름은 없습니다. 인원 수만 말하고, 다른 교사 수업은 만들지 마세요.",
  ],
  async handler(ctx, rawArgs = {}) {
    const gate = await gateTeacher(ctx);
    if (!gate.ok) return { ...gate.error, courses: [] };
    const schoolId = ctx.school?._id;
    const seasonId = String(ctx.seasonId || ctx.season?._id || "");
    const userId = ctx.user?._id;
    if (!ctx.academyId || !schoolId || !seasonId || !userId) {
      return { summary: "수업 없음", count: 0, courses: [] };
    }
    const limit = clamp(rawArgs.limit);
    try {
      const load = ctx.listMyCourses || listMyCourses;
      const courses = await load(ctx.academyId, schoolId, seasonId, userId, limit);
      const items = courses || [];
      return {
        summary: items.length ? `수업 ${items.length}개` : "수업 없음",
        count: items.length,
        courses: items,
      };
    } catch (err) {
      logger.error(`alter get_my_courses: ${err.message}`);
      return { summary: "수업을 불러오지 못했습니다.", error: "수업을 불러오지 못했습니다.", courses: [] };
    }
  },
});
