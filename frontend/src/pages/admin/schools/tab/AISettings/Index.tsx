import { useEffect, useMemo, useRef, useState } from "react";
import Button from "components/button/Button";
import Input from "components/input/Input";
import Table from "components/tableV2/Table";
import SchoolFeatureToggle from "../FeatureSettings";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
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
];

const defaultAiConfig = (): TSchoolAiConfig => ({
  permission: { teacher: false, student: false },
  skills: {},
});

const emptySkill = (): TSchoolAiSkillConfig => ({
  libraryItemIds: [],
});

const skillLabel = (id: string) =>
  SKILLS.find((s) => s.id === id)?.label || id;

type Props = {
  schoolData: TSchool;
  setSchoolData?: (data: TSchool) => void;
  seasonList?: Array<{ _id: string; year?: string; term?: string }>;
};

const SchoolAISettings = ({ schoolData, setSchoolData }: Props) => {
  const { currentUser } = useAuth();
  const { SchoolAPI, AcademyAPI } = useAPIv2();
  const canEditUsageLimits =
    currentUser?.auth === "admin" ||
    currentUser?.auth === "manager" ||
    currentUser?.auth === "owner";
  const [loading, setLoading] = useState(true);
  const [aiConfig, setAiConfig] = useState<TSchoolAiConfig>(defaultAiConfig());
  const [library, setLibrary] = useState<TAiLibraryItem[]>([]);
  const [kindFilter, setKindFilter] = useState<"all" | "instruction" | "learning">(
    "all"
  );
  const [activeSkill, setActiveSkill] = useState<TAlterSkillId>("chat");

  const [newKind, setNewKind] = useState<"instruction" | "learning">("learning");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newSkillTags, setNewSkillTags] = useState<TAlterSkillId[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editingItem, setEditingItem] = useState<TAiLibraryItem | null>(null);
  const [editKind, setEditKind] = useState<"instruction" | "learning">(
    "learning"
  );
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editSkillTags, setEditSkillTags] = useState<TAlterSkillId[]>([]);
  const [editMode, setEditMode] = useState<"view" | "edit">("view");
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const openItem = (item: TAiLibraryItem, mode: "view" | "edit" = "view") => {
    setEditingItem(item);
    setEditKind(item.kind);
    setEditTitle(item.title || "");
    setEditContent(item.content || "");
    setEditSkillTags((item.skillTags || []) as TAlterSkillId[]);
    setEditMode(mode);
  };

  const closeItemPanel = () => {
    setEditingItem(null);
    setEditMode("view");
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

  const filteredLibrary = useMemo(() => {
    if (kindFilter === "all") return library;
    return library.filter((i) => i.kind === kindFilter);
  }, [library, kindFilter]);

  const libraryCounts = useMemo(
    () => ({
      all: library.length,
      instruction: library.filter((i) => i.kind === "instruction").length,
      learning: library.filter((i) => i.kind === "learning").length,
    }),
    [library]
  );

  const skillConfig = aiConfig.skills?.[activeSkill] || emptySkill();

  const libraryForSkill = useMemo(() => {
    return library.filter((item) => {
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

  const toggleNewSkillTag = (id: TAlterSkillId) => {
    setNewSkillTags((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleEditSkillTag = (id: TAlterSkillId) => {
    setEditSkillTags((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreateItem = async () => {
    try {
      const { item, aiConfig: nextConfig } = await SchoolAPI.CSchoolAiLibraryItem(
        {
          params: { _id: schoolData._id },
          data: {
            kind: newKind,
            title: newTitle.trim() || "제목 없음",
            content: newContent,
            skillTags: newSkillTags,
          },
        }
      );
      setLibrary((prev) => [item, ...prev]);
      applyAiConfig(nextConfig);
      setNewTitle("");
      setNewContent("");
      setNewSkillTags([]);
      openItem(item, "view");
      alert(
        "저장되었습니다. 선택한 적용 스킬에 자동으로 연결되었습니다."
      );
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleUpload = async (file: File) => {
    try {
      setIsUploading(true);
      const form = new FormData();
      form.append("file", file);
      form.append("kind", newKind);
      form.append("title", newTitle.trim() || file.name);
      if (newSkillTags.length) {
        form.append("skillTags", newSkillTags.join(","));
      }
      const { item, aiConfig: nextConfig, contentLength, extractWarning } =
        await SchoolAPI.CSchoolAiLibraryUpload({
          params: { _id: schoolData._id },
          data: form,
        });
      setLibrary((prev) => [item, ...prev]);
      applyAiConfig(nextConfig);
      setNewTitle("");
      setNewContent("");
      openItem(item, "view");
      const lengthNote =
        typeof contentLength === "number"
          ? `\n추출된 글자 수: ${contentLength.toLocaleString()}자`
          : "";
      alert(
        extractWarning
          ? `${extractWarning}${lengthNote}\n\n항목은 저장되었습니다. 선택한 적용 스킬에 자동으로 연결되었습니다.`
          : `저장되었습니다. 선택한 적용 스킬에 자동으로 연결되었습니다.${lengthNote}`
      );
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveEditItem = async () => {
    if (!editingItem) return;
    try {
      const { item, aiConfig: nextConfig } = await SchoolAPI.USchoolAiLibraryItem(
        {
          params: { _id: schoolData._id, itemId: editingItem._id },
          data: {
            kind: editKind,
            title: editTitle.trim() || "제목 없음",
            content: editContent,
            skillTags: editSkillTags,
          },
        }
      );
      setLibrary((prev) =>
        prev.map((row) => (row._id === item._id ? item : row))
      );
      applyAiConfig(nextConfig);
      openItem(item, "view");
      alert(SUCCESS_MESSAGE);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm("이 라이브러리 항목을 삭제할까요?")) return;
    try {
      await SchoolAPI.DSchoolAiLibraryItem({
        params: { _id: schoolData._id, itemId },
      });
      setLibrary((prev) => prev.filter((i) => i._id !== itemId));
      if (editingItem?._id === itemId) closeItemPanel();
      setAiConfig((prev) => {
        const skills = { ...prev.skills };
        for (const key of Object.keys(skills) as TAlterSkillId[]) {
          const cfg = skills[key];
          if (!cfg?.libraryItemIds) continue;
          skills[key] = {
            ...cfg,
            libraryItemIds: cfg.libraryItemIds.filter((id) => id !== itemId),
          };
        }
        return { ...prev, skills };
      });
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleDownload = async (itemId: string) => {
    try {
      const { url } = await SchoolAPI.RSchoolAiLibraryDownload({
        params: { _id: schoolData._id, itemId },
      });
      window.open(url, "_blank");
    } catch (err) {
      ALERT_ERROR(err);
    }
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
            지침(프롬프트성 규칙)과 학습정보(참고 문서)를 등록합니다. 「적용
            스킬」을 선택하면 해당 스킬에 바로 연결됩니다. 목록의 「보기」로
            내용을 확인할 수 있습니다.
          </p>

          <div className={style.filterRow} role="tablist" aria-label="라이브러리 유형 필터">
            {(
              [
                ["all", "전체"],
                ["instruction", "지침"],
                ["learning", "학습정보"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={kindFilter === key}
                className={`${style.skillTab} ${
                  kindFilter === key ? style.skillTabActive : ""
                }`}
                onClick={() => setKindFilter(key)}
              >
                {label}
                <span className={style.filterCount}>{libraryCounts[key]}</span>
              </button>
            ))}
          </div>

          {filteredLibrary.length > 0 ? (
            <ul className={style.libraryList}>
              {filteredLibrary.map((item) => {
                const isActive = editingItem?._id === item._id;
                const tags = item.skillTags?.length
                  ? item.skillTags.map(skillLabel)
                  : ["모든 스킬"];
                return (
                  <li key={item._id}>
                    <article
                      className={`${style.libraryCard} ${
                        isActive ? style.libraryCardActive : ""
                      }`}
                    >
                      <div className={style.libraryCardBody}>
                        <div className={style.libraryCardBadges}>
                          <span
                            className={`${style.kindBadge} ${
                              item.kind === "instruction"
                                ? style.kindBadgeInstruction
                                : style.kindBadgeLearning
                            }`}
                          >
                            {item.kind === "instruction" ? "지침" : "학습정보"}
                          </span>
                          <span className={style.sourceBadge}>
                            {item.fileName ? "파일" : "직접 입력"}
                          </span>
                          {item.fileName ? (
                            <span className={style.fileName} title={item.fileName}>
                              {item.fileName}
                            </span>
                          ) : null}
                        </div>
                        <h5 className={style.libraryCardTitle}>
                          {item.title || "(제목 없음)"}
                        </h5>
                        <div className={style.librarySkillChips}>
                          {tags.map((tag) => (
                            <span key={tag} className={style.chip}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className={style.libraryCardActions}>
                        <button
                          type="button"
                          className={style.cardAction}
                          onClick={() => openItem(item, "view")}
                        >
                          보기
                        </button>
                        <button
                          type="button"
                          className={style.cardAction}
                          disabled={!item.fileKey}
                          onClick={() => handleDownload(item._id)}
                          title={
                            item.fileKey
                              ? "원본 파일 다운로드"
                              : "업로드된 파일이 없습니다"
                          }
                        >
                          파일
                        </button>
                        <button
                          type="button"
                          className={`${style.cardAction} ${style.cardActionDanger}`}
                          onClick={() => handleDeleteItem(item._id)}
                        >
                          삭제
                        </button>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={style.emptyNote}>
              {library.length === 0
                ? "등록된 라이브러리 항목이 없습니다. 아래에서 지침이나 학습정보를 추가해 보세요."
                : "이 유형의 항목이 없습니다."}
            </p>
          )}

          {editingItem && (
            <div className={style.editPanel}>
              <p className={style.editPanelTitle}>
                {editMode === "view" ? "등록된 내용" : "내용 수정"} ·{" "}
                {editingItem.title || "(제목 없음)"}
              </p>
              {editMode === "view" ? (
                <>
                  <div className={style.libraryCardBadges}>
                    <span
                      className={`${style.kindBadge} ${
                        editingItem.kind === "instruction"
                          ? style.kindBadgeInstruction
                          : style.kindBadgeLearning
                      }`}
                    >
                      {editingItem.kind === "instruction"
                        ? "지침"
                        : "학습정보"}
                    </span>
                    <span className={style.sourceBadge}>
                      {editingItem.fileName ? "파일" : "직접 입력"}
                    </span>
                  </div>
                  <div className={style.librarySkillChips}>
                    {(editingItem.skillTags?.length
                      ? editingItem.skillTags.map(skillLabel)
                      : ["모든 스킬"]
                    ).map((tag) => (
                      <span key={tag} className={style.chip}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <pre className={style.previewBox}>
                    {editingItem.content?.trim()
                      ? editingItem.content
                      : "(내용 없음)"}
                  </pre>
                  <div className={style.actions}>
                    <Button type="ghost" onClick={closeItemPanel}>
                      닫기
                    </Button>
                    <Button
                      type="ghost"
                      onClick={() => setEditMode("edit")}
                    >
                      수정
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className={style.fieldBlock}>
                    <span className={style.fieldLabel} id="edit-kind-label">
                      유형
                    </span>
                    <div
                      className={style.kindToggle}
                      role="radiogroup"
                      aria-labelledby="edit-kind-label"
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={editKind === "instruction"}
                        className={`${style.kindToggleBtn} ${
                          editKind === "instruction"
                            ? style.kindToggleBtnInstruction
                            : ""
                        }`}
                        onClick={() => setEditKind("instruction")}
                      >
                        지침
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={editKind === "learning"}
                        className={`${style.kindToggleBtn} ${
                          editKind === "learning"
                            ? style.kindToggleBtnLearning
                            : ""
                        }`}
                        onClick={() => setEditKind("learning")}
                      >
                        학습정보
                      </button>
                    </div>
                  </div>
                  <div className={style.fieldBlock}>
                    <label className={style.fieldLabel} htmlFor="ai-lib-edit-title">
                      제목
                    </label>
                    <input
                      id="ai-lib-edit-title"
                      className={style.input}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                  </div>
                  <div className={style.fieldBlock}>
                    <label
                      className={style.fieldLabel}
                      htmlFor="ai-lib-edit-content"
                    >
                      내용
                    </label>
                    <textarea
                      id="ai-lib-edit-content"
                      className={style.fieldTextarea}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      style={{ minHeight: 160 }}
                    />
                  </div>
                  <div className={style.fieldBlock}>
                    <span className={style.fieldLabel}>적용 스킬</span>
                    <p className={style.fieldHint}>
                      비우면 모든 스킬에 노출됩니다.
                    </p>
                    <div
                      className={style.skillChipGrid}
                      role="group"
                      aria-label="적용 스킬"
                    >
                      {SKILLS.map((s) => {
                        const active = editSkillTags.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            className={`${style.skillChip} ${
                              active ? style.skillChipActive : ""
                            }`}
                            aria-pressed={active}
                            onClick={() => toggleEditSkillTag(s.id)}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className={style.actions}>
                    <Button
                      type="ghost"
                      onClick={() => openItem(editingItem, "view")}
                    >
                      취소
                    </Button>
                    <Button type="ghost" onClick={handleSaveEditItem}>
                      저장
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className={style.refForm}>
            <div className={style.refFormHeader}>
              <h5 className={style.refFormTitle}>항목 추가</h5>
              <p className={style.refFormHint}>
                목록에 새 지침·학습정보를 등록합니다.
              </p>
            </div>

            <div className={style.fieldBlock}>
              <span className={style.fieldLabel} id="new-kind-label">
                유형
              </span>
              <div
                className={style.kindToggle}
                role="radiogroup"
                aria-labelledby="new-kind-label"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={newKind === "instruction"}
                  className={`${style.kindToggleBtn} ${
                    newKind === "instruction"
                      ? style.kindToggleBtnInstruction
                      : ""
                  }`}
                  onClick={() => setNewKind("instruction")}
                >
                  지침
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={newKind === "learning"}
                  className={`${style.kindToggleBtn} ${
                    newKind === "learning" ? style.kindToggleBtnLearning : ""
                  }`}
                  onClick={() => setNewKind("learning")}
                >
                  학습정보
                </button>
              </div>
              <p className={style.fieldHint}>
                {newKind === "instruction"
                  ? "작성·점검 규칙으로 AI 지침에 들어갑니다."
                  : "배경·참고 자료로 AI 프롬프트에 붙습니다."}
              </p>
            </div>

            <div className={style.fieldBlock}>
              <label className={style.fieldLabel} htmlFor="ai-lib-new-title">
                제목
              </label>
              <input
                id="ai-lib-new-title"
                className={style.input}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={
                  newKind === "instruction"
                    ? "예: 평가 문체 가이드"
                    : "예: 학교 교육과정 요약"
                }
              />
            </div>

            <div className={style.fieldBlock}>
              <label className={style.fieldLabel} htmlFor="ai-lib-new-content">
                내용
              </label>
              <textarea
                id="ai-lib-new-content"
                className={style.fieldTextarea}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="텍스트로 직접 입력하세요. 파일로 추가하면 이 내용은 사용되지 않습니다."
                disabled={isUploading}
              />
            </div>

            <div className={style.fieldBlock}>
              <span className={style.fieldLabel}>적용 스킬</span>
              <p className={style.fieldHint}>
                선택 시 해당 스킬에 자동 연결됩니다. 비우면 모든 스킬에
                노출됩니다.
              </p>
              <div
                className={style.skillChipGrid}
                role="group"
                aria-label="적용 스킬"
              >
                {newSkillTags.length === 0 ? (
                  <span className={`${style.skillChip} ${style.skillChipMuted}`}>
                    모든 스킬
                  </span>
                ) : null}
                {SKILLS.map((s) => {
                  const active = newSkillTags.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`${style.skillChip} ${
                        active ? style.skillChipActive : ""
                      }`}
                      aria-pressed={active}
                      onClick={() => toggleNewSkillTag(s.id)}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={style.refFormActions}>
              <div className={style.refFormFileSide}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.hwp"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                  }}
                />
                <Button
                  type="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  loading={isUploading}
                >
                  파일로 추가
                </Button>
                <p className={style.fileFormatHint}>
                  PDF, DOCX, TXT, HWP · 최대 10MB · 텍스트 추출 후 저장(긴
                  문서는 앞부분·검색용 청크로 보관). 스캔 PDF는 추출이 거의 안 될
                  수 있습니다.
                </p>
              </div>
              <Button type="ghost" onClick={handleCreateItem} disabled={isUploading}>
                텍스트로 추가
              </Button>
            </div>
          </div>
        </section>

        <section className={style.section}>
          <h4 className={style.sectionTitle}>스킬 설정</h4>
          <p className={style.sectionHint}>
            지침과 학습정보는 위 라이브러리에 등록한 뒤, 스킬별로 적용할 항목을
            선택합니다. 라이브러리 등록 시 적용 스킬을 지정하면 아래에 자동으로
            체크됩니다. 여기서 체크하거나 적용 스킬 태그가 달린 항목만 Alter
            작성 지침에 나타납니다.
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
                이 스킬에 노출된 라이브러리 항목이 없습니다. 위에서 지침·학습정보를
                등록해 주세요.
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
