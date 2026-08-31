import { Dispatch, SetStateAction } from "react";
import { TAlterFormResponseField, TAlterPageContext } from "contexts/alterContext";
import { TFormEvaluation } from "types/seasons";
import { TSchoolFormArchiveField } from "types/schools";
import {
  ACTIVITY_FORM_TYPES,
  DOCUMENT_DOC_TYPES,
  PrepKind,
} from "./draftUi";
import GuidelinePicker from "./GuidelinePicker";
import PrepHintRow from "./PrepHintRow";
import PrepSection from "./PrepSection";
import { TGuidelineItem, TSearchSeasonScope } from "./types";
import style from "../Alter.module.scss";

export const EVAL_DRAFT_MAX = 30;
export const EVAL_DRAFT_DEFAULT_BATCH = 8;

type StudentCandidate = {
  studentId: string;
  studentName: string;
  studentGrade: string;
};

export type SkillPrepDockProps = {
  prepKind: PrepKind;
  skillSettingsLoading: boolean;
  pageContext: TAlterPageContext | null;
  expandedGuidelineId: string | null;
  setExpandedGuidelineId: Dispatch<SetStateAction<string | null>>;
  toggleLabel: (
    label: string,
    list: string[],
    setList: (next: string[]) => void
  ) => void;

  // evaluation
  teacherEditableFields: TFormEvaluation;
  allEvalLabels: string[];
  evalTargetLabels: string[];
  setEvalTargetLabels: (next: string[]) => void;
  evalContextLabels: string[];
  setEvalContextLabels: (next: string[]) => void;
  evalScope: "empty" | "all";
  setEvalScope: (v: "empty" | "all") => void;
  evalFillEmptyOnly: boolean;
  setEvalFillEmptyOnly: (v: boolean) => void;
  evalCandidateStudents: StudentCandidate[];
  evalSelectedIds: string[];
  toggleStudentId: (id: string) => void;
  selectDefaultStudentBatch: () => void;
  selectAllCandidateStudents: () => void;
  clearEvalStudents: () => void;
  evalGuidelineItems: TGuidelineItem[];
  evalSelectedGuidelineIds: string[];
  setEvalSelectedGuidelineIds: (next: string[]) => void;

  // archive
  archiveInputFields: TSchoolFormArchiveField[];
  archiveReferenceFields: TSchoolFormArchiveField[];
  archiveWriteMode: "perStudent" | "sameText";
  setArchiveWriteMode: (v: "perStudent" | "sameText") => void;
  archiveTargetLabels: string[];
  setArchiveTargetLabels: (next: string[]) => void;
  archiveContextLabels: string[];
  setArchiveContextLabels: (next: string[]) => void;
  archiveScope: "empty" | "all";
  setArchiveScope: (v: "empty" | "all") => void;
  archiveFillEmptyOnly: boolean;
  setArchiveFillEmptyOnly: (v: boolean) => void;
  archiveGuidelineItems: TGuidelineItem[];
  archiveSelectedGuidelineIds: string[];
  setArchiveSelectedGuidelineIds: (next: string[]) => void;
  archiveCandidateStudents: StudentCandidate[];
  archiveSelectedIds: string[];
  toggleArchiveStudentId: (id: string) => void;
  selectDefaultArchiveStudentBatch: () => void;
  selectAllArchiveCandidateStudents: () => void;
  clearArchiveStudents: () => void;

  // syllabus
  syllabusGuidelineItems: TGuidelineItem[];
  syllabusSelectedGuidelineIds: string[];
  setSyllabusSelectedGuidelineIds: (next: string[]) => void;

  // document
  docWriteMode: "create" | "refine";
  setDocWriteMode: (v: "create" | "refine") => void;
  docType: string;
  setDocType: (v: string) => void;
  docGuidelineItems: TGuidelineItem[];
  docSelectedGuidelineIds: string[];
  setDocSelectedGuidelineIds: (next: string[]) => void;

  // document-review
  docReviewGuidelineItems: TGuidelineItem[];
  docReviewSelectedGuidelineIds: string[];
  setDocReviewSelectedGuidelineIds: (next: string[]) => void;
  docReviewLearningItems: TGuidelineItem[];
  docReviewSelectedLearningIds: string[];
  setDocReviewSelectedLearningIds: (next: string[]) => void;

  // form-response
  formResponseWritableFields: TAlterFormResponseField[];
  formResponseWriteMode: "create" | "refine";
  setFormResponseWriteMode: (v: "create" | "refine") => void;
  formResponseFillEmptyOnly: boolean;
  setFormResponseFillEmptyOnly: (v: boolean) => void;
  formResponseTargetFieldIds: string[];
  setFormResponseTargetFieldIds: (next: string[]) => void;
  formResponseGuidelineItems: TGuidelineItem[];
  formResponseSelectedGuidelineIds: string[];
  setFormResponseSelectedGuidelineIds: (next: string[]) => void;

  // activity
  activityWriteMode: "create" | "refine";
  setActivityWriteMode: (v: "create" | "refine") => void;
  activityFormType: string;
  setActivityFormType: (v: string) => void;
  activityGuidelineItems: TGuidelineItem[];
  activitySelectedGuidelineIds: string[];
  setActivitySelectedGuidelineIds: (next: string[]) => void;

  // form (admin)
  formWriteMode: "create" | "refine";
  setFormWriteMode: (v: "create" | "refine") => void;
  formTypeLabel: string;
  formGuidelineItems: TGuidelineItem[];
  formSelectedGuidelineIds: string[];
  setFormSelectedGuidelineIds: (next: string[]) => void;

  // grade
  gradeFillEmptyOnly: boolean;
  setGradeFillEmptyOnly: (v: boolean) => void;

  // search
  searchSeasonScope: TSearchSeasonScope;
  setSearchSeasonScope: (v: TSearchSeasonScope) => void;
};

