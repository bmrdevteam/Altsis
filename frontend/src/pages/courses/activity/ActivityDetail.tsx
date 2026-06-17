import { useEffect, useMemo, useState } from "react";
import Button from "components/button/Button";
import Loading from "components/loading/Loading";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import AltFormRenderer from "pages/boards/altBoard/AltFormRenderer";
import AltSheetView from "pages/boards/altBoard/AltSheetView";
import { TAltForm } from "types/altForm";
import { TBoard } from "types/board";
import {
  ACTIVITY_STATUS_LABEL_MAP,
  ACTIVITY_TYPE_LABEL_MAP,
  TActivity,
  TActivityStatus,
  TActivitySubmission,
  TActivitySubmissionStatus,
} from "types/activity";
import style from "./activity.module.scss";

type Props = {
  activity: TActivity | null;
  canManage: boolean;
  onUpdated: (activity: TActivity) => void;
  onDeleted: (activityId: string) => void;
};

const SUBMISSION_STATUS_LABEL_MAP: Record<TActivitySubmissionStatus, string> = {
  not_started: "미제출",
  in_progress: "작성 중",
  submitted: "제출됨",
  returned: "반려",
  completed: "완료",
};

const toDatetimeLocal = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

const toIsoString = (value: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

const formatDateTimeText = (value?: string) => {
  if (!value) return "미설정";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "미설정";
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ActivityDetail = ({ activity, canManage, onUpdated, onDeleted }: Props) => {
  const { ActivityAPI, BoardAPI, AltFormAPI } = useAPIv2();

  const [board, setBoard] = useState<TBoard | null>(null);
  const [form, setForm] = useState<TAltForm | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [submissions, setSubmissions] = useState<TActivitySubmission[]>([]);
  const [mySubmission, setMySubmission] = useState<TActivitySubmission | null>(null);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<TActivityStatus>("draft");
  const [openAt, setOpenAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [allowLateSubmission, setAllowLateSubmission] = useState(false);
  const [allowResubmit, setAllowResubmit] = useState(false);

  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackStatus, setFeedbackStatus] =
    useState<TActivitySubmissionStatus>("returned");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSheetView, setShowSheetView] = useState(false);
  const [showRenderer, setShowRenderer] = useState(false);

  const selectedSubmission = useMemo(
    () =>
      submissions.find((submission) => submission._id === selectedSubmissionId) || null,
    [submissions, selectedSubmissionId]
  );

  const loadSubmissionData = async (targetActivity: TActivity) => {
    setIsLoadingSubmissions(true);
    try {
      if (canManage) {
        const { submissions: loadedSubmissions } = await ActivityAPI.RActivitySubmissions({
          params: { _id: targetActivity._id },
        });
        setSubmissions(loadedSubmissions);
        setSelectedSubmissionId((prev) =>
          prev && loadedSubmissions.some((submission) => submission._id === prev)
            ? prev
            : loadedSubmissions[0]?._id || ""
        );
        setMySubmission(null);
      } else {
        const { submission } = await ActivityAPI.RActivitySubmissions({
          params: { _id: targetActivity._id },
          query: { mine: "true" },
        });
        setMySubmission(submission || null);
        setSubmissions([]);
        setSelectedSubmissionId("");
      }
    } catch (error) {
      ALERT_ERROR(error);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  const loadActivityAssets = async (targetActivity: TActivity) => {
    setIsLoadingDetail(true);
    try {
      const tasks: Promise<any>[] = [];
      if (targetActivity.altBoard) {
        tasks.push(
          BoardAPI.RBoard({ params: { _id: targetActivity.altBoard } }).then(
            ({ board: loadedBoard }) => setBoard(loadedBoard)
          )
        );
      } else {
        setBoard(null);
      }

      if (targetActivity.altForm) {
        tasks.push(
          AltFormAPI.RAltForm({ params: { _id: targetActivity.altForm } }).then(
            ({ form: loadedForm }) => setForm(loadedForm)
          )
        );
      } else {
        setForm(null);
      }

      await Promise.all(tasks);
    } catch (error) {
      ALERT_ERROR(error);
      setBoard(null);
      setForm(null);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (!activity) {
      setBoard(null);
      setForm(null);
      setSubmissions([]);
      setMySubmission(null);
      setSelectedSubmissionId("");
      setShowSheetView(false);
      setShowRenderer(false);
      return;
    }

    setTitle(activity.title);
    setContent(activity.content || "");
    setStatus(activity.status);
    setOpenAt(toDatetimeLocal(activity.openAt));
    setDueAt(toDatetimeLocal(activity.dueAt));
    setAllowLateSubmission(!!activity.allowLateSubmission);
    setAllowResubmit(!!activity.allowResubmit);
    setFeedbackMessage("");
    setFeedbackStatus("returned");
    setShowSheetView(false);
    setShowRenderer(false);

    loadActivityAssets(activity);
    loadSubmissionData(activity);
  }, [activity?._id, canManage]);

  if (!activity) {
    return (
      <div className={style.panel}>
        <div className={style.panelHeader}>
          <div className={style.panelTitle}>상세 정보</div>
        </div>
        <div className={style.empty}>활동을 선택해주세요.</div>
      </div>
    );
  }

  const handleUpdateActivity = async () => {
    setIsUpdating(true);
    try {
      const { activity: updatedActivity } = await ActivityAPI.UActivity({
        params: { _id: activity._id },
        data: {
          title: title.trim(),
          content,
          status,
          openAt: toIsoString(openAt),
          dueAt: toIsoString(dueAt),
          allowLateSubmission,
          allowResubmit,
          syncSubmissions: true,
        },
      });
      onUpdated(updatedActivity);
      alert("활동을 저장했습니다.");
    } catch (error) {
      ALERT_ERROR(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePublish = async () => {
    setIsUpdating(true);
    try {
      const { activity: publishedActivity } = await ActivityAPI.UPublishActivity({
        params: { _id: activity._id },
      });
      onUpdated(publishedActivity);
      await loadSubmissionData(publishedActivity);
      alert("활동을 게시했습니다.");
    } catch (error) {
      ALERT_ERROR(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("이 활동을 삭제하시겠습니까?")) return;
    setIsUpdating(true);
    try {
      await ActivityAPI.DActivity({ params: { _id: activity._id } });
      onDeleted(activity._id);
      alert("활동을 삭제했습니다.");
    } catch (error) {
      ALERT_ERROR(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSubmissionStatusChange = async (
    submission: TActivitySubmission,
    nextStatus: TActivitySubmissionStatus
  ) => {
    try {
      const { submission: updatedSubmission } = await ActivityAPI.UActivitySubmissionStatus({
        params: { _id: activity._id, submissionId: submission._id },
        data: { status: nextStatus },
      });
      setSubmissions((prev) =>
        prev.map((item) => (item._id === updatedSubmission._id ? updatedSubmission : item))
      );
    } catch (error) {
      ALERT_ERROR(error);
    }
  };

  const handleAddFeedback = async () => {
    if (!selectedSubmission) {
      alert("피드백 대상 학생을 선택해주세요.");
      return;
    }
    if (!feedbackMessage.trim()) {
      alert("피드백 내용을 입력해주세요.");
      return;
    }

    try {
      const { submission: updatedSubmission } = await ActivityAPI.CActivitySubmissionFeedback(
        {
          params: { _id: activity._id, submissionId: selectedSubmission._id },
          data: {
            message: feedbackMessage.trim(),
            status: feedbackStatus,
          },
        }
      );
      setSubmissions((prev) =>
        prev.map((item) => (item._id === updatedSubmission._id ? updatedSubmission : item))
      );
      setFeedbackMessage("");
      alert("피드백을 저장했습니다.");
    } catch (error) {
      ALERT_ERROR(error);
    }
  };

  return (
    <div className={style.panel}>
      <div className={style.panelHeader}>
        <div className={style.panelTitle}>{activity.title}</div>
        <div className={style.templateActions}>
          <Button
            type="ghost"
            onClick={() => loadSubmissionData(activity)}
            style={{ fontSize: "12px" }}
          >
            제출 새로고침
          </Button>
          {canManage && (
            <>
              <Button
                type="ghost"
                onClick={handleUpdateActivity}
                disabled={isUpdating}
                style={{ fontSize: "12px" }}
              >
                저장
              </Button>
              {activity.status === "draft" && (
                <Button
                  type="ghost"
                  onClick={handlePublish}
                  disabled={isUpdating}
                  style={{ fontSize: "12px" }}
                >
                  게시
                </Button>
              )}
              <Button
                type="ghost"
                onClick={handleDelete}
                disabled={isUpdating}
                style={{ fontSize: "12px" }}
              >
                삭제
              </Button>
            </>
          )}
        </div>
      </div>

      <div className={style.detailBody}>
        <div className={style.metaGrid}>
          <span className={style.metaChip}>{ACTIVITY_TYPE_LABEL_MAP[activity.type]}</span>
          <span className={style.metaChip}>
            {ACTIVITY_STATUS_LABEL_MAP[activity.status]}
          </span>
          <span className={style.metaChip}>시작 {formatDateTimeText(activity.openAt)}</span>
          <span className={style.metaChip}>마감 {formatDateTimeText(activity.dueAt)}</span>
        </div>

        {canManage ? (
          <>
            <div className={style.inlineRow}>
              <div className={style.formRow} style={{ flex: 1 }}>
                <label className={style.label}>활동 제목</label>
                <input
                  className={style.input}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>
              <div className={style.formRow} style={{ flex: 1 }}>
                <label className={style.label}>상태</label>
                <select
                  className={style.select}
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as TActivityStatus)
                  }
                >
                  <option value="draft">초안</option>
                  <option value="published">게시</option>
                  <option value="closed">마감</option>
                </select>
              </div>
            </div>

            <div className={style.inlineRow}>
              <div className={style.formRow} style={{ flex: 1 }}>
                <label className={style.label}>시작 일시</label>
                <input
                  className={style.input}
                  type="datetime-local"
                  value={openAt}
                  onChange={(event) => setOpenAt(event.target.value)}
                />
              </div>
              <div className={style.formRow} style={{ flex: 1 }}>
                <label className={style.label}>마감 일시</label>
                <input
                  className={style.input}
                  type="datetime-local"
                  value={dueAt}
                  onChange={(event) => setDueAt(event.target.value)}
                />
              </div>
            </div>

            <div className={style.inlineRow}>
              <label className={style.muted}>
                <input
                  type="checkbox"
                  checked={allowLateSubmission}
                  onChange={(event) => setAllowLateSubmission(event.target.checked)}
                  style={{ marginRight: "6px" }}
                />
                지각 제출 허용
              </label>
              <label className={style.muted}>
                <input
                  type="checkbox"
                  checked={allowResubmit}
                  onChange={(event) => setAllowResubmit(event.target.checked)}
                  style={{ marginRight: "6px" }}
                />
                재제출 허용
              </label>
            </div>

            <div className={style.formRow}>
              <label className={style.label}>활동 안내</label>
              <textarea
                className={style.textarea}
                value={content}
                onChange={(event) => setContent(event.target.value)}
              />
            </div>
          </>
        ) : (
          <div className={style.contentBox}>{activity.content || "안내가 없습니다."}</div>
        )}

        <div className={style.divider} />

        <div className={style.panelTitle}>제출/피드백</div>
        {isLoadingSubmissions ? (
          <Loading height="160px" />
        ) : canManage ? (
          <>
            {submissions.length === 0 ? (
              <div className={style.empty}>제출 데이터가 없습니다.</div>
            ) : (
              <>
                <table className={style.submissionsTable}>
                  <thead>
                    <tr>
                      <th>학생</th>
                      <th>상태</th>
                      <th>제출일</th>
                      <th>재제출</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((submission) => (
                      <tr
                        key={submission._id}
                        onClick={() => setSelectedSubmissionId(submission._id)}
                        style={{
                          background:
                            submission._id === selectedSubmissionId
                              ? "var(--background-color-2)"
                              : "transparent",
                          cursor: "pointer",
                        }}
                      >
                        <td>
                          {submission.studentName} ({submission.studentId})
                        </td>
                        <td>
                          <select
                            className={style.select}
                            value={submission.status}
                            onChange={(event) =>
                              handleSubmissionStatusChange(
                                submission,
                                event.target.value as TActivitySubmissionStatus
                              )
                            }
                            style={{ minWidth: "120px" }}
                          >
                            <option value="not_started">미제출</option>
                            <option value="in_progress">작성 중</option>
                            <option value="submitted">제출됨</option>
                            <option value="returned">반려</option>
                            <option value="completed">완료</option>
                          </select>
                        </td>
                        <td>{formatDateTimeText(submission.submittedAt)}</td>
                        <td>{submission.resubmitCount}회</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {selectedSubmission && (
                  <div className={style.feedbackBox}>
                    <div className={style.panelTitle}>
                      {selectedSubmission.studentName} 피드백
                    </div>
                    <div className={style.feedbackItem}>
                      <div className={style.inlineRow}>
                        <select
                          className={style.select}
                          value={feedbackStatus}
                          onChange={(event) =>
                            setFeedbackStatus(
                              event.target.value as TActivitySubmissionStatus
                            )
                          }
                          style={{ maxWidth: "160px" }}
                        >
                          <option value="submitted">제출 유지</option>
                          <option value="returned">반려 처리</option>
                          <option value="completed">완료 처리</option>
                        </select>
                        <Button type="ghost" onClick={handleAddFeedback}>
                          피드백 저장
                        </Button>
                      </div>
                      <textarea
                        className={style.textarea}
                        value={feedbackMessage}
                        onChange={(event) => setFeedbackMessage(event.target.value)}
                        placeholder="학생에게 전달할 피드백을 입력하세요."
                        style={{ minHeight: "90px" }}
                      />
                    </div>
                    <div className={style.feedbackItem}>
                      {selectedSubmission.feedback.length === 0 ? (
                        <div className={style.muted}>저장된 피드백이 없습니다.</div>
                      ) : (
                        selectedSubmission.feedback.map((feedback, index) => (
                          <div key={index} className={style.feedbackItem}>
                            <div className={style.feedbackAuthor}>
                              {feedback.authorName || feedback.authorId} ·{" "}
                              {formatDateTimeText(feedback.createdAt)}
                            </div>
                            <div className={style.contentBox}>{feedback.message}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div className={style.feedbackBox}>
            <div className={style.badgeRow}>
              <span className={style.badge}>
                상태{" "}
                {mySubmission
                  ? SUBMISSION_STATUS_LABEL_MAP[mySubmission.status]
                  : "미제출"}
              </span>
              <span className={style.badge}>
                제출일{" "}
                {mySubmission ? formatDateTimeText(mySubmission.submittedAt) : "없음"}
              </span>
            </div>
            <div className={style.feedbackItem}>
              {mySubmission?.feedback?.length ? (
                mySubmission.feedback.map((feedback, index) => (
                  <div key={index} className={style.feedbackItem}>
                    <div className={style.feedbackAuthor}>
                      {feedback.authorName || feedback.authorId} ·{" "}
                      {formatDateTimeText(feedback.createdAt)}
                    </div>
                    <div className={style.contentBox}>{feedback.message}</div>
                  </div>
                ))
              ) : (
                <div className={style.muted}>아직 받은 피드백이 없습니다.</div>
              )}
            </div>
          </div>
        )}

        <div className={style.divider} />

        <div className={style.panelTitle}>제출 화면</div>
        {isLoadingDetail ? (
          <Loading height="200px" />
        ) : !board || !form || !activity.altForm ? (
          <div className={style.empty}>활동 양식 정보가 없습니다.</div>
        ) : canManage ? (
          <>
            <Button
              type="ghost"
              onClick={() => setShowSheetView((prev) => !prev)}
              style={{ marginBottom: "10px" }}
            >
              {showSheetView ? "제출 목록 닫기" : "제출 목록 열기"}
            </Button>
            {showSheetView && (
              <AltSheetView
                key={`${activity._id}-${form._id}`}
                board={board}
                forms={[form]}
                canManage
                canDeleteAnyRow={false}
                initialFormId={form._id}
              />
            )}
          </>
        ) : (
          <>
            {!showRenderer ? (
              <Button type="ghost" onClick={() => setShowRenderer(true)}>
                제출/응답 열기
              </Button>
            ) : (
              <AltFormRenderer
                board={board}
                formId={activity.altForm}
                onBack={() => {
                  setShowRenderer(false);
                  loadSubmissionData(activity);
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ActivityDetail;
