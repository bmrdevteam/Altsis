import { useEffect, useMemo, useState } from "react";
import Button from "components/button/Button";
import Input from "components/input/Input";
import Table from "components/tableV2/Table";
import SchoolFeatureToggle from "../FeatureSettings";
import { useAuth } from "contexts/authContext";
import { useAppNavigate } from "hooks/useAppNavigate";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { isSchoolOfficialItem } from "pages/alterLibrary/libraryFilters";
import {
  TAiLibraryItem,
  TAlterSkillId,
  TSchool,
  TSchoolAiConfig,
  TSchoolAiSkillConfig,
} from "types/schools";
import style from "./AISettings.module.scss";

const SUCCESS_MESSAGE = "저장되었습니다.";

const SKILLS: Array<{ id: TAlterSkillId; label: string; hint: string }> = [
  {
    id: "chat",
    label: "챗봇",
    hint: "Alter 챗봇에 적용할 라이브러리 항목을 선택합니다. 학습정보는 대화당 최대 8개·본문 일부만 직접 넣고, 긴 PDF(교육계획서 등)는 질문과 관련된 구간을 검색해 보완합니다. 체크한 항목이 매 턴 전문으로 들어가지는 않습니다.",
  },
  {
    id: "syllabus-draft",
    label: "수업",
    hint: "강의계획서 초안 작성에 적용할 라이브러리 항목을 선택합니다.",
  },
  {
    id: "evaluation-draft",
    label: "평가",
    hint: "평가 항목 초안 작성에 적용할 라이브러리 항목을 선택합니다.",
  },
  {
    id: "archive-draft",
    label: "기록",
    hint: "학생 기록 초안 작성에 적용할 라이브러리 항목을 선택합니다.",
  },
  {
    id: "document-draft",
    label: "문서",
    hint: "보드 문서 초안 작성에 적용할 라이브러리 항목을 선택합니다.",
  },
  {
    id: "document-review",
    label: "문서 점검",
    hint: "문서 점검에 적용할 라이브러리 항목을 선택합니다.",
  },
  {
    id: "form-response-draft",
    label: "응답",
    hint: "양식 응답 초안에 적용할 라이브러리 항목을 선택합니다. 문서형 필드는 작성 칸만 채우도록 안내할 수 있습니다.",
  },
  {
    id: "activity-draft",
    label: "활동",
    hint: "보드 활동(양식) 초안 작성에 적용할 라이브러리 항목을 선택합니다.",
  },
  {
    id: "form-draft",
    label: "양식",
    hint: "관리자 양식(시간표·강의계획서·출력) 초안 작성에 적용할 라이브러리 항목을 선택합니다.",
  },
  {
    id: "search",
    label: "검색",
    hint: "권한 있는 학사 데이터 검색(SQL)에 적용할 라이브러리 항목을 선택합니다. 지침이 있으면 조회 범위·표현 규칙을 안내합니다.",
  },
];

const defaultAiConfig = (): TSchoolAiConfig => ({
  permission: { teacher: false, student: false },
  skills: {},
});

const emptySkill = (): TSchoolAiSkillConfig => ({
  libraryItemIds: [],
});

type Props = {
  schoolData: TSchool;
  setSchoolData?: (data: TSchool) => void;
  seasonList?: Array<{ _id: string; year?: string; term?: string }>;
};