const RadioList = ({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
}) => (
  <div className={style.refList}>
    {options.map((t) => (
      <label key={t.id} className={style.refRow}>
        <input
          type="radio"
          name={name}
          checked={value === t.id}
          onChange={() => onChange(t.id)}
        />
        <span>{t.label}</span>
      </label>
    ))}
  </div>
);

const StudentPicker = ({
  candidates,
  selectedIds,
  scopeEmpty,
  onToggle,
  onSelectDefault,
  onSelectAll,
  onClear,
}: {
  candidates: StudentCandidate[];
  selectedIds: string[];
  scopeEmpty: boolean;
  onToggle: (id: string) => void;
  onSelectDefault: () => void;
  onSelectAll: () => void;
  onClear: () => void;
}) => {
  if (candidates.length === 0) {
    return (
      <p className={style.prepText}>
        {scopeEmpty
          ? "채울 빈 칸이 있는 학생이 없습니다."
          : "선택 가능한 학생이 없습니다."}
      </p>
    );
  }
  return (
    <>
      <div className={style.prepActions}>
        <button
          type="button"
          className={style.prepActionBtn}
          onClick={onSelectDefault}
        >
          기본 {EVAL_DRAFT_DEFAULT_BATCH}명
        </button>
        <button
          type="button"
          className={style.prepActionBtn}
          onClick={onSelectAll}
        >
          전체
          {candidates.length > EVAL_DRAFT_MAX
            ? ` (최대 ${EVAL_DRAFT_MAX})`
            : ""}
        </button>
        <button type="button" className={style.prepActionBtn} onClick={onClear}>
          선택 해제
        </button>
      </div>
      <div className={`${style.refList} ${style.refListScroll}`}>
        {candidates.map((student) => {
          const checked = selectedIds.includes(student.studentId);
          const atLimit = !checked && selectedIds.length >= EVAL_DRAFT_MAX;
          return (
            <label key={student.studentId} className={style.refRow}>
              <input
                type="checkbox"
                checked={checked}
                disabled={atLimit}
                onChange={() => onToggle(student.studentId)}
              />
              <span>
                {student.studentGrade ? `${student.studentGrade} · ` : ""}
                {student.studentName || "(이름 없음)"}
                <span className={style.prepMuted}> ({student.studentId})</span>
              </span>
            </label>
          );
        })}
      </div>
      <p className={style.prepText}>
        선택 {selectedIds.length}명
        {candidates.length > selectedIds.length
          ? ` · 후보 ${candidates.length}명`
          : ""}
      </p>
    </>
  );
};

