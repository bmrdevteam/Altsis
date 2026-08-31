import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import { MarkdownEditor, MarkdownViewer } from "components/markdown";
import Svg from "assets/svg/Svg";
import {
  TAiLibraryItem,
  TAiLibraryKind,
  TAiLibraryVisibility,
  TAlterSkillId,
} from "types/schools";
import { canAccessAlterLibrary, isLibraryStaffAuth } from "./libraryAccess";
import {
  ALL_SKILLS_TONE,
  FILE_BADGE_TONE,
  LIBRARY_SKILL_LABELS,
  TLibraryChipTone,
  TLibraryListFilter,
  canEditLibraryItem,
  canPromoteLibraryItem,
  filterLibraryItems,
  INSTRUCTION_CHAR_HINT,
  kindLabel,
  libraryFilterCounts,
  skillLabel,
  skillTone,
  visibilityLabel,
} from "./libraryFilters";
import enroll from "style/pages/enrollment.module.scss";
import aStyle from "pages/boards/altBoard/altBoard.module.scss";
import bStyle from "pages/boards/boards.module.scss";
import mergeStyle from "components/mergeFilter/mergeFilter.module.scss";
import style from "./alterLibrary.module.scss";

type Panel =
  | { kind: "list" }
  | { kind: "view"; itemId: string }
  | { kind: "compose"; itemId?: string };

const FILTERS: Array<{
  id: TLibraryListFilter;
  label: string;
  icon: string;
  tone: TLibraryChipTone;
}> = [
  { id: "all", label: "전체", icon: "list", tone: "All" },
  { id: "instruction", label: "지침", icon: "edit", tone: "Draft" },
  { id: "learning", label: "학습정보", icon: "file", tone: "Optional" },
  { id: "personal", label: "내 자료", icon: "settings", tone: "Direct" },
  { id: "shared", label: "공유", icon: "link", tone: "Scheduled" },
  { id: "school", label: "학교", icon: "school", tone: "Submitted" },
];

const CHIP_TONE_CLASS: Record<TLibraryChipTone, string> = {
  All: bStyle.filterChipToneAll,
  Draft: bStyle.filterChipToneDraft,
  Optional: bStyle.filterChipToneOptional,
  Direct: bStyle.filterChipToneDirect,
  Scheduled: bStyle.filterChipToneScheduled,
  Submitted: bStyle.filterChipToneSubmitted,
  Pending: bStyle.filterChipTonePending,
  Closed: bStyle.filterChipToneClosed,
  Activity: style.chipToneActivity,
  Form: style.chipToneForm,
  Grade: style.chipToneGrade,
};

const BADGE_TONE_CLASS: Record<TLibraryChipTone, string> = {
  All: style.badgeAll,
  Draft: aStyle.badgeDraft,
  Optional: aStyle.badgeOptional,
  Direct: aStyle.badgeDirect,
  Scheduled: aStyle.badgeScheduled,
  Submitted: aStyle.badgeSubmitted,
  Pending: aStyle.badgePending,
  Closed: aStyle.badgeClosed,
  Activity: style.badgeActivity,
  Form: style.badgeForm,
  Grade: style.badgeGrade,
};

const ChipIcon = ({ type }: { type: string }) => (
  <span className={bStyle.filterChipIcon} aria-hidden>
    <Svg type={type} width="12px" height="12px" />
  </span>
);

