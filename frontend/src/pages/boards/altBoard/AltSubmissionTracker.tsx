import { useEffect, useState } from "react";
import style from "./altBoard.module.scss";
import { TAltForm } from "types/altForm";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import Button from "components/button/Button";

type Props = {
  form: TAltForm;
  onClose: () => void;
};

type SubmissionStatus = {
  total: number;
  submitted: { userId: string; userName: string; submittedAt: string }[];
  unsubmitted: { userId: string; userName: string }[];
};

const AltSubmissionTracker = ({ form, onClose }: Props) => {
  const { AltSheetRowAPI } = useAPIv2();

  const [status, setStatus] = useState<SubmissionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [tab, setTab] = useState<"submitted" | "unsubmitted">("unsubmitted");

  useEffect(() => {
    AltSheetRowAPI.RAltSheetRowSubmissionStatus({
      query: { form: form._id },
    })
      .then((data: any) => {
        setStatus(data);
        setIsLoading(false);
      })
      .catch((err) => {
        ALERT_ERROR(err);
        setIsLoading(false);
      });
  }, [form._id]);

  const handleSendReminder = async () => {
    if (!status || status.unsubmitted.length === 0) return;
    if (
      !window.confirm(
        `미제출자 ${status.unsubmitted.length}명에게 알림을 보내시겠습니까?`
      )
    )
      return;

    setIsSending(true);
    try {
      await AltSheetRowAPI.CAltSheetRowSendReminder({
        data: {
          form: form._id,
          userIds: status.unsubmitted.map((u) => u.userId),
        },
      });
      alert("알림이 발송되었습니다.");
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) return null;
  if (!status) return null;

  const submittedPercent =
    status.total > 0
      ? Math.round((status.submitted.length / status.total) * 100)
      : 0;

  return (
    <div className={style.trackerOverlay} onClick={onClose}>
      <div
        className={style.trackerPanel}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={style.trackerHeader}>
          <span style={{ fontSize: "15px", fontWeight: 600 }}>
            제출 현황: {form.title}
          </span>
          <button className={style.removeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        {/* 요약 */}
        <div className={style.trackerSummary}>
          <div className={style.trackerProgress}>
            <div
              className={style.trackerProgressFill}
              style={{ width: `${submittedPercent}%` }}
            />
          </div>
          <div className={style.trackerStats}>
            총 {status.total}명 중 {status.submitted.length}명 제출 (
            {submittedPercent}%)
          </div>
        </div>

        {/* 탭 */}
        <div className={style.tabContainer} style={{ marginBottom: "12px" }}>
          <button
            className={`${style.tab} ${tab === "unsubmitted" ? style.tabActive : ""}`}
            onClick={() => setTab("unsubmitted")}
          >
            미제출 ({status.unsubmitted.length})
          </button>
          <button
            className={`${style.tab} ${tab === "submitted" ? style.tabActive : ""}`}
            onClick={() => setTab("submitted")}
          >
            제출 ({status.submitted.length})
          </button>
        </div>

        {/* 목록 */}
        <div className={style.trackerList}>
          {tab === "unsubmitted" ? (
            status.unsubmitted.length === 0 ? (
              <div className={style.trackerEmpty}>모두 제출했습니다!</div>
            ) : (
              status.unsubmitted.map((u) => (
                <div key={u.userId} className={style.trackerItem}>
                  <span>
                    {u.userName}{" "}
                    <span style={{ color: "var(--text-color-2)", fontSize: "12px" }}>
                      ({u.userId})
                    </span>
                  </span>
                </div>
              ))
            )
          ) : status.submitted.length === 0 ? (
            <div className={style.trackerEmpty}>아직 제출자가 없습니다.</div>
          ) : (
            status.submitted.map((u) => (
              <div key={u.userId} className={style.trackerItem}>
                <span>
                  {u.userName}{" "}
                  <span style={{ color: "var(--text-color-2)", fontSize: "12px" }}>
                    ({u.userId})
                  </span>
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-color-2)" }}>
                  {new Date(u.submittedAt).toLocaleString("ko-KR")}
                </span>
              </div>
            ))
          )}
        </div>

        {/* 알림 보내기 */}
        {tab === "unsubmitted" && status.unsubmitted.length > 0 && (
          <div style={{ padding: "12px 0 0" }}>
            <Button
              type="ghost"
              onClick={handleSendReminder}
              disabled={isSending}
              style={{ width: "100%" }}
            >
              {isSending
                ? "발송 중..."
                : `미제출자 ${status.unsubmitted.length}명에게 알림 보내기`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AltSubmissionTracker;
