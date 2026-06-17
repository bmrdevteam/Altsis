import { useEffect, useState } from "react";
import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TAltFormField } from "types/altForm";
import {
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_TYPE_LABELS,
  SUBMISSION_STATUS_LABELS,
  TActivity,
  TActivitySubmission,
} from "types/activity";
import style from "style/pages/courses/activity.module.scss";

type Props = {
  activity: TActivity;
  mode: "mentor" | "student";
  onBack: () => void;
  onUpdated?: () => void;
};

const ActivityFormFields = ({
  fields,
  data,
  onChange,
  readOnly,
}: {
  fields: TAltFormField[];
  data: Record<string, unknown>;
  onChange?: (fieldId: string, value: unknown) => void;
  readOnly?: boolean;
}) => (
  <>
    {fields
      .filter((f) => f.permission === "respondent")
      .map((field) => {
        const fieldId = field._id;
        const value = String(data[fieldId] ?? "");
        return (
          <div key={fieldId} className={style.formField}>
            <label className={style.formLabel}>{field.label}</label>
            {readOnly ? (
              <div className={style.detailContent}>{value || "(미입력)"}</div>
            ) : field.type === "textarea" ? (
              <textarea
                className={style.formTextarea}
                value={value}
                onChange={(e) => onChange?.(fieldId, e.target.value)}
              />
            ) : (
              <input
                className={style.formInput}
                value={value}
                onChange={(e) => onChange?.(fieldId, e.target.value)}
              />
            )}
          </div>
        );
      })}
  </>
);

