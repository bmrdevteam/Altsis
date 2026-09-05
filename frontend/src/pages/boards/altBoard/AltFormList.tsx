import { useEffect, useMemo, useRef, useState } from "react";
import style from "./altBoard.module.scss";
import bStyle from "../boards.module.scss";
import { TAltForm } from "types/altForm";
import { TAltBoardRole, TBoard } from "types/board";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { useAuth } from "contexts/authContext";
import { objectDownloadAsJson } from "functions/functions";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Svg from "assets/svg/Svg";
import CombinationGenerator from "./CombinationGenerator";
import PendingApprovalsPanel from "./PendingApprovalsPanel";
import ActivityListFilterBar, {
  TActivityListSort,
  TActivityViewCounts,
  TActivityViewFilter,
} from "./ActivityListFilterBar";
import { sortFormsForList } from "./activityListSort";
import {
  getActivityBadgeLabel,
  getActivityPeriodKind,
  getActivityStatusVisual,
  getRequiredResponseCount,
  TActivityBadgeKind,
  TActivityLeadTone,
} from "./activityStatusVisual";
import {
  getDeadlineRemainingLabel,
  isDeadlineUrgent,
} from "./activityDeadline";
import { shouldShowUnsubmittedTodoForm, getEffectiveTodoCloseAtLocal } from "./weekdaySchedule";
import {
  getSchoolTodosCached,
  invalidateSchoolTodosCache,
  schoolTodosCacheKey,
  TSchoolTodoItem,
} from "../schoolTodosCache";
import { isFormRespondent } from "./formAccess";
import { hasLocalComposeDraft } from "./formResponseLocalDraft";

const formMatchesKeyword = (form: TAltForm, keyword: string) => {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return true;
  return (
    (form.title || "").toLowerCase().includes(kw) ||
    (form.description || "").toLowerCase().includes(kw)
  );
};

type Props = {
  board: TBoard;
  forms: TAltForm[];
  isLoading: boolean;
  /** null이면 Alt Board 멤버가 아님 — 목록·통계 비표시 */
  myRole: TAltBoardRole | null;
  canManage: boolean;
  canDeleteAnyRow?: boolean;
  /** 양식 빌더 열기 가능 여부 */
  canModifyForm: (form: TAltForm) => boolean;
  onFormClick: (form: TAltForm) => void;
  onRespondForm: (formId: string) => void;
  onViewDrafts?: (formId: string) => void;
  onViewMyResponses?: (formId: string) => void;
  onOpenSheet?: (formId: string) => void;
  onCreateForm: () => void;
  onRefresh: () => void;
  onCopyFormLink?: (formId: string) => void;
  /** 알림 딥링크: 승인 대기 행 자동 열기 */
  openApprovalRowId?: string | null;
  /** 승인 대기 건수 변경 시 탭 뱃지 동기화 */
  onPendingApprovalCountChange?: (count: number) => void;
  /** 채점 대기(양식 집계) 건수 변경 시 탭 뱃지 동기화 */
  onGradeTodoCountChange?: (count: number) => void;
};

const formMatchesStatus = (
  form: TAltForm,
  statusFilter: Exclude<TActivityViewFilter, "" | "todo">
) => {
  if (statusFilter === "draft") return !!form.isDraft;
  if (statusFilter === "direct")
    return !form.isDraft && !!form.settings.directInputMode;
  if (form.isDraft) return false;
  if (form.settings.directInputMode) return false;
  const period = getActivityPeriodKind(form);
  if (statusFilter === "closed") return period === "closed";
  if (statusFilter === "scheduled") return period === "scheduled";
  if (statusFilter === "submitted")
    return period === "open" && !!form.mySubmitted;
  if (statusFilter === "open")
    return period === "open" && !form.mySubmitted;
  return true;
};

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const ACTIVITY_LIST_SORT_KEY = "activityListSort";
const VALID_ACTIVITY_LIST_SORTS: TActivityListSort[] = [
  "default",
  "title",
  "updatedAt",
  "createdAt",
  "closeAt",
  "openAt",
];

