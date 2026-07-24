import style from "./altBoard/altBoard.module.scss";
import Svg from "assets/svg/Svg";
import Button from "components/button/Button";

export type TSchoolTodoItem = {
  kind: "approve" | "outgoing" | "unsubmitted";
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
  myResponseCount?: number;
  requiredResponseCount?: number | null;
  submittedAt?: string;
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
    <div style={{ paddingTop: 12 }}>
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
                <div
                  className={`${style.formCardLeadIcon} ${style.formCardLeadIconWarning}`}
                  aria-hidden
                >
                  <Svg type="list_check" width="20px" height="20px" />
                </div>
                <div className={style.formCardLeft}>
                  <div className={style.formCardTitle}>{item.formTitle}</div>
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
                        {item.respondentId ? `(${item.respondentId})` : ""}
                      </span>
                    )}
                    {submittedAt && <span>{submittedAt}</span>}
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
                <div
                  className={`${style.formCardLeadIcon} ${style.formCardLeadIconInfo}`}
                  aria-hidden
                >
                  <Svg type="list_check" width="20px" height="20px" />
                </div>
                <div className={style.formCardLeft}>
                  <div className={style.formCardTitle}>{item.formTitle}</div>
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
            );
          }

          // unsubmitted
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
              <div
                className={`${style.formCardLeadIcon} ${style.formCardLeadIconPending}`}
                aria-hidden
              >
                <Svg type="write" width="20px" height="20px" />
              </div>
              <div className={style.formCardLeft}>
                <div className={style.formCardTitle}>{item.formTitle}</div>
                <div className={style.formCardMeta}>
                  <span
                    className={`${style.formCardBadge} ${style.badgePending}`}
                  >
                    {item.progress || "미제출"}
                  </span>
                  <span>{item.boardTitle}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BoardsActivityTodos;