const ActivityDetail = ({ activity, mode, onBack, onUpdated }: Props) => {
  const { ActivityAPI } = useAPIv2();
  const [submissions, setSubmissions] = useState<TActivitySubmission[]>([]);
  const [selected, setSelected] = useState<TActivitySubmission | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [altFormFields, setAltFormFields] = useState<TAltFormField[]>([]);
  const [mySubmission, setMySubmission] = useState<TActivitySubmission | null>(
    null
  );
  const [feedbackText, setFeedbackText] = useState("");

  const loadMentor = () => {
    ActivityAPI.RActivitySubmissions({ params: { _id: activity._id } })
      .then(({ submissions: list }) => setSubmissions(list))
      .catch(ALERT_ERROR);
  };

  const loadStudent = () => {
    ActivityAPI.RActivityMySubmission({ params: { _id: activity._id } })
      .then(({ submission, altSheetRow, altForm }) => {
        setMySubmission(submission);
        setAltFormFields(altForm?.fields ?? []);
        setFormData((altSheetRow?.data as Record<string, unknown>) ?? {});
      })
      .catch(ALERT_ERROR);
  };

  useEffect(() => {
    if (mode === "mentor") loadMentor();
    else loadStudent();
  }, [activity._id, mode]);

  return (
    <div>
      <Button type="ghost" onClick={onBack} style={{ marginBottom: 16 }}>
        ← 목록
      </Button>
      <div className={style.title}>{activity.title}</div>
      <div className={style.meta}>
        {ACTIVITY_TYPE_LABELS[activity.type]} ·{" "}
        {ACTIVITY_STATUS_LABELS[activity.status]}
      </div>
      {activity.content && (
        <div className={style.detailContent} style={{ margin: "16px 0" }}>
          {activity.content}
        </div>
      )}

      {mode === "mentor" && (
        <>
          <div className={style.actions} style={{ margin: "12px 0" }}>
            {activity.status === "draft" && (
              <Button
                type="ghost"
                onClick={() =>
                  ActivityAPI.UActivityPublish({ params: { _id: activity._id } })
                    .then(() => {
                      alert(SUCCESS_MESSAGE);
                      onUpdated?.();
                    })
                    .catch(ALERT_ERROR)
                }
              >
                게시
              </Button>
            )}
            {activity.status === "published" && (
              <Button
                type="ghost"
                onClick={() =>
                  ActivityAPI.UActivityClose({ params: { _id: activity._id } })
                    .then(() => {
                      alert(SUCCESS_MESSAGE);
                      onUpdated?.();
                    })
                    .catch(ALERT_ERROR)
                }
              >
                마감
              </Button>
            )}
          </div>
          <Table
            type="object-array"
            data={submissions}
            header={[
              { text: "이름", key: "studentName", type: "text", textAlign: "center" },
              {
                text: "상태",
                key: "status",
                type: "status",
                textAlign: "center",
                status: Object.fromEntries(
                  Object.entries(SUBMISSION_STATUS_LABELS).map(([k, v]) => [
                    k,
                    { text: v },
                  ])
                ),
              },
              {
                text: "보기",
                key: "view",
                type: "button",
                onClick: (e: TActivitySubmission) => setSelected(e),
                btnStyle: { border: true, color: "var(--accent-1)", padding: "4px", round: true },
              },
            ]}
          />
          {selected && (
            <div style={{ marginTop: 16 }}>
              <div className={style.formLabel}>{selected.studentName} 제출</div>
              {selected.altSheetRowData?.data ? (
                Object.entries(selected.altSheetRowData.data).map(([k, v]) => (
                  <div key={k} className={style.formField}>
                    <label className={style.formLabel}>
                      {selected.altForm?.fields?.find((f) => f._id === k)?.label ?? k}
                    </label>
                    <div className={style.detailContent}>{String(v)}</div>
                  </div>
                ))
              ) : (
                <div className={style.empty}>제출 없음</div>
              )}
              {selected.feedback?.map((fb, i) => (
                <div key={i} className={style.feedbackItem}>
                  <div className={style.feedbackMeta}>{fb.userName}</div>
                  <div>{fb.content}</div>
                </div>
              ))}
              <textarea
                className={style.formTextarea}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="피드백"
              />
              <Button
                type="ghost"
                onClick={() =>
                  ActivityAPI.CActivityFeedback({
                    params: {
                      _id: activity._id,
                      submissionId: selected._id,
                    },
                    data: { content: feedbackText },
                  })
                    .then(() => {
                      alert(SUCCESS_MESSAGE);
                      setFeedbackText("");
                      setSelected(null);
                      loadMentor();
                    })
                    .catch(ALERT_ERROR)
                }
              >
                피드백 저장
              </Button>
            </div>
          )}
        </>
      )}

      {mode === "student" && (
        <>
          {mySubmission && (
            <div className={style.meta}>
              상태: {SUBMISSION_STATUS_LABELS[mySubmission.status]}
            </div>
          )}
          {mySubmission?.feedback?.map((fb, i) => (
            <div key={i} className={style.feedbackItem}>
              <div className={style.feedbackMeta}>{fb.userName}</div>
              <div>{fb.content}</div>
            </div>
          ))}
          <ActivityFormFields
            fields={altFormFields}
            data={formData}
            readOnly={
              activity.status !== "published" ||
              mySubmission?.status === "submitted" ||
              mySubmission?.status === "completed"
            }
            onChange={(fieldId, value) =>
              setFormData((prev) => ({ ...prev, [fieldId]: value }))
            }
          />
          {activity.status === "published" &&
            mySubmission?.status !== "submitted" &&
            mySubmission?.status !== "completed" && (
              <div className={style.actions}>
                <Button
                  type="ghost"
                  onClick={() =>
                    ActivityAPI.UActivityDraft({
                      params: { _id: activity._id },
                      data: { data: formData },
                    })
                      .then(() => alert(SUCCESS_MESSAGE))
                      .catch(ALERT_ERROR)
                  }
                >
                  임시 저장
                </Button>
                <Button
                  type="ghost"
                  onClick={() =>
                    ActivityAPI.CActivitySubmit({
                      params: { _id: activity._id },
                      data: { data: formData },
                    })
                      .then(() => {
                        alert(SUCCESS_MESSAGE);
                        loadStudent();
                      })
                      .catch(ALERT_ERROR)
                  }
                >
                  제출
                </Button>
              </div>
            )}
        </>
      )}
    </div>
  );
};

export default ActivityDetail;
