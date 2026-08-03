/**
 * 시즌 AI 설정(지침·참고자료·권한·모범계획서)을 학교 aiConfig + AiLibraryItem으로 이관.
 * 학교별로 enabled 시즌을 우선하고, 없으면 가장 최근 시즌을 소스로 사용.
 * 아카데미별로 1회만 실행.
 *
 * 수동 재실행이 필요하면 root._migrations 에서 key 를 삭제한 뒤 서버를 재기동한다.
 * key: 2026-08-03-season-ai-to-school-v1
 */
import { Academy, AiLibraryItem, School, Season } from "../models/index.js";
import { conn, isConnected } from "../_database/mongodb/index.js";
import { logger } from "../log/logger.js";
import { normalizeGuidelines } from "../services/aiPromptPolicy.js";

const MIGRATION_KEY = "2026-08-03-season-ai-to-school-v1";
const SKILL_IDS = ["chat", "syllabus-review", "evaluation-draft"];

const waitForMongo = async (timeoutMs = 30000) => {
  const started = Date.now();
  while (!isConnected) {
    if (Date.now() - started > timeoutMs) {
      throw new Error("MongoDB connection timeout");
    }
    await new Promise((r) => setTimeout(r, 200));
  }
};

const pickSourceSeason = (seasons) => {
  if (!seasons?.length) return null;
  const enabled = seasons.find((s) => s.aiSettings?.enabled);
  if (enabled) return enabled;
  return seasons[0];
};

export const migrateSeasonAiToSchool = async () => {
  try {
    await waitForMongo();

    if (!conn.root?.db) {
      logger.warn("Season→School AI migration skipped: no root connection");
      return;
    }

    const migrations = conn.root.db.collection("_migrations");
    const existing = await migrations.findOne({ key: MIGRATION_KEY });
    if (existing) return;

    const academies = await Academy.find({}).select("+dbName academyId");
    let schoolsUpdated = 0;
    let itemsCreated = 0;
    const skipped = [];

    for (const academy of academies) {
      if (academy.academyId === "root") continue;
      if (!conn[academy.academyId]) {
        skipped.push(academy.academyId);
        continue;
      }

      const academyId = academy.academyId;
      const schools = await School(academyId).find({}).lean();

      for (const school of schools) {
        // 이미 aiConfig.skills 가 채워져 있으면 스킵
        if (
          school.aiConfig?.skills &&
          Object.keys(school.aiConfig.skills).length > 0
        ) {
          continue;
        }

        const seasons = await Season(academyId)
          .find({ school: school._id })
          .sort({ updatedAt: -1 })
          .lean();
        const source = pickSourceSeason(seasons);
        if (!source?.aiSettings) continue;

        const ai = source.aiSettings;
        const libraryItemIds = [];

        if (Array.isArray(ai.references)) {
          for (const ref of ai.references) {
            if (!ref?.title && !ref?.content && !ref?.fileKey) continue;
            const item = await AiLibraryItem(academyId).create({
              school: school._id,
              kind: "learning",
              title: ref.title || "참고 자료",
              content: ref.content || "",
              fileName: ref.fileName,
              fileKey: ref.fileKey,
              fileSize: ref.fileSize,
              mimeType: ref.mimeType,
              skillTags: [],
            });
            libraryItemIds.push(String(item._id));
            itemsCreated += 1;
          }
        }

        const guidelines = normalizeGuidelines(ai.guidelines || "");
        if (guidelines) {
          const item = await AiLibraryItem(academyId).create({
            school: school._id,
            kind: "instruction",
            title: "기존 학기 기본 지침",
            content: guidelines,
            skillTags: [],
          });
          libraryItemIds.push(String(item._id));
          itemsCreated += 1;
        }

        const skills = {};
        for (const skillId of SKILL_IDS) {
          skills[skillId] = {
            instructions: guidelines,
            libraryItemIds: [...libraryItemIds],
            ...(skillId === "syllabus-review"
              ? {
                  exampleSyllabusIds: Array.isArray(ai.exampleSyllabusIds)
                    ? ai.exampleSyllabusIds.slice(0, 2).map(String)
                    : [],
                }
              : {}),
          };
        }

        await School(academyId).updateOne(
          { _id: school._id },
          {
            $set: {
              aiConfig: {
                permission: {
                  teacher: !!ai.permission?.teacher,
                  student: !!ai.permission?.student,
                },
                skills,
              },
            },
          }
        );
        schoolsUpdated += 1;
      }
    }

    if (skipped.length > 0) {
      logger.warn(
        `Season→School AI migration deferred (missing conn): ${skipped.join(", ")}`
      );
      return;
    }

    await migrations.insertOne({
      key: MIGRATION_KEY,
      ranAt: new Date(),
      schoolsUpdated,
      itemsCreated,
    });

    logger.info(
      `Season→School AI migration done: ${schoolsUpdated} schools, ${itemsCreated} library items`
    );
  } catch (err) {
    logger.error(`Season→School AI migration failed: ${err.message}`);
  }
};
