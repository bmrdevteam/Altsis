import style from "./altBoard/altBoard.module.scss";
import Svg from "assets/svg/Svg";
import Button from "components/button/Button";

export type TSchoolTodoItem = {
  kind: "approve" | "grade" | "outgoing" | "unsubmitted";
  boardId: string;
  boardTitle: string;
  formId: string;
  formTitle: string;
  rowId?: string;
  fieldId?: string;
  fieldLabel?: string;
  stepLabel?: string;
  respondentName?: string;
  respondentId?: string;
  currentApproverName?: string;
  currentApproverId?: string;
  currentStep?: number;
  totalSteps?: number;
  progress?: string;
  /** grade 전용 — 미확정 채점 건수 */
  pendingCount?: number;
  myResponseCount?: number;
  requiredResponseCount?: number | null;
  submittedAt?: string;
  /** unsubmitted 전용 — 보드 내부 활동 카드와 맞춤 */
  quizMode?: boolean;
  assessmentMode?: boolean;
  closeAt?: string | null;
};

type Props = {
  items: TSchoolTodoItem[];
  loading?: boolean;
  onOpenTodo: (item: TSchoolTodoItem) => void;
  onGoToBoards: () => void;
};

const formatSubmittedAt = (iso?: string) => {
  if (!iso) return null;
  return new Date(iso).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

/** AltFormList getDeadlineHint 와 동일 */
const getDeadlineHint = (closeAt?: string | null): string | null => {
  if (!closeAt) return null;
  const close = new Date(closeAt);
  const now = new Date();
  if (close < now) return null;

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfClose = new Date(
    close.getFullYear(),
    close.getMonth(),
    close.getDate()
  );
  const diffDays = Math.round(
    (startOfClose.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000)
  );
  if (diffDays === 0) return "오늘 마감";
  if (diffDays > 0 && diffDays <= 7) return `D-${diffDays}`;
  return null;
};

const unsubmittedBadgeLabel = (item: TSchoolTodoItem) => {
  if (
    item.requiredResponseCount != null &&
    item.requiredResponseCount >= 1
  ) {
    const mine = item.myResponseCount ?? 0;
    return `필수 ${mine}/${item.requiredResponseCount}`;
  }
  if (item.progress) return `필수 ${item.progress}`;
  return "미제출";
};

const BoardsActivityTodos = ({
  items,
  loading,
  onOpenTodo,
  onGoToBoards,
}: Props) => {
  if (loading && items.length === 0) {
    return (
      <div className={style.emptyState} style={{ paddingTop: 40 }}>
        할 일을 불러오는 중…
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <div
        className={style.emptyState}
        style={{
          paddingTop: 48,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div>할 일이 없습니다.</div>
        <Button type="ghost" onClick={onGoToBoards}>
          보드 목록 보기
        </Button>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 20 }}>
      <section className={style.formSectionPanel}>
        <div className={style.formSectionHeaderStatic}>
          <div className={style.formSectionHeaderMain}>
            <h3 className={style.formSectionTitle}>할 일</h3>
            <span className={style.formSectionCount}>{items.length}</span>
          </div>
        </div>
        <div className={style.formSectionBody}>
          <div className={style.formCardList}>
            {items.map((item) => {
              const key = `${item.kind}_${item.boardId}_${item.formId}_${
                item.rowId || ""
              }_${item.fieldId || ""}`;
              const submittedAt = formatSubmittedAt(item.submittedAt);

              if (item.kind === "approve") {
                return (
                  <div
                    key={key}
                    className={style.formCard}
                    title="결재 검토하기"
                    onClick={() => onOpenTodo(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpenTodo(item);
                      }
                    }}
                  >
                    <div className={style.formCardMain}>
                      <div
                        className={`${style.formCardLeadIcon} ${style.formCardLeadIconWarning}`}
                        aria-hidden
                      >
                        <Svg type="list_check" width="20px" height="20px" />
                      </div>
                      <div className={style.formCardLeft}>
                        <div className={style.formCardTitle}>
                          {item.formTitle}
                        </div>
                        <div className={style.formCardMeta}>
                          <span
                            className={`${style.formCardBadge} ${style.badgeApproval}`}
                          >
                            {item.stepLabel || item.fieldLabel || "승인"}
                          </span>
                          <span>{item.boardTitle}</span>
                          {item.respondentName && (
                            <span>
                              {item.respondentName}
                              {item.respondentId
                                ? `(${item.respondentId})`
                                : ""}
                            </span>
                          )}
                          {submittedAt && <span>{submittedAt}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              if (item.kind === "grade") {
                const pending =
                  item.pendingCount ??
                  (item.progress ? Number(item.progress) : 0);
                return (
                  <div
                    key={key}
                    className={style.formCard}
                    title="채점하기"
                    onClick={() => onOpenTodo(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpenTodo(item);
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
                        <div className={style.formCardTitle}>
                          {item.formTitle}
                        </div>
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
                          <span>{item.boardTitle}</span>
                          {submittedAt && <span>{submittedAt}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              if (item.kind === "outgoing") {
                return (
                  <div
                    key={key}
                    className={style.formCard}
                    title="승인 진행 확인"
                    onClick={() => onOpenTodo(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpenTodo(item);
                      }
                    }}
                  >
                    <div className={style.formCardMain}>
                      <div
                        className={`${style.formCardLeadIcon} ${style.formCardLeadIconInfo}`}
                        aria-hidden
                      >
                        <Svg type="list_check" width="20px" height="20px" />
                      </div>
                      <div className={style.formCardLeft}>
                        <div className={style.formCardTitle}>
                          {item.formTitle}
                        </div>
                        <div className={style.formCardMeta}>
                          <span
                            className={`${style.formCardBadge} ${style.badgeOptional}`}
                          >
                            승인 진행
                            {item.progress ? ` ${item.progress}` : ""}
                          </span>
                          {item.stepLabel && (
                            <span
                              className={`${style.formCardBadge} ${style.badgeApproval}`}
                            >
                              {item.stepLabel} 대기
                            </span>
                          )}
                          <span>{item.boardTitle}</span>
                          {item.currentApproverName && (
                            <span>
                              {item.currentApproverName}
                              {item.currentApproverId
                                ? `(${item.currentApproverId})`
                                : ""}
                            </span>
                          )}
                          {submittedAt && <span>{submittedAt}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // unsubmitted — 보드 내부 할 일(활동 카드) 메타와 맞춤
              const deadlineHint = getDeadlineHint(item.closeAt);
              return (
                <div
                  key={key}
                  className={style.formCard}
                  title="응답 작성"
                  onClick={() => onOpenTodo(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpenTodo(item);
                    }
                  }}
                >
                  <div className={style.formCardMain}>
                    <div
                      className={`${style.formCardLeadIcon} ${style.formCardLeadIconPending}`}
                      aria-hidden
                    >
                      <Svg type="time" width="20px" height="20px" />
                    </div>
                    <div className={style.formCardLeft}>
                      <div className={style.formCardTitle}>
                        {item.formTitle}
                      </div>
                      <div className={style.formCardMeta}>
                        {item.quizMode && (
                          <span
                            className={`${style.formCardBadge} ${style.formCardTypeQuiz}`}
                          >
                            퀴즈
                          </span>
                        )}
                        {item.assessmentMode && (
                          <span
                            className={`${style.formCardBadge} ${style.formCardTypeAssessment}`}
                          >
                            평가
                          </span>
                        )}
                        <span
                          className={`${style.formCardBadge} ${style.badgePending}`}
                        >
                          {unsubmittedBadgeLabel(item)}
                        </span>
                        <span>{item.boardTitle}</span>
                        {item.closeAt && (
                          <span
                            className={
                              deadlineHint === "오늘 마감"
                                ? style.deadlineUrgent
                                : undefined
                            }
                          >
                            마감: {formatDateTime(item.closeAt)}
                            {deadlineHint ? ` · ${deadlineHint}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default BoardsActivityTodos;