const readStoredActivityListSort = (): TActivityListSort => {
  try {
    const stored = localStorage.getItem(
      ACTIVITY_LIST_SORT_KEY
    ) as TActivityListSort;
    return VALID_ACTIVITY_LIST_SORTS.includes(stored) ? stored : "default";
  } catch {
    return "default";
  }
};

const LEAD_TONE_CLASS: Record<TActivityLeadTone, string> = {
  draft: style.formCardLeadIconDraft,
  pending: style.formCardLeadIconPending,
  submitted: style.formCardLeadIconSubmitted,
  closed: style.formCardLeadIconClosed,
  scheduled: style.formCardLeadIconScheduled,
  info: style.formCardLeadIconInfo,
  warning: style.formCardLeadIconWarning,
};

const BADGE_KIND_CLASS: Record<TActivityBadgeKind, string> = {
  draft: style.badgeDraft,
  direct: style.badgeDirect,
  closed: style.badgeClosed,
  scheduled: style.badgeScheduled,
  submitted: style.badgeSubmitted,
  pending: style.badgePending,
  optional: style.badgeOptional,
};

const AltFormList = ({
  board,
  forms,
  isLoading,
  myRole,
  canManage,
  canDeleteAnyRow = false,
  canModifyForm,
  onFormClick,
  onRespondForm,
  onViewDrafts,
  onViewMyResponses,
  onOpenSheet,
  onCreateForm,
  onRefresh,
  onCopyFormLink,
  openApprovalRowId,
  onPendingApprovalCountChange,
  onGradeTodoCountChange,
}: Props) => {
  const { AltFormAPI, AltFormFavoriteAPI, AltSheetRowAPI } = useAPIv2();
  const { currentUser, currentSchool, currentRegistration, currentSeason } =
    useAuth();

  const [comboForm, setComboForm] = useState<TAltForm | null>(null);
  const [deleteForm, setDeleteForm] = useState<TAltForm | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [approvalsSettled, setApprovalsSettled] = useState(false);
  const [activityKeyword, setActivityKeyword] = useState("");
  const [viewFilter, setViewFilter] = useState<TActivityViewFilter>("");
  const [activityListSort, setActivityListSort] = useState<TActivityListSort>(
    readStoredActivityListSort
  );
  const [pinOverrides, setPinOverrides] = useState<Record<string, boolean>>(
    {}
  );
  const [approvalTodoCounts, setApprovalTodoCounts] = useState({
    approve: 0,
    outgoing: 0,
  });
  const [gradeTodos, setGradeTodos] = useState<TSchoolTodoItem[]>([]);
  const importRef = useRef<HTMLInputElement>(null);

  const currentSeasonId =
    currentRegistration?.season || currentSeason?._id || undefined;

  useEffect(() => {
    setApprovalsSettled(false);
    setPinOverrides({});
  }, [board._id]);

  // 채점 대기(학교 할 일과 동일 소스) — 이 보드분만 표시
  useEffect(() => {
    if (!currentSchool?._id) {
      setGradeTodos([]);
      onGradeTodoCountChange?.(0);
      return;
    }
    let cancelled = false;
    const key = schoolTodosCacheKey(currentSchool._id, currentSeasonId);
    // 채점 확정 직후 등 캐시가 남아 있으면 빠질 수 있어 보드 진입 시 갱신
    invalidateSchoolTodosCache(key);
    getSchoolTodosCached(key, () =>
      AltSheetRowAPI.RAltSheetRowSchoolTodos({
        query: {
          school: currentSchool._id,
          ...(currentSeasonId ? { season: currentSeasonId } : {}),
        },
      })
    )
      .then(({ items }) => {
        if (cancelled) return;
        const grades = (items || []).filter(
          (item) =>
            item.kind === "grade" && String(item.boardId) === String(board._id)
        );
        setGradeTodos(grades);
        onGradeTodoCountChange?.(grades.length);
      })
      .catch(() => {
        if (!cancelled) {
          setGradeTodos([]);
          onGradeTodoCountChange?.(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [board._id, currentSchool?._id, currentSeasonId]);

  const schoolRole =
    currentUser?.auth === "manager"
      ? "manager"
      : currentRegistration?.role || null;

  const listedForms = useMemo(
    () =>
      forms.map((f) => ({
        ...f,
        myRespondent: isFormRespondent(f, currentUser, myRole, schoolRole),
      })),
    [forms, currentUser, myRole, schoolRole]
  );

  /** 제출형 활동 (통계·정렬용) */
  const submitForms = useMemo(() => {
    if (!myRole) return [];
    return listedForms.filter((f) => !f.settings.directInputMode);
  }, [listedForms, myRole]);

  /** 할 일: 필수·진행 중·미제출 (요일마다면 회차 창·당일 미제출) */
  const todoUnsubmitted = useMemo(() => {
    const now = new Date();
    return listedForms.filter((f) => shouldShowUnsubmittedTodoForm(f, now));
  }, [listedForms]);

  const todoUnsubmittedIds = useMemo(
    () => new Set(todoUnsubmitted.map((f) => f._id)),
    [todoUnsubmitted]
  );

  /** 활동 목록: 할 일(미제출) 제외. 제출 권한만 있으면 마감도 제외(열람 가능한 기록은 유지) */
  const activityForms = useMemo(() => {
    if (!myRole) return [];
    return (canManage ? listedForms : submitForms).filter((f) => {
      if (todoUnsubmittedIds.has(f._id)) return false;
      if (!canManage && getActivityPeriodKind(f) === "closed") {
        const canViewSheet =
          !!f.settings.shareResponses || !!f.settings.showOwnResponse;
        if (!canViewSheet) return false;
      }
      return true;
    });
  }, [listedForms, myRole, canManage, submitForms, todoUnsubmittedIds]);

  const keywordTodoUnsubmitted = useMemo(
    () =>
      todoUnsubmitted.filter((f) => formMatchesKeyword(f, activityKeyword)),
    [todoUnsubmitted, activityKeyword]
  );

  const keywordGradeTodos = useMemo(() => {
    const kw = activityKeyword.trim().toLowerCase();
    if (!kw) return gradeTodos;
    return gradeTodos.filter((item) =>
      (item.formTitle || "").toLowerCase().includes(kw)
    );
  }, [gradeTodos, activityKeyword]);

  const keywordActivityForms = useMemo(
    () =>
      activityForms.filter((f) => formMatchesKeyword(f, activityKeyword)),
    [activityForms, activityKeyword]
  );

  const showTodos = viewFilter === "" || viewFilter === "todo";
  const showActivity = viewFilter === "" || viewFilter !== "todo";

  const filteredTodoUnsubmitted = useMemo(() => {
    if (!showTodos) return [];
    return keywordTodoUnsubmitted;
  }, [showTodos, keywordTodoUnsubmitted]);

  const filteredGradeTodos = useMemo(() => {
    if (!showTodos) return [];
    return keywordGradeTodos;
  }, [showTodos, keywordGradeTodos]);

  const filteredActivityForms = useMemo(() => {
    if (!showActivity) return [];
    if (!viewFilter) return keywordActivityForms;
    return keywordActivityForms.filter((f) =>
      formMatchesStatus(f, viewFilter)
    );
  }, [showActivity, viewFilter, keywordActivityForms]);

  const pinnedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const f of forms) {
      const overridden = pinOverrides[f._id];
      if (overridden !== undefined ? overridden : !!f.isFavorited) {
        ids.add(f._id);
      }
    }
    return ids;
  }, [forms, pinOverrides]);

  const sortedActivityForms = useMemo(
    () =>
      sortFormsForList(filteredActivityForms, activityListSort, pinnedIds),
    [filteredActivityForms, activityListSort, pinnedIds]
  );

  const pinnedActivityForms = useMemo(
    () => sortedActivityForms.filter((f) => pinnedIds.has(f._id)),
    [sortedActivityForms, pinnedIds]
  );
  const unpinnedActivityForms = useMemo(
    () => sortedActivityForms.filter((f) => !pinnedIds.has(f._id)),
    [sortedActivityForms, pinnedIds]
  );

  const handleActivityListSortChange = (value: TActivityListSort) => {
    setActivityListSort(value);
    try {
      localStorage.setItem(ACTIVITY_LIST_SORT_KEY, value);
    } catch {
      // ignore quota / private mode
    }
  };

  const viewCounts: TActivityViewCounts = useMemo(() => {
    const statusKeys = [
      "open",
      "submitted",
      "closed",
      "scheduled",
      "draft",
      "direct",
    ] as const;
    const counts = {
      todo:
        approvalTodoCounts.approve +
        approvalTodoCounts.outgoing +
        keywordGradeTodos.length +
        keywordTodoUnsubmitted.length,
      open: 0,
      submitted: 0,
      closed: 0,
      scheduled: 0,
      draft: 0,
      direct: 0,
    };
    for (const f of keywordActivityForms) {
      for (const key of statusKeys) {
        if (formMatchesStatus(f, key)) counts[key] += 1;
      }
    }
    return counts;
  }, [
    approvalTodoCounts,
    keywordGradeTodos.length,
    keywordTodoUnsubmitted.length,
    keywordActivityForms,
  ]);

  const hasActivityFilters = !!activityKeyword.trim() || !!viewFilter;

  const clearActivityFilters = () => {
    setActivityKeyword("");
    setViewFilter("");
  };

  const submitStats = useMemo(() => {
    let done = 0;
    let scheduled = 0;
    let closed = 0;
    for (const f of submitForms) {
      if (f.isDraft) continue;
      const period = getActivityPeriodKind(f);
      if (period === "closed") {
        if (canManage) closed += 1;
      } else if (period === "scheduled") scheduled += 1;
      else if (f.settings?.requiredMode !== true) {
        if (f.mySubmitted) done += 1;
      } else if (f.mySubmitted) done += 1;
      // 미제출(필수·진행 중)은 할 일 섹션에만
    }
    return {
      done,
      scheduled,
      closed,
    };
  }, [submitForms, canManage]);

  const manageStats = useMemo(() => {
    if (!canManage) return null;
    let responseSum = 0;
    for (const f of forms) {
      responseSum += f.responseCount ?? 0;
    }
    return {
      total: forms.length,
      responseSum,
    };
  }, [canManage, forms]);

  if (isLoading) return null;

  if (!myRole) {
    return (
      <div className={style.emptyState}>
        이 보드의 활동에 접근할 권한이 없습니다.
      </div>
    );
  }

  const handleExport = async (formId: string) => {
    try {
      const { formData } = await AltFormAPI.ExportAltForm({
        params: { _id: formId },
      });
      objectDownloadAsJson(formData);
    } catch (err) {
      ALERT_ERROR(err);
    }
    setActionMenu(null);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const formData = JSON.parse(text);
      await AltFormAPI.ImportAltForm({
        data: {
          board: board._id,
          formData,
          ...(currentSeasonId ? { season: currentSeasonId } : {}),
        },
      });
      onRefresh();
    } catch (err) {
      ALERT_ERROR(err);
    }
    if (importRef.current) importRef.current.value = "";
  };

  const handleDuplicate = async (formId: string) => {
    try {
      await AltFormAPI.DuplicateAltForm({
        params: { _id: formId },
        ...(currentSeasonId ? { data: { season: currentSeasonId } } : {}),
      });
      onRefresh();
    } catch (err) {
      ALERT_ERROR(err);
    }
    setActionMenu(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteForm) return;
    setIsDeleting(true);
    try {
      await AltFormAPI.DAltForm({ params: { _id: deleteForm._id } });
      setDeleteForm(null);
      onRefresh();
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePin = async (form: TAltForm) => {
    const schoolId = board.school || currentSchool?._id;
    if (!schoolId) return;
    const next = !pinnedIds.has(form._id);
    try {
      if (next) {
        await AltFormFavoriteAPI.CAltFormFavorite({
          data: {
            form: form._id,
            board: board._id,
            school: schoolId,
          },
        });
      } else {
        await AltFormFavoriteAPI.DAltFormFavoriteByForm({
          params: { formId: form._id },
        });
      }
      setPinOverrides((prev) => ({ ...prev, [form._id]: next }));
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const hasPreRegFields = (form: TAltForm) =>
    form.fields.filter(
      (f) =>
        f.duplicateCheck?.enabled &&
        f.duplicateCheck.mode === "preRegistration"
    ).length >= 1;

  const renderSubmitBadge = (form: TAltForm) => {
    const label = getActivityBadgeLabel(form);
    if (!label) return null;
    const { badgeKind } = getActivityStatusVisual(form);
    return (
      <span className={`${style.formCardBadge} ${BADGE_KIND_CLASS[badgeKind]}`}>
        {label}
      </span>
    );
  };

  const renderActivityCard = (form: TAltForm) => {
    const effectiveCloseAt = getEffectiveTodoCloseAtLocal(form);
    const deadlineLabel = getDeadlineRemainingLabel(effectiveCloseAt);
    const period = getActivityPeriodKind(form);
    const isDirect = !!form.settings.directInputMode;
    const canEditForm = canModifyForm(form);
    const showRespond =
      !form.isDraft && !isDirect && form.myRespondent !== false;
    const hasDrafts =
      (form.myDraftCount ?? 0) > 0 ||
      !!(currentUser?._id && hasLocalComposeDraft(currentUser._id, form._id));
    const hasSubmitted =
      !!form.mySubmitted && form.settings.showOwnResponse !== false;
    const showMyResponses =
      !isDirect && hasSubmitted && !!onViewMyResponses;
    const showSheet = !!onOpenSheet;
    const showManageMenu = canManage;

    const statusVisual = getActivityStatusVisual(form);
    const pinned = pinnedIds.has(form._id);

    return (
      <div
        key={form._id}
        className={`${style.formCard} ${
          actionMenu === form._id ? style.formCardMenuOpen : ""
        } ${pinned ? bStyle.boardFormCardPinned : ""}`}
      >
        <div className={style.formCardMain}>
          <div
            className={`${style.formCardLeadIcon} ${
              LEAD_TONE_CLASS[statusVisual.leadTone]
            }`}
            aria-hidden
          >
            <Svg type={statusVisual.icon} width="20px" height="20px" />
          </div>
          <div className={style.formCardLeft}>
            <div className={style.formCardTitle}>{form.title}</div>
            <div className={style.formCardMeta}>
              {form.settings.quizMode && (
                <span
                  className={`${style.formCardBadge} ${style.formCardTypeQuiz}`}
                >
                  퀴즈
                </span>
              )}
              {form.settings.assessmentMode && (
                <span
                  className={`${style.formCardBadge} ${style.formCardTypeAssessment}`}
                >
                  평가
                </span>
              )}
              {renderSubmitBadge(form)}
              {hasDrafts && period === "open" && !isDirect && (
                onViewDrafts ? (
                  <button
                    type="button"
                    className={`${style.formCardHint} ${style.formCardHintBtn}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDrafts(form._id);
                    }}
                  >
                    작성 중
                  </button>
                ) : (
                  <span className={style.formCardHint}>작성 중</span>
                )
              )}
              {form.settings.openAt && period === "scheduled" && (
                <span>시작: {formatDateTime(form.settings.openAt)}</span>
              )}
              {deadlineLabel && (
                <span
                  className={
                    isDeadlineUrgent(effectiveCloseAt)
                      ? style.deadlineUrgent
                      : undefined
                  }
                >
                  {deadlineLabel}
                </span>
              )}
              {form.mySubmitted &&
                form.settings.allowMultipleResponses &&
                getRequiredResponseCount(form) == null &&
                period === "open" &&
                !isDirect && (
                  <span className={style.formCardHint}>추가 제출 가능</span>
                )}
            </div>
          </div>
        </div>
        <div className={style.formCardRight} style={{ position: "relative" }}>
          <button
            type="button"
            className={`${style.formCardIconBtn} ${
              pinned ? bStyle.pinIconActive : ""
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePin(form);
            }}
            title={pinned ? "고정 해제" : "상단에 고정"}
            aria-label={pinned ? "고정 해제" : "상단에 고정"}
            aria-pressed={pinned}
          >
            <Svg type="pin" width="16px" height="16px" />
          </button>
          {showRespond && (
            <button
              type="button"
              className={style.formCardIconBtn}
              title="응답 작성"
              onClick={() => onRespondForm(form._id)}
            >
              <Svg type="write" width="20px" height="20px" />
            </button>
          )}
          {showMyResponses && (
            <button
              type="button"
              className={style.formCardIconBtn}
              title="내 응답 보기"
              onClick={() => onViewMyResponses?.(form._id)}
            >
              <Svg type="menuBook" width="20px" height="20px" />
            </button>
          )}
          {canEditForm && (
            <button
              type="button"
              className={style.formCardIconBtn}
              title="양식 수정"
              onClick={() => onFormClick(form)}
            >
              <Svg type="settings" width="20px" height="20px" />
            </button>
          )}
          {showSheet && (
            <button
              type="button"
              className={style.formCardIconBtn}
              title="기록 보기"
              aria-label={
                (form.unreadResponseCount ?? 0) > 0
                  ? `기록 보기, 미확인 응답 ${form.unreadResponseCount}건`
                  : "기록 보기"
              }
              onClick={() => onOpenSheet!(form._id)}
            >
              <Svg type="table" width="20px" height="20px" />
              {canManage && (form.unreadResponseCount ?? 0) > 0 && (
                <span className={style.formCardIconUnreadBadge}>
                  {(form.unreadResponseCount ?? 0) > 99
                    ? "99+"
                    : form.unreadResponseCount}
                </span>
              )}
            </button>
          )}
          {showManageMenu && (
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className={style.formCardIconBtn}
                title="더보기"
                onClick={() => {
                  setActionMenu(actionMenu === form._id ? null : form._id);
                }}
              >
                <Svg type="verticalDots" width="20px" height="20px" />
              </button>
              {actionMenu === form._id && (
                <div className={style.formActionMenu}>
                  {onCopyFormLink && (
                    <div
                      className={style.formActionItem}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopyFormLink(form._id);
                        setActionMenu(null);
                      }}
                    >
                      <Svg type="link" width="16px" height="16px" />
                      링크 복사
                    </div>
                  )}
                  <div
                    className={style.formActionItem}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport(form._id);
                    }}
                  >
                    <Svg type="download" width="16px" height="16px" />
                    다운로드
                  </div>
                  <div
                    className={style.formActionItem}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicate(form._id);
                    }}
                  >
                    <Svg type="copy" width="16px" height="16px" />
                    복제
                  </div>
                  {hasPreRegFields(form) && (
                    <div
                      className={style.formActionItem}
                      onClick={(e) => {
                        e.stopPropagation();
                        setComboForm(form);
                        setActionMenu(null);
                      }}
                    >
                      <Svg type="grid" width="16px" height="16px" />
                      조합 생성
                    </div>
                  )}
                  {form.isDraft ? (
                    <>
                      <div
                        className={style.formActionItem}
                        onClick={async (e) => {
                          e.stopPropagation();
                          setActionMenu(null);
                          try {
                            await AltFormAPI.UAltForm({
                              params: { _id: form._id },
                              data: { isDraft: false },
                            });
                            onRefresh();
                          } catch (err) {
                            ALERT_ERROR(err);
                          }
                        }}
                      >
                        <Svg type="unarchive" width="16px" height="16px" />
                        공개
                      </div>
                      <div
                        className={`${style.formActionItem} ${style.formActionItemDanger}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteForm(form);
                          setActionMenu(null);
                        }}
                      >
                        <Svg type="trash" width="16px" height="16px" />
                        삭제
                      </div>
                    </>
                  ) : (
                    <div
                      className={style.formActionItem}
                      onClick={async (e) => {
                        e.stopPropagation();
                        setActionMenu(null);
                        try {
                          await AltFormAPI.UAltForm({
                            params: { _id: form._id },
                            data: { isDraft: true },
                          });
                          onRefresh();
                        } catch (err) {
                          ALERT_ERROR(err);
                        }
                      }}
                    >
                      <Svg type="archive" width="16px" height="16px" />
                      비공개로
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={style.formList}>
      <ActivityListFilterBar
        keyword={activityKeyword}
        onKeywordChange={setActivityKeyword}
        sortBy={activityListSort}
        onSortByChange={handleActivityListSortChange}
        viewFilter={viewFilter}
        onViewFilterChange={setViewFilter}
        counts={viewCounts}
        onClear={clearActivityFilters}
      />
      <PendingApprovalsPanel
        boardId={board._id}
        canDeleteAnyRow={canDeleteAnyRow}
        openRowId={openApprovalRowId}
        onSettled={() => setApprovalsSettled(true)}
        onCountChange={onPendingApprovalCountChange}
        keyword={activityKeyword}
        hidden={!showTodos}
        onVisibleTodoCounts={setApprovalTodoCounts}
        gradeCount={filteredGradeTodos.length}
        gradeCards={filteredGradeTodos.map((item) => {
          const pending =
            item.pendingCount ??
            (item.progress ? Number(item.progress) : 0);
          return (
            <div
              key={`grade_${item.formId}`}
              className={`${style.formCard} ${style.formCardInteractive}`}
              title="채점하기"
              onClick={() => onOpenSheet?.(item.formId)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpenSheet?.(item.formId);
                }
              }}
            >
              <div className={style.formCardMain}>
                <div
                  className={`${style.formCardLeadIcon} ${style.formCardLeadIconWarning}`}
                  aria-hidden
                >
                  <Svg type="edit" width="20px" height="20px" />
                </div>
                <div className={style.formCardLeft}>
                  <div className={style.formCardTitle}>{item.formTitle}</div>
                  <div className={style.formCardMeta}>
                    <span
                      className={`${style.formCardBadge} ${style.formCardTypeAssessment}`}
                    >
                      평가
                    </span>
                    <span
                      className={`${style.formCardBadge} ${style.badgePending}`}
                    >
                      채점 대기{pending > 0 ? ` ${pending}건` : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        unsubmittedCount={filteredTodoUnsubmitted.length}
        unsubmittedCards={filteredTodoUnsubmitted.map(renderActivityCard)}
        onOpenHandled={() => {
          // URL에서 approval 파라미터만 제거 (탭·해시 유지)
          if (typeof window === "undefined") return;
          const url = new URL(window.location.href);
          if (!url.searchParams.has("approval")) return;
          url.searchParams.delete("approval");
          window.history.replaceState(
            null,
            "",
            url.pathname + url.search + url.hash
          );
        }}
      />
      {!approvalsSettled ? (
        <div className={style.emptyState}>불러오는 중...</div>
      ) : showActivity ? (
      <section className={style.formSectionPanel}>
        <div className={style.formSectionHeaderStatic}>
          <div className={style.formSectionHeaderMain}>
            <h3 className={style.formSectionTitle}>활동</h3>
            <span className={style.formSectionCount}>
              {filteredActivityForms.length}
            </span>
          </div>
          <div className={style.formSectionStats}>
            <span>
              제출완료 <strong>{submitStats.done}</strong>
            </span>
            {submitStats.scheduled > 0 && (
              <span>
                예정 <strong>{submitStats.scheduled}</strong>
              </span>
            )}
            {canManage && submitStats.closed > 0 && (
              <span>
                마감 <strong>{submitStats.closed}</strong>
              </span>
            )}
            {manageStats && (
              <span>
                총 응답 <strong>{manageStats.responseSum}</strong>
              </span>
            )}
          </div>
          {canManage && (
            <div className={style.formListToolbar}>
              <button
                type="button"
                className={style.formCardIconBtn}
                title="새 양식 만들기"
                onClick={onCreateForm}
              >
                <Svg type="plus" width="20px" height="20px" />
              </button>
              <button
                type="button"
                className={style.formCardIconBtn}
                title="JSON 가져오기"
                onClick={() => importRef.current?.click()}
              >
                <Svg type="upload" width="20px" height="20px" />
              </button>
              <input
                ref={importRef}
                type="file"
                accept=".json"
                style={{ display: "none" }}
                onChange={handleImport}
              />
            </div>
          )}
        </div>
        <div className={style.formSectionBody}>
          {filteredActivityForms.length === 0 ? (
            <div className={style.emptyState}>
              {hasActivityFilters
                ? "조건에 맞는 활동이 없습니다."
                : "활동이 없습니다."}
            </div>
          ) : (
            <div className={style.formCardList}>
              {pinnedActivityForms.length > 0 && (
                <div className={bStyle.boardListSection}>
                  <div
                    className={bStyle.boardListSectionHeader}
                    role="heading"
                    aria-level={4}
                  >
                    <span
                      className={bStyle.boardListSectionHeaderPin}
                      aria-hidden
                    >
                      <Svg type="pin" width="12px" height="12px" />
                    </span>
                    고정 · {pinnedActivityForms.length}
                  </div>
                  {pinnedActivityForms.map(renderActivityCard)}
                </div>
              )}
              {unpinnedActivityForms.length > 0 && (
                <div className={bStyle.boardListSection}>
                  {pinnedActivityForms.length > 0 && (
                    <div
                      className={bStyle.boardListSectionHeader}
                      role="heading"
                      aria-level={4}
                    >
                      전체 · {unpinnedActivityForms.length}
                    </div>
                  )}
                  {unpinnedActivityForms.map(renderActivityCard)}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
      ) : null}

      {comboForm && (
        <CombinationGenerator
          form={comboForm}
          onClose={() => setComboForm(null)}
          onGenerated={onRefresh}
        />
      )}

      {deleteForm && (
        <Popup
          title="양식 삭제"
          setState={(v: boolean) => {
            if (!v && !isDeleting) setDeleteForm(null);
          }}
          closeBtn={!isDeleting}
          style={{ maxWidth: "420px", width: "100%" }}
          footer={
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
              }}
            >
              <Button
                type="ghost"
                onClick={() => setDeleteForm(null)}
                disabled={isDeleting}
              >
                취소
              </Button>
              <Button
                type="ghost"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                style={{ color: "var(--status-error)" }}
              >
                {isDeleting ? "삭제 중..." : "삭제"}
              </Button>
            </div>
          }
        >
          <div style={{ padding: "8px 4px", lineHeight: 1.6 }}>
            <div
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                borderRadius: 8,
                background: "var(--status-error-bg)",
                color: "var(--status-error)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              경고: 삭제하면 복구할 수 없습니다.
            </div>
            <strong>{deleteForm.title}</strong> 양식을 정말 삭제하시겠습니까?
            <br />
            <span style={{ color: "var(--text-color-2)", fontSize: 13 }}>
              연결된 응답·기록 데이터도 함께 삭제됩니다. 이 작업은 되돌릴 수
              없습니다.
            </span>
          </div>
        </Popup>
      )}
    </div>
  );
};

export default AltFormList;
