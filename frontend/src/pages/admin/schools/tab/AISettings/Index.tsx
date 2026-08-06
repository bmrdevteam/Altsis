import { useEffect, useMemo, useRef, useState } from "react";
import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import SchoolFeatureToggle from "../FeatureSettings";
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
    hint: "Alter 챗봇 대화에 적용할 라이브러리 항목을 선택합니다.",
  },
  {
    id: "syllabus-draft",
    label: "수업",
    hint: "강의계획서 전 항목 초안 작성에 적용할 지침 라이브러리 항목을 선택합니다.",
  },
  {
    id: "evaluation-draft",
    label: "평가",
    hint: "평가 항목 초안 작성에 적용할 라이브러리 항목을 선택합니다.",
  },
  {
    id: "archive-draft",
    label: "기록",
    hint: "학생 기록(행동특성 등) 초안 작성에 적용할 지침 라이브러리 항목을 선택합니다.",
  },
  {
    id: "document-draft",
    label: "문서",
    hint: "보드 문서(매뉴얼·공지·회의록 등) 초안 작성에 적용할 지침 라이브러리 항목을 선택합니다.",
  },
  {
    id: "document-review",
    label: "문서 점검",
    hint: "문서함·보드 문서를 지침에 맞게 점검할 때 적용할 라이브러리 항목을 선택합니다.",
  },
  {
    id: "form-response-draft",
    label: "응답",
    hint: "양식 응답 초안 지침입니다. 기안문은 (작성)·(본문 작성) 칸만 채우고 양식 골격을 유지하도록 안내하는 문구를 넣을 수 있습니다.",
  },
  {
    id: "activity-draft",
    label: "활동",
    hint: "보드 활동(양식) 초안 작성에 적용할 지침 라이브러리 항목을 선택합니다.",
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
  const { SchoolAPI } = useAPIv2();
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

  const schoolEnabled = schoolData.aiEnabled !== false;

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
    const [{ aiConfig: nextConfig }, { items }] = await Promise.all([
      SchoolAPI.RSchoolAiConfig({ params: { _id: schoolData._id } }),
      SchoolAPI.RSchoolAiLibrary({ params: { _id: schoolData._id } }),
    ]);
    applyAiConfig(nextConfig);
    setLibrary(items || []);
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
  }, [schoolData._id]);

  const filteredLibrary = useMemo(() => {
    if (kindFilter === "all") return library;
    return library.filter((i) => i.kind === kindFilter);
  }, [library, kindFilter]);

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

  const saveSkillConfig = async (patch: Partial<TSchoolAiSkillConfig>) => {
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
      alert(SUCCESS_MESSAGE);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const toggleLibrarySelect = (itemId: string) => {
    const current = skillConfig.libraryItemIds || [];
    const next = current.includes(itemId)
      ? current.filter((id) => id !== itemId)
      : [...current, itemId].slice(0, 6);
    saveSkillConfig({ libraryItemIds: next });
  };

  const toggleNewSkillTag = (id: TAlterSkillId) => {
    setNewSkillTags((prev) =>
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
      const { item, aiConfig: nextConfig } =
        await SchoolAPI.CSchoolAiLibraryUpload({
          params: { _id: schoolData._id },
          data: form,
        });
      setLibrary((prev) => [item, ...prev]);
      applyAiConfig(nextConfig);
      setNewTitle("");
      setNewContent("");
      openItem(item, "view");
      alert(
        "저장되었습니다. 선택한 적용 스킬에 자동으로 연결되었습니다."
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

        <section className={style.section}>
          <h4 className={style.sectionTitle}>라이브러리</h4>
          <p className={style.sectionHint}>
            지침(프롬프트성 규칙)과 학습정보(참고 문서)를 등록합니다. 「적용
            스킬」을 선택하면 해당 스킬에 바로 연결됩니다. 목록의 「보기」로
            내용을 확인할 수 있습니다.
          </p>

          <div className={style.filterRow}>
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
                className={`${style.skillTab} ${
                  kindFilter === key ? style.skillTabActive : ""
                }`}
                onClick={() => setKindFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {filteredLibrary.length > 0 ? (
            <div className={style.tableWrap}>
              <Table
                type="object-array"
                data={filteredLibrary.map((item) => ({
                  ...item,
                  kindLabel: item.kind === "instruction" ? "지침" : "학습정보",
                  tags:
                    item.skillTags?.length
                      ? item.skillTags.join(", ")
                      : "모든 스킬",
                  sourceType: item.fileName ? "파일" : "직접 입력",
                }))}
                header={[
                  { text: "유형", key: "kindLabel", width: "80px", type: "text" },
                  { text: "제목", key: "title", type: "text" },
                  { text: "스킬", key: "tags", width: "140px", type: "text" },
                  {
                    text: "출처",
                    key: "sourceType",
                    width: "90px",
                    textAlign: "center",
                    type: "text",
                  },
                  {
                    text: "보기",
                    key: "view",
                    width: "70px",
                    textAlign: "center",
                    type: "button",
                    onClick: (e: any) => {
                      const found = library.find((i) => i._id === e._id);
                      if (found) openItem(found, "view");
                    },
                  },
                  {
                    text: "파일",
                    key: "download",
                    width: "70px",
                    textAlign: "center",
                    type: "button",
                    onClick: (e: any) => {
                      if (e.fileKey) handleDownload(e._id);
                    },
                  },
                  {
                    text: "삭제",
                    key: "delete",
                    width: "70px",
                    textAlign: "center",
                    type: "button",
                    onClick: (e: any) => handleDeleteItem(e._id),
                  },
                ]}
              />
            </div>
          ) : (
            <p className={style.emptyNote}>등록된 라이브러리 항목이 없습니다.</p>
          )}

          {editingItem && (
            <div className={style.editPanel}>
              <p className={style.editPanelTitle}>
                {editMode === "view" ? "등록된 내용" : "내용 수정"} ·{" "}
                {editingItem.title || "(제목 없음)"}
              </p>
              {editMode === "view" ? (
                <>
                  <p className={style.sectionHint}>
                    유형:{" "}
                    {editingItem.kind === "instruction" ? "지침" : "학습정보"}
                    {" · "}
                    적용 스킬:{" "}
                    {editingItem.skillTags?.length
                      ? editingItem.skillTags
                          .map(
                            (id) =>
                              SKILLS.find((s) => s.id === id)?.label || id
                          )
                          .join(", ")
                      : "모든 스킬"}
                  </p>
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
                    <span className={style.fieldLabel}>유형</span>
                    <div className={style.checkboxGrid}>
                      <label>
                        <input
                          type="radio"
                          checked={editKind === "instruction"}
                          onChange={() => setEditKind("instruction")}
                        />
                        지침
                      </label>
                      <label>
                        <input
                          type="radio"
                          checked={editKind === "learning"}
                          onChange={() => setEditKind("learning")}
                        />
                        학습정보
                      </label>
                    </div>
                  </div>
                  <div className={style.fieldBlock}>
                    <label className={style.fieldLabel}>제목</label>
                    <input
                      className={style.input}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                  </div>
                  <div className={style.fieldBlock}>
                    <label className={style.fieldLabel}>내용</label>
                    <textarea
                      className={style.fieldTextarea}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      style={{ minHeight: 160 }}
                    />
                  </div>
                  <div className={style.fieldBlock}>
                    <span className={style.fieldLabel}>적용 스킬</span>
                    <div className={style.checkboxGrid}>
                      {SKILLS.map((s) => (
                        <label key={s.id}>
                          <input
                            type="checkbox"
                            checked={editSkillTags.includes(s.id)}
                            onChange={() =>
                              setEditSkillTags((prev) =>
                                prev.includes(s.id)
                                  ? prev.filter((x) => x !== s.id)
                                  : [...prev, s.id]
                              )
                            }
                          />
                          {s.label}
                        </label>
                      ))}
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
            <div className={style.fieldBlock}>
              <span className={style.fieldLabel}>유형</span>
              <div className={style.checkboxGrid}>
                <label>
                  <input
                    type="radio"
                    checked={newKind === "instruction"}
                    onChange={() => setNewKind("instruction")}
                  />
                  지침
                </label>
                <label>
                  <input
                    type="radio"
                    checked={newKind === "learning"}
                    onChange={() => setNewKind("learning")}
                  />
                  학습정보
                </label>
              </div>
            </div>
            <div className={style.fieldBlock}>
              <label className={style.fieldLabel}>제목</label>
              <input
                className={style.input}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="예: 평가 문체 가이드"
              />
            </div>
            <div className={style.fieldBlock}>
              <label className={style.fieldLabel}>내용</label>
              <textarea
                className={style.fieldTextarea}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="텍스트로 직접 입력하거나, 아래 파일 업로드를 사용하세요."
              />
            </div>
            <div className={style.fieldBlock}>
              <span className={style.fieldLabel}>
                적용 스킬 (선택 시 해당 스킬에 자동 연결, 비우면 모든 스킬)
              </span>
              <div className={style.checkboxGrid}>
                {SKILLS.map((s) => (
                  <label key={s.id}>
                    <input
                      type="checkbox"
                      checked={newSkillTags.includes(s.id)}
                      onChange={() => toggleNewSkillTag(s.id)}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
            <div className={style.actionsSpread}>
              <div>
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
                  파일 업로드
                </Button>
              </div>
              <Button type="ghost" onClick={handleCreateItem}>
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
            체크됩니다.
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
                  const checked = (skillConfig.libraryItemIds || []).includes(
                    item._id
                  );
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
                        onChange={() => toggleLibrarySelect(item._id)}
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