const SchoolAISettings = ({ schoolData, setSchoolData }: Props) => {
  const { currentUser, currentSchool, patchCurrentSchool } = useAuth();
  const navigate = useAppNavigate();
  const { SchoolAPI, AcademyAPI } = useAPIv2();
  const canEditUsageLimits =
    currentUser?.auth === "admin" ||
    currentUser?.auth === "manager" ||
    currentUser?.auth === "owner";
  const [loading, setLoading] = useState(true);
  const [aiConfig, setAiConfig] = useState<TSchoolAiConfig>(defaultAiConfig());
  const [library, setLibrary] = useState<TAiLibraryItem[]>([]);
  const [activeSkill, setActiveSkill] = useState<TAlterSkillId>("chat");
  const [limitEnabled, setLimitEnabled] = useState(false);
  const [dailyUserAlts, setDailyUserAlts] = useState("1");
  const [showCompliance, setShowCompliance] = useState(false);

  const applyAiConfig = (nextConfig?: TSchoolAiConfig) => {
    if (!nextConfig) return;
    setAiConfig({
      ...defaultAiConfig(),
      ...nextConfig,
      permission: {
        teacher: !!nextConfig?.permission?.teacher,
        student: !!nextConfig?.permission?.student,
      },
      skills: nextConfig?.skills || {},
    });
  };

  const reload = async () => {
    const academyId = currentUser?.academyId;
    const [{ aiConfig: nextConfig }, { items }, academyResult] =
      await Promise.all([
        SchoolAPI.RSchoolAiConfig({ params: { _id: schoolData._id } }),
        SchoolAPI.RSchoolAiLibrary({ params: { _id: schoolData._id } }),
        academyId
          ? AcademyAPI.RAcademy({ query: { academyId } }).catch(() => null)
          : Promise.resolve(null),
      ]);
    applyAiConfig(nextConfig);
    setLibrary(items || []);
    const limits = academyResult?.academy?.aiUsageLimits;
    setLimitEnabled(!!limits?.enabled);
    const TOKENS_PER_ALT = 10000;
    const alts =
      limits?.dailyUserAlts ??
      (limits?.monthlyUserTokens != null
        ? Number(limits.monthlyUserTokens) / TOKENS_PER_ALT
        : 1);
    setDailyUserAlts(String(alts > 0 ? alts : 1));
  };

  const saveUsageLimits = async () => {
    const academyId = currentUser?.academyId;
    if (!academyId) {
      alert("아카데미 정보를 확인할 수 없습니다.");
      return;
    }
    const alts = Math.round(Math.max(0, Number(dailyUserAlts) || 0) * 10000) / 10000;
    if (limitEnabled && alts <= 0) {
      alert("한도를 활성화하려면 일일 Alt를 0보다 크게 입력해주세요.");
      return;
    }
    try {
      await AcademyAPI.UAcademyAiUsageLimits({
        params: { academyId },
        data: {
          enabled: limitEnabled,
          dailyUserAlts: alts,
        },
      });
      alert(SUCCESS_MESSAGE);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await reload();
      } catch (err) {
        if (!cancelled) ALERT_ERROR(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolData._id, currentUser?.academyId]);

  const skillConfig = aiConfig.skills?.[activeSkill] || emptySkill();

  const libraryForSkill = useMemo(() => {
    return library.filter((item) => {
      if (!isSchoolOfficialItem(item)) return false;
      const tags = item.skillTags || [];
      return tags.length === 0 || tags.includes(activeSkill);
    });
  }, [library, activeSkill]);

  const savePermission = async (role: "teacher" | "student") => {
    try {
      const next = {
        ...aiConfig.permission,
        [role]: !aiConfig.permission[role],
      };
      const { aiConfig: saved } = await SchoolAPI.USchoolAiConfig({
        params: { _id: schoolData._id },
        data: { permission: next },
      });
      setAiConfig((prev) => ({ ...prev, permission: saved.permission }));
      if (currentSchool?._id === schoolData._id) {
        patchCurrentSchool({
          aiConfig: {
            ...(currentSchool.aiConfig || {}),
            ...saved,
            permission: saved.permission,
          },
        });
      }
      alert(SUCCESS_MESSAGE);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const saveSkillConfig = async (
    patch: Partial<TSchoolAiSkillConfig>,
    opts?: { silent?: boolean }
  ) => {
    try {
      const nextSkill: TSchoolAiSkillConfig = {
        ...emptySkill(),
        ...skillConfig,
        ...patch,
        // 지침은 라이브러리에서만 관리. 스킬 직접 입력은 더 이상 쓰지 않음.
        instructions: "",
      };
      const { aiConfig: saved } = await SchoolAPI.USchoolAiConfig({
        params: { _id: schoolData._id },
        data: { skills: { [activeSkill]: nextSkill } },
      });
      setAiConfig((prev) => ({
        ...prev,
        skills: { ...prev.skills, ...saved.skills },
      }));
      if (!opts?.silent) {
        alert(SUCCESS_MESSAGE);
      }
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const toggleLibrarySelect = (itemId: string) => {
    const id = String(itemId);
    const current = (skillConfig.libraryItemIds || []).map(String);
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id].slice(0, 20);
    void saveSkillConfig({ libraryItemIds: next }, { silent: true });
  };

  if (loading) {
    return <div className={style.loading}>불러오는 중...</div>;
  }

  return (
    <SchoolFeatureToggle
      featureKey="aiEnabled"
      label="AI 기능 활성화"
      description="이 학교에서 AI 기능을 활성화합니다. 학기별 on/off는 학기 AI 탭에서 설정합니다."
      schoolData={schoolData}
      setSchoolData={setSchoolData}
    >
      <div className={style.root}>
        <section className={style.section}>
          <h4 className={style.sectionTitle}>역할 권한</h4>
          <p className={style.sectionHint}>
            AI 기능을 사용할 수 있는 역할을 설정합니다.
          </p>
          <Table
            type="object-array"
            data={[
              {
                role: "teacher",
                label: "선생님",
                enabled: aiConfig.permission.teacher,
              },
              {
                role: "student",
                label: "학생",
                enabled: aiConfig.permission.student,
              },
            ]}
            header={[
              {
                text: "역할",
                key: "label",
                width: "120px",
                textAlign: "center",
                type: "text",
              },
              {
                text: "AI 사용 권한",
                key: "enabled",
                width: "120px",
                textAlign: "center",
                type: "status",
                status: {
                  false: {
                    text: "N",
                    color: "red",
                    onClick: (e: any) => savePermission(e.role),
                  },
                  true: {
                    text: "Y",
                    color: "green",
                    onClick: (e: any) => savePermission(e.role),
                  },
                },
              },
            ]}
          />
        </section>

        {canEditUsageLimits && (
          <section className={style.section}>
            <h4 className={style.sectionTitle}>사용자 일일 Alt 한도</h4>
            <p className={style.sectionHint}>
              아카데미 전체 사용자에게 적용됩니다. 1 Alt = 10,000 토큰이며,
              사용자마다 오늘(UTC) 사용량이 한도에 도달하면 AI 요청이
              차단됩니다. API 키와 모델은 아카데미 관리자 플랜 페이지에서
              설정합니다.
            </p>
            <label className={style.limitToggle}>
              <input
                type="checkbox"
                checked={limitEnabled}
                onChange={(e) => setLimitEnabled(e.target.checked)}
              />
              <span>1인 일일 Alt 한도 사용</span>
            </label>
            <div className={style.limitField}>
              <Input
                appearence="flat"
                type="number"
                label="일일 Alt 한도 (1인)"
                placeholder="1"
                value={dailyUserAlts}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setDailyUserAlts(e.target.value);
                }}
                disabled={!limitEnabled}
              />
            </div>
            <div className={style.limitActions}>
              <Button type="ghost" onClick={saveUsageLimits}>
                한도 저장
              </Button>
            </div>
          </section>
        )}

        {canEditUsageLimits && (
          <section className={style.section}>
            <button
              type="button"
              className={style.complianceSummary}
              onClick={() => setShowCompliance((v) => !v)}
              aria-expanded={showCompliance}
            >
              <div>
                <h4 className={style.sectionTitle} style={{ marginBottom: 4 }}>
                  미성년 학생 보호를 위한 아카데미 이행사항
                </h4>
                <p className={style.sectionHint} style={{ marginBottom: 0 }}>
                  API 키 계약 당사자는 아카데미입니다. 법정대리인 동의, ZDR,
                  개인정보 처리방침 갱신 등이 필요할 수 있습니다.
                </p>
              </div>
              <span className={style.chevron}>
                {showCompliance ? "접기 ▲" : "펼치기 ▼"}
              </span>
            </button>
            {showCompliance && (
              <div className={style.complianceBody}>
                <ul>
                  <li>
                    만 14세 미만 학생이 AI 기능을 사용하는 경우, 개인정보보호법에
                    따라 법정대리인 동의를 받아야 합니다.
                  </li>
                  <li>
                    OpenAI를 사용하고 만 14세 미만 학생이 있는 경우, OpenAI
                    계정에서 Zero Data Retention(ZDR)을 신청해야 합니다.
                  </li>
                  <li>
                    아카데미의 개인정보 처리방침에 사용하는 AI 제공자를 처리
                    위탁·국외 이전 항목으로 기재해야 합니다.
                  </li>
                  <li>
                    제공자의 미성년자 관련 가이드라인을 확인하세요.{" "}
                    <a
                      href="https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={style.link}
                    >
                      OpenAI Under 18 API Guidance
                    </a>
                    {" · "}
                    <a
                      href="https://support.claude.com/en/articles/9307344-responsible-use-of-anthropic-s-models-guidelines-for-organizations-serving-minors"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={style.link}
                    >
                      Anthropic 미성년자 대상 조직 가이드라인
                    </a>
                  </li>
                </ul>
                <p className={style.complianceFoot}>
                  Altsis는 AI 사용 고지, 안전 시스템 프롬프트, 교사의 학생 AI
                  대화 모니터링 기능을 기본 제공하여 위 가이드라인의 안전조치
                  요건 이행을 지원합니다.
                </p>
              </div>
            )}
          </section>
        )}

        <section className={style.section}>
          <h4 className={style.sectionTitle}>라이브러리</h4>
          <p className={style.sectionHint}>
            지침·학습정보는 Alter 라이브러리 페이지에서 만들고 고칩니다. 아래
            스킬 설정에는 학교 공식 항목만 연결할 수 있습니다.
          </p>
          <Button
            type="ghost"
            onClick={() => {
              const academyId = currentUser?.academyId;
              const schoolId = schoolData.schoolId;
              if (academyId && schoolId) {
                navigate(`/${academyId}/${schoolId}/library`);
              } else {
                navigate("/library");
              }
            }}
          >
            라이브러리 열기
          </Button>
        </section>

        <section className={style.section}>
          <h4 className={style.sectionTitle}>스킬 설정</h4>
          <p className={style.sectionHint}>
            학교 공식 지침·학습정보를 스킬별로 연결합니다. 항목은 Alter
            라이브러리에서 등록합니다. 여기서 체크하거나 적용 스킬 태그가 달린
            공식 항목만 Alter 작성 지침에 나타납니다.
          </p>

          <div className={style.skillTabs}>
            {SKILLS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`${style.skillTab} ${
                  activeSkill === s.id ? style.skillTabActive : ""
                }`}
                onClick={() => setActiveSkill(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>

          <p className={style.sectionHint}>
            {SKILLS.find((s) => s.id === activeSkill)?.hint}
          </p>

          <div className={style.fieldBlock}>
            <span className={style.fieldLabel}>적용할 라이브러리 항목</span>
            {libraryForSkill.length === 0 ? (
              <p className={style.emptyNote}>
                이 스킬에 연결할 학교 공식 항목이 없습니다. 라이브러리에서
                지침·학습정보를 등록해 주세요.
              </p>
            ) : (
              <div className={style.listPanel}>
                {libraryForSkill.map((item) => {
                  const checked = (skillConfig.libraryItemIds || [])
                    .map(String)
                    .includes(String(item._id));
                  return (
                    <label
                      key={item._id}
                      className={`${style.listRow} ${
                        checked ? style.listRowChecked : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        className={style.listCheck}
                        checked={checked}
                        onChange={() => toggleLibrarySelect(String(item._id))}
                      />
                      <span>
                        <span className={style.listTitle}>{item.title}</span>
                        <span className={style.tagChip}>
                          {item.kind === "instruction" ? "지침" : "학습정보"}
                        </span>
                        <span className={style.listMeta}>
                          {" "}
                          · {(item.content || "").slice(0, 80)}
                          {(item.content || "").length > 80 ? "…" : ""}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

        </section>
      </div>
    </SchoolFeatureToggle>
  );
};

export default SchoolAISettings;