const SkillPrepDock = (p: SkillPrepDockProps) => {
  const { prepKind } = p;
  if (!prepKind) return null;

  if (prepKind === "search") {
    return (
      <>
        <PrepSection
          label="학기 범위"
          hint="현재 학기는 상단에서 고른 학기입니다. 여러 학기가 필요하면 활성 학기 전부를 고르세요. 학년·이름은 질문에 적으면 됩니다."
        >
          <RadioList
            name="searchSeasonScope"
            value={
              p.searchSeasonScope === "activated" ? "activated" : "current"
            }
            onChange={(id) =>
              p.setSearchSeasonScope(id === "activated" ? "activated" : "current")
            }
            options={[
              { id: "current", label: "현재 학기" },
              { id: "activated", label: "활성 학기 전부" },
            ]}
          />
        </PrepSection>
        <PrepHintRow text="수업·수강·평가·기록·양식·캘린더·보드 글 등 권한이 있는 데이터를 찾아 표로 보여 줍니다. 통계나 차트를 요청하면 결과 위에 시각화가 붙습니다." />
      </>
    );
  }

  if (prepKind === "document") {
    return (
      <>
        <PrepSection label="작성 모드">
          <RadioList
            name="docWriteMode"
            value={p.docWriteMode}
            onChange={(id) => p.setDocWriteMode(id as "create" | "refine")}
            options={[
              { id: "create", label: "새로 작성" },
              { id: "refine", label: "기존 글 다듬기" },
            ]}
          />
        </PrepSection>
        <PrepSection
          label="문서 형태"
          hint="형태에 맞게 제목·목록·표·체크리스트 등 에디터 문법을 활용한 초안을 만듭니다."
        >
          <RadioList
            name="docType"
            value={p.docType}
            onChange={p.setDocType}
            options={DOCUMENT_DOC_TYPES}
          />
        </PrepSection>
        <PrepSection
          label="작성 지침"
          hint="학교 AI 라이브러리의 지침 중 이번 문서에 쓸 항목을 고릅니다."
        >
          <GuidelinePicker
            items={p.docGuidelineItems}
            selectedIds={p.docSelectedGuidelineIds}
            expandedId={p.expandedGuidelineId}
            loading={p.skillSettingsLoading}
            emptyText="선택 가능한 지침이 없습니다. Alter 라이브러리에서 「문서」 지침을 추가해 주세요. 기본 기준으로 작성합니다."
            onToggleChecked={(id) =>
              p.toggleLabel(
                id,
                p.docSelectedGuidelineIds,
                p.setDocSelectedGuidelineIds
              )
            }
            onToggleExpanded={(key) =>
              p.setExpandedGuidelineId((cur) => (cur === key ? null : key))
            }
          />
        </PrepSection>
        <PrepHintRow text="초안은 에디터 전체를 덮어씁니다. 미리보기 확인 후 「문서에 반영」하고 저장하세요." />
      </>
    );
  }

  if (prepKind === "document-review") {
    return (
      <>
        <PrepSection
          label="점검 지침"
          hint="학교 AI 스킬 설정에서 「문서 점검」에 연결한 지침만 표시됩니다. 선택한 지침을 기준으로 점검합니다."
        >
          <GuidelinePicker
            items={p.docReviewGuidelineItems}
            selectedIds={p.docReviewSelectedGuidelineIds}
            expandedId={p.expandedGuidelineId}
            loading={p.skillSettingsLoading}
            scroll
            emptyText="연결된 지침이 없습니다. Alter 라이브러리에 지침을 만든 뒤 학교 AI에서 문서 점검에 연결해 주세요. 기본 기준으로 점검합니다."
            onToggleChecked={(id) =>
              p.toggleLabel(
                id,
                p.docReviewSelectedGuidelineIds,
                p.setDocReviewSelectedGuidelineIds
              )
            }
            onToggleExpanded={(key) =>
              p.setExpandedGuidelineId((cur) => (cur === key ? null : key))
            }
          />
        </PrepSection>
        <PrepSection
          label="학습정보"
          hint="학교 AI 스킬 설정에서 「문서 점검」에 연결한 학습정보를 참고 자료로 넣을 수 있습니다."
        >
          <GuidelinePicker
            items={p.docReviewLearningItems}
            selectedIds={p.docReviewSelectedLearningIds}
            expandedId={p.expandedGuidelineId}
            loading={p.skillSettingsLoading}
            loadingText="학습정보를 불러오는 중..."
            scroll
            expandKeyPrefix="learning-"
            emptyText="연결된 학습정보가 없습니다. Alter 라이브러리에 학습정보를 만든 뒤 학교 AI에서 문서 점검에 연결해 주세요."
            onToggleChecked={(id) =>
              p.toggleLabel(
                id,
                p.docReviewSelectedLearningIds,
                p.setDocReviewSelectedLearningIds
              )
            }
            onToggleExpanded={(key) =>
              p.setExpandedGuidelineId((cur) => (cur === key ? null : key))
            }
          />
        </PrepSection>
        <PrepHintRow text="현재 화면에 열린 문서 내용을 점검합니다. 결과는 리포트로만 제공되며 문서에 자동 반영되지 않습니다." />
      </>
    );
  }

  if (prepKind === "form-response") {
    return (
      <>
        <PrepSection
          label="작성 모드"
          hint="문서형 필드에는 (작성)·(본문 작성)처럼 「작성」으로 끝나는 칸만 채웁니다. 표·수신/경유·로고는 유지됩니다."
        >
          <RadioList
            name="formResponseWriteMode"
            value={p.formResponseWriteMode}
            onChange={(id) =>
              p.setFormResponseWriteMode(id as "create" | "refine")
            }
            options={[
              { id: "create", label: "새로 작성" },
              {
                id: "refine",
                label: "양식에 채우기 / 기존 응답 다듬기",
              },
            ]}
          />
        </PrepSection>
        <PrepSection
          label="작성할 항목"
          hint="file·안내(content)는 제외됩니다. 기본은 전체 선택입니다."
        >
          {p.formResponseWritableFields.length === 0 ? (
            <p className={style.prepText}>작성 가능한 응답 필드가 없습니다.</p>
          ) : (
            <div className={style.refList}>
              {p.formResponseWritableFields.map((f) => (
                <label key={f.fieldId} className={style.refRow}>
                  <input
                    type="checkbox"
                    checked={
                      p.formResponseTargetFieldIds.length === 0 ||
                      p.formResponseTargetFieldIds.includes(f.fieldId)
                    }
                    onChange={() => {
                      const allIds = p.formResponseWritableFields.map(
                        (x) => x.fieldId
                      );
                      const current =
                        p.formResponseTargetFieldIds.length === 0
                          ? allIds
                          : p.formResponseTargetFieldIds;
                      const next = current.includes(f.fieldId)
                        ? current.filter((id) => id !== f.fieldId)
                        : [...current, f.fieldId];
                      p.setFormResponseTargetFieldIds(
                        next.length === allIds.length ? [] : next
                      );
                    }}
                  />
                  <span>
                    {f.label || f.fieldId}
                    <span className={style.prepMuted}> · {f.type}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </PrepSection>
        <PrepSection label="반영 방식">
          <div className={style.refList}>
            <label className={style.refRow}>
              <input
                type="checkbox"
                checked={p.formResponseFillEmptyOnly}
                onChange={(e) =>
                  p.setFormResponseFillEmptyOnly(e.target.checked)
                }
              />
              <span>빈 칸만 채우기</span>
            </label>
          </div>
        </PrepSection>
        <PrepSection
          label="작성 지침"
          hint="학교 AI 라이브러리의 「응답」지침을 고릅니다."
        >
          <GuidelinePicker
            items={p.formResponseGuidelineItems}
            selectedIds={p.formResponseSelectedGuidelineIds}
            expandedId={p.expandedGuidelineId}
            loading={p.skillSettingsLoading}
            emptyText="선택 가능한 지침이 없습니다. Alter 라이브러리에서 「응답」 지침을 추가해 주세요. 기본 기준으로 작성합니다."
            onToggleChecked={(id) =>
              p.toggleLabel(
                id,
                p.formResponseSelectedGuidelineIds,
                p.setFormResponseSelectedGuidelineIds
              )
            }
            onToggleExpanded={(key) =>
              p.setExpandedGuidelineId((cur) => (cur === key ? null : key))
            }
          />
        </PrepSection>
        <PrepHintRow text="문서형 필드에는 (작성)·(본문 작성) 칸을 넣어 두세요. AI는 그 칸만 채우고 표·로고는 유지합니다. 미리보기 후 「응답에 반영」하세요." />
      </>
    );
  }

  if (prepKind === "activity") {
    return (
      <>
        <PrepSection label="작성 모드">
          <RadioList
            name="activityWriteMode"
            value={p.activityWriteMode}
            onChange={(id) =>
              p.setActivityWriteMode(id as "create" | "refine")
            }
            options={[
              { id: "create", label: "새로 작성" },
              { id: "refine", label: "기존 양식 다듬기" },
            ]}
          />
        </PrepSection>
        <PrepSection
          label="활동 형태"
          hint="형태에 맞게 일반 응답 필드·설정을 중심으로 초안을 만듭니다. html-app은 제출이 필요 없는 체험용일 때만 씁니다."
        >
          <RadioList
            name="activityFormType"
            value={p.activityFormType}
            onChange={p.setActivityFormType}
            options={ACTIVITY_FORM_TYPES}
          />
        </PrepSection>
        <PrepSection
          label="작성 지침"
          hint="학교 AI 라이브러리의 지침 중 이번 활동에 쓸 항목을 고릅니다."
        >
          <GuidelinePicker
            items={p.activityGuidelineItems}
            selectedIds={p.activitySelectedGuidelineIds}
            expandedId={p.expandedGuidelineId}
            loading={p.skillSettingsLoading}
            emptyText="선택 가능한 지침이 없습니다. Alter 라이브러리에서 「활동」 지침을 추가해 주세요. 기본 기준으로 작성합니다."
            onToggleChecked={(id) =>
              p.toggleLabel(
                id,
                p.activitySelectedGuidelineIds,
                p.setActivitySelectedGuidelineIds
              )
            }
            onToggleExpanded={(key) =>
              p.setExpandedGuidelineId((cur) => (cur === key ? null : key))
            }
          />
        </PrepSection>
        <PrepHintRow text="초안은 양식 필드·설정을 덮어씁니다. 미리보기 확인 후 「양식에 반영」하고 저장하세요." />
      </>
    );
  }

  if (prepKind === "form") {
    const canApply = !!p.pageContext?.applyFormDraft;
    return (
      <>
        <PrepSection label="작성 모드">
          <RadioList
            name="formWriteMode"
            value={p.formWriteMode}
            onChange={(id) => p.setFormWriteMode(id as "create" | "refine")}
            options={[
              { id: "create", label: "새로 작성" },
              { id: "refine", label: "해당 부분만 수정" },
            ]}
          />
        </PrepSection>
        <PrepSection
          label="양식 유형"
          hint="현재 열린 문서 유형입니다. 시간표·강의계획서·출력 규칙이 각각 다릅니다."
        >
          <p className={style.prepText}>{p.formTypeLabel || "양식"}</p>
        </PrepSection>
        <PrepSection
          label="작성 지침"
          hint="학교 AI 라이브러리의 지침 중 이번 양식에 쓸 항목을 고릅니다."
        >
          <GuidelinePicker
            items={p.formGuidelineItems}
            selectedIds={p.formSelectedGuidelineIds}
            expandedId={p.expandedGuidelineId}
            loading={p.skillSettingsLoading}
            emptyText="선택 가능한 지침이 없습니다. Alter 라이브러리에서 「양식」 지침을 추가해 주세요. 기본 기준으로 작성합니다."
            onToggleChecked={(id) =>
              p.toggleLabel(
                id,
                p.formSelectedGuidelineIds,
                p.setFormSelectedGuidelineIds
              )
            }
            onToggleExpanded={(key) =>
              p.setExpandedGuidelineId((cur) => (cur === key ? null : key))
            }
          />
        </PrepSection>
        <PrepHintRow
          text={
            canApply
              ? "초안은 에디터에만 반영됩니다. 미리보기 확인 후 「에디터에 반영」하고 저장하세요. 다듬기는 요청한 칸만 바꿉니다."
              : "양식 문서를 연 뒤 초안을 작성할 수 있습니다."
          }
        />
      </>
    );
  }

  if (prepKind === "assessment-grade") {
    return (
      <>
        <PrepSection label="채점 대상">
          <p className={style.prepText}>
            {p.pageContext?.label || "현재 문서 보기의 응답"}
          </p>
        </PrepSection>
        <PrepSection label="반영 방식">
          <div className={style.refList}>
            <label className={style.refRow}>
              <input
                type="checkbox"
                checked={p.gradeFillEmptyOnly}
                onChange={(e) => p.setGradeFillEmptyOnly(e.target.checked)}
              />
              <span>이미 채점한 칸은 유지 (빈 칸만 채움)</span>
            </label>
          </div>
        </PrepSection>
        <PrepHintRow text="초안은 문서 보기 채점 칸에만 반영됩니다. 확인 후 「채점 저장」또는 「평가 확정」을 눌러 주세요." />
      </>
    );
  }

  if (prepKind === "syllabus") {
    return (
      <>
        <PrepSection
          label="작성 지침"
          hint="학교 AI 라이브러리의 지침 중 이번 수업 초안에 쓸 항목을 고릅니다. 제목을 누르면 내용을 확인할 수 있습니다."
        >
          <GuidelinePicker
            items={p.syllabusGuidelineItems}
            selectedIds={p.syllabusSelectedGuidelineIds}
            expandedId={p.expandedGuidelineId}
            loading={p.skillSettingsLoading}
            scroll
            emptyText="선택 가능한 지침이 없습니다. Alter 라이브러리에서 「수업」 지침을 추가해 주세요. 기본 기준으로 작성합니다."
            onToggleChecked={(id) =>
              p.toggleLabel(
                id,
                p.syllabusSelectedGuidelineIds,
                p.setSyllabusSelectedGuidelineIds
              )
            }
            onToggleExpanded={(key) =>
              p.setExpandedGuidelineId((cur) => (cur === key ? null : key))
            }
          />
        </PrepSection>
        <PrepHintRow text="정보를 입력·첨부한 뒤 「초안 작성」을 누르면 학습 계획서 전 항목 초안을 만듭니다. 미리보기 확인 후 「계획서에 반영」하세요." />
      </>
    );
  }

  if (prepKind === "evaluation") {
    return (
      <>
        <PrepSection label="작성할 항목">
          {p.teacherEditableFields.length === 0 ? (
            <p className={style.prepText}>
              교사 편집이 가능한 평가 항목이 없습니다.
            </p>
          ) : (
            <div className={style.refList}>
              {p.teacherEditableFields.map((field) => (
                <label key={field.label} className={style.refRow}>
                  <input
                    type="checkbox"
                    checked={p.evalTargetLabels.includes(field.label)}
                    onChange={() =>
                      p.toggleLabel(
                        field.label,
                        p.evalTargetLabels,
                        p.setEvalTargetLabels
                      )
                    }
                  />
                  <span>
                    {field.label}
                    {field.type !== "input" ? ` (${field.type})` : ""}
                  </span>
                </label>
              ))}
            </div>
          )}
        </PrepSection>
        <PrepSection
          label="참고할 항목"
          hint="자기평가와 기존 멘토평가를 함께 참고하면, 둘을 종합한 새 멘토평가 초안을 만듭니다. 원문은 복사되지 않도록 재작성합니다."
        >
          {p.allEvalLabels.length === 0 ? (
            <p className={style.prepText}>참고할 항목이 없습니다.</p>
          ) : (
            <div className={style.refList}>
              {p.allEvalLabels.map((label) => {
                const isTarget = p.evalTargetLabels.includes(label);
                return (
                  <label key={label} className={style.refRow}>
                    <input
                      type="checkbox"
                      checked={p.evalContextLabels.includes(label)}
                      onChange={() =>
                        p.toggleLabel(
                          label,
                          p.evalContextLabels,
                          p.setEvalContextLabels
                        )
                      }
                    />
                    <span>
                      {label}
                      {isTarget ? " (작성 대상·기존 내용)" : ""}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </PrepSection>
        <PrepSection
          label="범위"
          hint={
            !p.evalFillEmptyOnly
              ? "종합 재작성 모드: 참고 항목을 합쳐 작성 항목을 새로 씁니다. 「빈 칸만 채우기」를 끄면 기존 내용을 덮어씁니다."
              : undefined
          }
        >
          <div className={style.refList}>
            <label className={style.refRow}>
              <input
                type="radio"
                name="evalScope"
                checked={p.evalScope === "empty"}
                onChange={() => p.setEvalScope("empty")}
              />
              <span>미작성 행만</span>
            </label>
            <label className={style.refRow}>
              <input
                type="radio"
                name="evalScope"
                checked={p.evalScope === "all"}
                onChange={() => p.setEvalScope("all")}
              />
              <span>전체 학생 목록</span>
            </label>
            <label className={style.refRow}>
              <input
                type="checkbox"
                checked={p.evalFillEmptyOnly}
                onChange={(e) => p.setEvalFillEmptyOnly(e.target.checked)}
              />
              <span>빈 칸만 채우기</span>
            </label>
          </div>
        </PrepSection>
        <PrepSection
          label="학생 선택"
          hint={`한 번에 최대 ${EVAL_DRAFT_MAX}명까지 선택해 초안을 만들 수 있습니다. 나눠서 여러 번 실행할 수 있습니다.`}
        >
          <StudentPicker
            candidates={p.evalCandidateStudents}
            selectedIds={p.evalSelectedIds}
            scopeEmpty={p.evalScope === "empty"}
            onToggle={p.toggleStudentId}
            onSelectDefault={p.selectDefaultStudentBatch}
            onSelectAll={p.selectAllCandidateStudents}
            onClear={p.clearEvalStudents}
          />
        </PrepSection>
        <PrepSection
          label="작성 지침"
          hint="학교 AI 라이브러리의 지침 중 이번 평가 초안에 쓸 항목을 고릅니다. 제목을 누르면 내용을 확인할 수 있습니다."
        >
          <GuidelinePicker
            items={p.evalGuidelineItems}
            selectedIds={p.evalSelectedGuidelineIds}
            expandedId={p.expandedGuidelineId}
            loading={p.skillSettingsLoading}
            emptyText="선택 가능한 지침이 없습니다. Alter 라이브러리에서 「평가」 지침을 추가해 주세요. 기본 기준으로 작성합니다."
            onToggleChecked={(id) =>
              p.toggleLabel(
                id,
                p.evalSelectedGuidelineIds,
                p.setEvalSelectedGuidelineIds
              )
            }
            onToggleExpanded={(key) =>
              p.setExpandedGuidelineId((cur) => (cur === key ? null : key))
            }
          />
        </PrepSection>
        <PrepHintRow text="참고(자기평가·기존 멘토평가) → 작성(멘토평가)로 종합 초안을 만듭니다. 학생을 고른 뒤 「초안 작성」을 누르세요. 반영 후에도 행별 저장이 필요합니다." />
      </>
    );
  }

  if (prepKind === "archive") {
    return (
      <>
        <PrepSection label="작성 모드">
          <RadioList
            name="archiveWriteMode"
            value={p.archiveWriteMode}
            onChange={(id) =>
              p.setArchiveWriteMode(id as "perStudent" | "sameText")
            }
            options={[
              { id: "perStudent", label: "학생별 차별 작성" },
              { id: "sameText", label: "선택 학생 동일 문구" },
            ]}
          />
        </PrepSection>
        <PrepSection label="작성할 항목">
          {p.archiveInputFields.length === 0 ? (
            <p className={style.prepText}>
              텍스트(input) 기록 항목이 없습니다.
            </p>
          ) : (
            <div className={style.refList}>
              {p.archiveInputFields.map((field) => (
                <label key={field.label} className={style.refRow}>
                  <input
                    type="checkbox"
                    checked={p.archiveTargetLabels.includes(field.label)}
                    onChange={() =>
                      p.toggleLabel(
                        field.label,
                        p.archiveTargetLabels,
                        p.setArchiveTargetLabels
                      )
                    }
                  />
                  <span>{field.label}</span>
                </label>
              ))}
            </div>
          )}
        </PrepSection>
        <PrepSection
          label="참고할 항목"
          hint="이미 작성된 기록 내용을 참고해 초안을 만듭니다. 문장을 그대로 복사하지 않고 종합·재작성합니다. 작성 대상 항목의 기존 내용도 여기에 포함하면 이어서 다듬을 수 있습니다."
        >
          {p.archiveReferenceFields.length === 0 ? (
            <p className={style.prepText}>참고할 항목이 없습니다.</p>
          ) : (
            <div className={style.refList}>
              {p.archiveReferenceFields.map((field) => {
                const isTarget = p.archiveTargetLabels.includes(field.label);
                return (
                  <label key={field.label} className={style.refRow}>
                    <input
                      type="checkbox"
                      checked={p.archiveContextLabels.includes(field.label)}
                      onChange={() =>
                        p.toggleLabel(
                          field.label,
                          p.archiveContextLabels,
                          p.setArchiveContextLabels
                        )
                      }
                    />
                    <span>
                      {field.label}
                      {field.type !== "input" ? ` (${field.type})` : ""}
                      {isTarget ? " (작성 대상·기존 내용)" : ""}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </PrepSection>
        <PrepSection
          label="작성 지침"
          hint="학교 AI 라이브러리의 지침 중 이번 작성에 쓸 항목을 고릅니다. 기록 양식마다 다른 지침을 골라 쓸 수 있습니다."
        >
          <GuidelinePicker
            items={p.archiveGuidelineItems}
            selectedIds={p.archiveSelectedGuidelineIds}
            expandedId={p.expandedGuidelineId}
            loading={p.skillSettingsLoading}
            emptyText="선택 가능한 지침이 없습니다. Alter 라이브러리에서 「기록」 지침을 추가해 주세요. 기본 기준으로 작성합니다."
            onToggleChecked={(id) =>
              p.toggleLabel(
                id,
                p.archiveSelectedGuidelineIds,
                p.setArchiveSelectedGuidelineIds
              )
            }
            onToggleExpanded={(key) =>
              p.setExpandedGuidelineId((cur) => (cur === key ? null : key))
            }
          />
        </PrepSection>
        <PrepSection
          label="범위"
          hint="「빈 칸만 채우기」가 켜져 있으면 이미 내용이 있는 칸은 건너뜁니다. 표가 비어 보여도 저장된 값이 있으면 제외될 수 있습니다."
        >
          <div className={style.refList}>
            <label className={style.refRow}>
              <input
                type="radio"
                name="archiveScope"
                checked={p.archiveScope === "empty"}
                onChange={() => {
                  p.setArchiveScope("empty");
                  p.setArchiveFillEmptyOnly(true);
                }}
              />
              <span>미작성 학생만</span>
            </label>
            <label className={style.refRow}>
              <input
                type="radio"
                name="archiveScope"
                checked={p.archiveScope === "all"}
                onChange={() => p.setArchiveScope("all")}
              />
              <span>전체 학생 목록</span>
            </label>
            <label className={style.refRow}>
              <input
                type="checkbox"
                checked={p.archiveFillEmptyOnly}
                onChange={(e) => p.setArchiveFillEmptyOnly(e.target.checked)}
              />
              <span>빈 칸만 채우기</span>
            </label>
          </div>
        </PrepSection>
        <PrepSection
          label="학생 선택"
          hint={`한 번에 최대 ${EVAL_DRAFT_MAX}명까지 선택해 초안을 만들 수 있습니다.`}
        >
          <StudentPicker
            candidates={p.archiveCandidateStudents}
            selectedIds={p.archiveSelectedIds}
            scopeEmpty={p.archiveScope === "empty"}
            onToggle={p.toggleArchiveStudentId}
            onSelectDefault={p.selectDefaultArchiveStudentBatch}
            onSelectAll={p.selectAllArchiveCandidateStudents}
            onClear={p.clearArchiveStudents}
          />
        </PrepSection>
        <PrepHintRow text="지침·항목·학생을 고른 뒤 「초안 작성」을 누르세요. 미리보기 반영 후 「변경 사항 저장」으로 DB에 저장합니다." />
      </>
    );
  }

  return null;
};

export default SkillPrepDock;