const FilterChip = ({
  icon,
  tone,
  label,
  active,
  onClick,
}: {
  icon?: string;
  tone: TLibraryChipTone;
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    className={`${bStyle.filterChip} ${CHIP_TONE_CLASS[tone]} ${
      active ? bStyle.filterChipActive : ""
    }`}
    aria-pressed={active}
    onClick={onClick}
  >
    {icon ? <ChipIcon type={icon} /> : null}
    {label}
  </button>
);

const visibilityBadgeClass = (item: TAiLibraryItem) => {
  if (item.visibility === "personal") return aStyle.badgeDirect;
  if (item.visibility === "shared") return aStyle.badgeScheduled;
  return aStyle.badgeSubmitted;
};

const kindBadgeClass = (kind: TAiLibraryKind) =>
  kind === "instruction" ? aStyle.badgeDraft : aStyle.badgeOptional;

const AlterLibrary = () => {
  const {
    currentUser,
    currentSchool,
    currentSeason,
    currentRegistration,
  } = useAuth();
  const { AIAPI } = useAPIv2();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listFileInputRef = useRef<HTMLInputElement>(null);

  const allowed = canAccessAlterLibrary({
    auth: currentUser?.auth,
    role: currentRegistration?.role,
    school: currentSchool,
    season: currentSeason,
  });
  const isStaff = isLibraryStaffAuth(currentUser?.auth);
  const schoolMongoId = currentSchool?._id || "";
  const seasonId = currentSeason?._id;

  const [items, setItems] = useState<TAiLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<Panel>({ kind: "list" });
  const [keyword, setKeyword] = useState("");
  const [listFilter, setListFilter] = useState<TLibraryListFilter>("all");
  const [deleteItem, setDeleteItem] = useState<TAiLibraryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formKind, setFormKind] = useState<TAiLibraryKind>("learning");
  const [formVisibility, setFormVisibility] =
    useState<TAiLibraryVisibility>("personal");
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formSkillTags, setFormSkillTags] = useState<TAlterSkillId[]>([]);

  const queryBase = () => ({
    school: schoolMongoId,
    season: seasonId,
  });

  useEffect(() => {
    if (!allowed || !schoolMongoId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { items: next } = await AIAPI.RAiLibrary({
          query: { school: schoolMongoId, season: seasonId },
        });
        if (!cancelled) setItems(next || []);
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
  }, [allowed, schoolMongoId, seasonId]);

  const displayed = useMemo(
    () => filterLibraryItems(items, { keyword, filter: listFilter }),
    [items, keyword, listFilter]
  );
  const counts = useMemo(() => libraryFilterCounts(items), [items]);
  const hasListFilters = !!keyword.trim() || listFilter !== "all";

  const viewing = useMemo(() => {
    if (panel.kind !== "view") return null;
    return items.find((i) => i._id === panel.itemId) || null;
  }, [panel, items]);

  const openCompose = (item?: TAiLibraryItem) => {
    if (item) {
      setFormKind(item.kind);
      setFormVisibility(item.visibility || "school");
      setFormTitle(item.title || "");
      setFormContent(item.content || "");
      setFormSkillTags((item.skillTags || []) as TAlterSkillId[]);
      setPanel({ kind: "compose", itemId: item._id });
      return;
    }
    setFormKind("learning");
    setFormVisibility(isStaff ? "school" : "personal");
    setFormTitle("");
    setFormContent("");
    setFormSkillTags([]);
    setPanel({ kind: "compose" });
  };

  const toggleSkill = (id: TAlterSkillId) => {
    setFormSkillTags((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const data = {
        kind: isStaff ? formKind : "learning",
        visibility:
          isStaff || formVisibility !== "school"
            ? formVisibility
            : "personal",
        title: formTitle.trim() || "제목 없음",
        content: formContent,
        skillTags: formSkillTags,
        ...queryBase(),
      };
      if (panel.kind === "compose" && panel.itemId) {
        const { item } = await AIAPI.UAiLibraryItem({
          params: { itemId: panel.itemId },
          data,
        });
        setItems((prev) =>
          prev.map((it) => (it._id === item._id ? item : it))
        );
        setPanel({ kind: "view", itemId: item._id });
      } else {
        const { item } = await AIAPI.CAiLibraryItem({ data });
        setItems((prev) => [item, ...prev]);
        setPanel({ kind: "view", itemId: item._id });
      }
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (
    file: File,
    options?: { visibility?: TAiLibraryVisibility; title?: string }
  ) => {
    try {
      setUploading(true);
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "learning");
      form.append(
        "visibility",
        options?.visibility || formVisibility
      );
      form.append("title", options?.title || formTitle.trim() || file.name);
      if (formSkillTags.length && !options) {
        form.append("skillTags", formSkillTags.join(","));
      }
      if (seasonId) form.append("season", seasonId);
      form.append("school", schoolMongoId);
      const { item, extractWarning } = await AIAPI.CAiLibraryUpload({
        query: queryBase(),
        data: form,
      });
      setItems((prev) => [item, ...prev.filter((i) => i._id !== item._id)]);
      setPanel({ kind: "view", itemId: item._id });
      if (extractWarning) alert(extractWarning);
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (listFileInputRef.current) listFileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      await AIAPI.DAiLibraryItem({
        params: { itemId: deleteItem._id },
        query: queryBase(),
      });
      setItems((prev) => prev.filter((i) => i._id !== deleteItem._id));
      setDeleteItem(null);
      setPanel({ kind: "list" });
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handlePromote = async (item: TAiLibraryItem) => {
    try {
      const { item: next } = await AIAPI.UAiLibraryItem({
        params: { itemId: item._id },
        data: { visibility: "school", ...queryBase() },
      });
      setItems((prev) => prev.map((it) => (it._id === next._id ? next : it)));
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleDownload = async (item: TAiLibraryItem) => {
    try {
      const { url } = await AIAPI.RAiLibraryDownload({
        params: { itemId: item._id },
        query: queryBase(),
      });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const openItem = (item: TAiLibraryItem) => {
    setPanel({ kind: "view", itemId: item._id });
  };

  const renderMetaBadges = (item: TAiLibraryItem) => (
    <div className={aStyle.formCardMeta}>
      <span
        className={`${aStyle.formCardBadge} ${kindBadgeClass(item.kind)}`}
      >
        {kindLabel(item.kind)}
      </span>
      <span
        className={`${aStyle.formCardBadge} ${visibilityBadgeClass(item)}`}
      >
        {visibilityLabel(item)}
      </span>
      {item.fileName ? (
        <span
          className={`${aStyle.formCardBadge} ${BADGE_TONE_CLASS[FILE_BADGE_TONE]}`}
        >
          파일
        </span>
      ) : null}
      {item.skillTags?.length ? (
        item.skillTags.map((id) => (
          <span
            key={id}
            className={`${aStyle.formCardBadge} ${BADGE_TONE_CLASS[skillTone(id)]}`}
          >
            {skillLabel(id)}
          </span>
        ))
      ) : (
        <span
          className={`${aStyle.formCardBadge} ${BADGE_TONE_CLASS[ALL_SKILLS_TONE]}`}
        >
          모든 스킬
        </span>
      )}
      {item.ownerName || item.ownerId ? (
        <span>{item.ownerName || item.ownerId}</span>
      ) : null}
    </div>
  );

  if (!currentUser) return null;
  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  const composeIsEdit = panel.kind === "compose" && !!panel.itemId;
  const showInstructionToggle = isStaff;
  const instructionMode = formKind === "instruction";

  const deletePopup = deleteItem ? (
    <Popup
      title="항목 삭제"
      setState={(v: boolean) => {
        if (!v) setDeleteItem(null);
      }}
      closeBtn
      style={{ maxWidth: "420px", width: "100%" }}
      footer={
        <Button type="ghost" onClick={handleDelete}>
          삭제
        </Button>
      }
    >
      <p>
        <strong>{deleteItem.title || "제목 없음"}</strong>을(를) 삭제할까요?
      </p>
    </Popup>
  ) : null;

  const pageWrap = (inner: ReactNode) => (
    <div className={`${enroll.section} ${bStyle.page}`}>
      {inner}
      {deletePopup}
    </div>
  );

  if (panel.kind === "view" && viewing) {
    const editable = canEditLibraryItem(viewing, {
      userId: currentUser._id,
      auth: currentUser.auth,
    });
    return pageWrap(
      <div className={aStyle.builderContainer}>
        <div className={aStyle.builderHeader}>
          <div className={aStyle.builderHeaderLeft}>
            <button
              type="button"
              className={aStyle.backBtn}
              onClick={() => setPanel({ kind: "list" })}
              title="목록"
              aria-label="목록"
            >
              <Svg type="chevronLeft" width="20px" height="20px" />
            </button>
            <span className={aStyle.rendererHeaderTitle}>
              {viewing.title || "(제목 없음)"}
            </span>
            <span
              className={`${aStyle.formCardBadge} ${kindBadgeClass(
                viewing.kind
              )}`}
            >
              {kindLabel(viewing.kind)}
            </span>
            <span
              className={`${aStyle.formCardBadge} ${visibilityBadgeClass(
                viewing
              )}`}
            >
              {visibilityLabel(viewing)}
            </span>
          </div>
          <div className={aStyle.builderHeaderActions}>
            {editable ? (
              <button
                type="button"
                className={aStyle.formCardIconBtn}
                onClick={() => openCompose(viewing)}
                title="수정"
                aria-label="수정"
              >
                <Svg type="edit" width="20px" height="20px" />
              </button>
            ) : null}
            {canPromoteLibraryItem(viewing, currentUser.auth) ? (
              <button
                type="button"
                className={aStyle.formCardIconBtn}
                onClick={() => handlePromote(viewing)}
                title="학교 공식으로 전환"
                aria-label="학교 공식으로 전환"
              >
                <Svg type="school" width="20px" height="20px" />
              </button>
            ) : null}
            {viewing.fileKey ? (
              <button
                type="button"
                className={aStyle.formCardIconBtn}
                onClick={() => handleDownload(viewing)}
                title="파일 다운로드"
                aria-label="파일 다운로드"
              >
                <Svg type="download" width="20px" height="20px" />
              </button>
            ) : null}
            {editable ? (
              <button
                type="button"
                className={`${aStyle.formCardIconBtn} ${aStyle.formCardIconBtnDanger}`}
                onClick={() => setDeleteItem(viewing)}
                title="삭제"
                aria-label="삭제"
              >
                <Svg type="trash" width="20px" height="20px" />
              </button>
            ) : null}
          </div>
        </div>
        <div className={aStyle.builderBody}>
          <div className={aStyle.gfCard}>
            <div className={style.cardPad}>
              {renderMetaBadges(viewing)}
            </div>
          </div>
          <div className={`${aStyle.gfCard} ${aStyle.titleCard}`}>
            <div className={aStyle.titleCardBody}>
              {viewing.kind === "learning" ? (
                <div className={style.markdownWrap}>
                  <MarkdownViewer content={viewing.content || ""} />
                </div>
              ) : (
                <pre className={style.preview}>
                  {viewing.content?.trim() || "(내용 없음)"}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (panel.kind === "compose") {
    return pageWrap(
      <div className={aStyle.builderContainer}>
        <div className={aStyle.builderHeader}>
          <div className={aStyle.builderHeaderLeft}>
            <button
              type="button"
              className={aStyle.backBtn}
              onClick={() => setPanel({ kind: "list" })}
              title="취소"
              aria-label="취소"
            >
              <Svg type="chevronLeft" width="20px" height="20px" />
            </button>
            <span className={aStyle.rendererHeaderTitle}>
              {composeIsEdit ? "항목 수정" : "새 항목"}
            </span>
          </div>
          <div className={aStyle.builderHeaderActions}>
            <button
              type="button"
              className={`${bStyle.textBtn} ${bStyle.textBtnActive} ${style.saveBtn}`}
              onClick={handleSave}
              disabled={saving}
            >
              {composeIsEdit ? "저장" : "만들기"}
            </button>
          </div>
        </div>
        <div className={aStyle.builderBody}>
          <div className={aStyle.gfCard}>
            <div className={style.cardPad}>
              {showInstructionToggle ? (
                <div className={style.fieldGroup}>
                  <span className={aStyle.titleCardEyebrow}>유형</span>
                  <div
                    className={bStyle.filterChipRow}
                    role="radiogroup"
                    aria-label="유형"
                  >
                    <FilterChip
                      icon="edit"
                      tone="Draft"
                      label="지침"
                      active={formKind === "instruction"}
                      onClick={() => setFormKind("instruction")}
                    />
                    <FilterChip
                      icon="file"
                      tone="Optional"
                      label="학습정보"
                      active={formKind === "learning"}
                      onClick={() => setFormKind("learning")}
                    />
                  </div>
                </div>
              ) : (
                <p className={style.hint}>
                  교사는 학습정보만 등록할 수 있습니다.
                </p>
              )}
              <div className={style.fieldGroup}>
                <span className={aStyle.titleCardEyebrow}>공개 범위</span>
                <div
                  className={bStyle.filterChipRow}
                  role="radiogroup"
                  aria-label="공개 범위"
                >
                  {isStaff ? (
                    <FilterChip
                      icon="school"
                      tone="Submitted"
                      label="학교 공식"
                      active={formVisibility === "school"}
                      onClick={() => setFormVisibility("school")}
                    />
                  ) : null}
                  <FilterChip
                    icon="link"
                    tone="Scheduled"
                    label="공유"
                    active={formVisibility === "shared"}
                    onClick={() => setFormVisibility("shared")}
                  />
                  <FilterChip
                    icon="settings"
                    tone="Direct"
                    label="내 자료"
                    active={formVisibility === "personal"}
                    onClick={() => setFormVisibility("personal")}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={`${aStyle.gfCard} ${aStyle.titleCard}`}>
            <div className={aStyle.titleCardBody}>
              <label className={aStyle.titleCardEyebrow} htmlFor="lib-title">
                제목
              </label>
              <input
                id="lib-title"
                className={aStyle.gfTitleInput}
                placeholder="제목"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
              <span className={aStyle.titleCardEyebrow}>내용</span>
              {instructionMode ? (
                <>
                  <textarea
                    className={style.textarea}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    maxLength={8000}
                    placeholder="지침 본문을 작성하세요."
                  />
                  <p className={style.hint}>
                    {formContent.length.toLocaleString()}자 · 스킬 지침 합산 권장{" "}
                    {INSTRUCTION_CHAR_HINT.toLocaleString()}자
                  </p>
                </>
              ) : (
                <MarkdownEditor
                  value={formContent}
                  onChange={setFormContent}
                  placeholder="학습정보 본문을 작성하세요."
                  minHeight="360px"
                />
              )}
              {!instructionMode && !composeIsEdit ? (
                <div className={style.composeFileAction}>
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
                  <button
                    type="button"
                    className={bStyle.textBtn}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Svg type="upload" width="16px" height="16px" />
                    {uploading ? "올리는 중…" : "파일로 추가"}
                  </button>
                  <p className={style.hint}>
                    PDF, DOCX, TXT, HWP · 최대 10MB. 텍스트를 추출해 학습정보로
                    저장합니다.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className={aStyle.gfCard}>
            <div className={style.cardPad}>
              <div className={style.fieldGroup}>
                <span className={aStyle.titleCardEyebrow}>적용 스킬</span>
                <p className={style.hint}>
                  비우면 모든 스킬에 노출됩니다. 학교 공식 항목은 선택한 스킬에
                  자동 연결됩니다.
                </p>
                <div
                  className={bStyle.filterChipRow}
                  role="group"
                  aria-label="적용 스킬"
                >
                  {LIBRARY_SKILL_LABELS.map((s) => {
                    const active = formSkillTags.includes(s.id);
                    return (
                    <FilterChip
                      key={s.id}
                      tone={s.tone}
                      label={s.label}
                      active={active}
                      onClick={() => toggleSkill(s.id)}
                    />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return pageWrap(
    <>
      <div className={bStyle.header}>
        <div className={enroll.title} style={{ margin: 0 }}>
          Alter 라이브러리
        </div>
      </div>
      <div style={{ paddingTop: 20 }}>
        <section className={aStyle.formSectionPanel}>
          <div className={aStyle.formSectionHeaderStatic}>
            <div className={aStyle.formSectionHeaderMain}>
              <h3 className={aStyle.formSectionTitle}>항목</h3>
              <span className={aStyle.formSectionCount}>
                {displayed.length}
              </span>
            </div>
            <div className={aStyle.formListToolbar}>
              <button
                type="button"
                className={bStyle.iconBtn}
                onClick={() => openCompose()}
                title="새 항목"
                aria-label="새 항목"
              >
                <Svg type="plus" width="18px" height="18px" />
              </button>
              <button
                type="button"
                className={bStyle.iconBtn}
                onClick={() => listFileInputRef.current?.click()}
                disabled={uploading}
                title="파일로 추가"
                aria-label="파일로 추가"
              >
                <Svg type="upload" width="18px" height="18px" />
              </button>
              <input
                ref={listFileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.hwp"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleUpload(file, {
                      visibility: isStaff ? "school" : "personal",
                      title: file.name,
                    });
                  }
                }}
              />
            </div>
          </div>
          <div className={aStyle.formSectionBody}>
            <p className={style.sectionHint}>
              지침은 작성 규칙, 학습정보는 참고 자료입니다. 교사는 내 자료·공유
              학습정보를 올릴 수 있고, 학교 공식 지침은 관리자가 만듭니다.
            </p>
            <div className={bStyle.activityFilterBlock}>
              <div className={mergeStyle.mergeSearchBar}>
                <div className={mergeStyle.mergeSearchInputWrap}>
                  <span className={mergeStyle.mergeSearchIcon}>
                    <Svg type="search" width="18px" height="18px" />
                  </span>
                  <input
                    className={mergeStyle.mergeSearchInput}
                    type="search"
                    placeholder="제목, 작성자 검색"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                </div>
              </div>
              <div
                className={bStyle.filterChipRow}
                role="radiogroup"
                aria-label="라이브러리 필터"
              >
                {FILTERS.map((f) => {
                  const active =
                    f.id === "all"
                      ? listFilter === "all"
                      : listFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      className={`${bStyle.filterChip} ${
                        CHIP_TONE_CLASS[f.tone]
                      } ${active ? bStyle.filterChipActive : ""}`}
                      aria-pressed={active}
                      onClick={() => setListFilter(f.id)}
                    >
                      <ChipIcon type={f.icon} />
                      {f.label} {counts[f.id]}
                    </button>
                  );
                })}
                {hasListFilters ? (
                  <button
                    type="button"
                    className={bStyle.filterChipReset}
                    onClick={() => {
                      setKeyword("");
                      setListFilter("all");
                    }}
                  >
                    초기화
                  </button>
                ) : null}
              </div>
            </div>
            {loading ? (
              <div className={aStyle.emptyState}>불러오는 중…</div>
            ) : displayed.length === 0 ? (
              <div className={aStyle.emptyState}>
                {items.length === 0
                  ? "등록된 항목이 없습니다. 새 항목으로 지침이나 학습정보를 추가하세요."
                  : "조건에 맞는 항목이 없습니다."}
              </div>
            ) : (
              <div className={aStyle.formCardList}>
                {displayed.map((item) => {
                  const editable = canEditLibraryItem(item, {
                    userId: currentUser._id,
                    auth: currentUser.auth,
                  });
                  const instruction = item.kind === "instruction";
                  return (
                    <div
                      key={item._id}
                      className={`${aStyle.formCard} ${aStyle.formCardInteractive}`}
                      onClick={() => openItem(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openItem(item);
                        }
                      }}
                    >
                      <div className={aStyle.formCardMain}>
                        <div
                          className={`${aStyle.formCardLeadIcon} ${
                            instruction
                              ? aStyle.formCardLeadIconDraft
                              : aStyle.formCardLeadIconInfo
                          }`}
                          aria-hidden
                        >
                          <Svg
                            type={instruction ? "edit" : "file"}
                            width="20px"
                            height="20px"
                          />
                        </div>
                        <div className={aStyle.formCardLeft}>
                          <div className={aStyle.formCardTitle}>
                            {item.title || "(제목 없음)"}
                          </div>
                          {renderMetaBadges(item)}
                        </div>
                      </div>
                      <div className={aStyle.formCardRight}>
                        {editable ? (
                          <button
                            type="button"
                            className={aStyle.formCardIconBtn}
                            title="수정"
                            aria-label="수정"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCompose(item);
                            }}
                          >
                            <Svg type="edit" width="16px" height="16px" />
                          </button>
                        ) : null}
                        {canPromoteLibraryItem(item, currentUser.auth) ? (
                          <button
                            type="button"
                            className={aStyle.formCardIconBtn}
                            title="학교 공식으로 전환"
                            aria-label="학교 공식으로 전환"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePromote(item);
                            }}
                          >
                            <Svg type="school" width="16px" height="16px" />
                          </button>
                        ) : null}
                        {item.fileKey ? (
                          <button
                            type="button"
                            className={aStyle.formCardIconBtn}
                            title="파일 다운로드"
                            aria-label="파일 다운로드"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(item);
                            }}
                          >
                            <Svg type="download" width="16px" height="16px" />
                          </button>
                        ) : null}
                        {editable ? (
                          <button
                            type="button"
                            className={`${aStyle.formCardIconBtn} ${aStyle.formCardIconBtnDanger}`}
                            title="삭제"
                            aria-label="삭제"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteItem(item);
                            }}
                          >
                            <Svg type="trash" width="16px" height="16px" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

export default AlterLibrary;
