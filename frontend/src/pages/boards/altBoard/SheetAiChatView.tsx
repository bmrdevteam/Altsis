import { Ref, useCallback, useEffect, useMemo, useState } from "react";
import style from "./altBoard.module.scss";
import { TAIChatSession } from "types/aiChat";
import { TAltForm, TAltFormField } from "types/altForm";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import Svg from "assets/svg/Svg";
import { NO_PRINT_CLASS } from "utils/printArea";
import { isAiChatFieldType } from "./formAiChat";

type Props = {
  form: TAltForm;
  printRootRef?: Ref<HTMLDivElement>;
  printTitle?: string;
  reloadNonce?: number;
  onOpenSession: (session: TAIChatSession, field: TAltFormField) => void;
  onSessionDeleted?: (sessionId: string) => void;
};

const formatSessionTime = (dateString?: string) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const fallbackField = (session: TAIChatSession): TAltFormField => ({
  _id: String(session.fieldId || session._id),
  label: "AI 챗봇",
  type: "aiChat",
  permission: "respondent",
  visibleToRespondent: true,
  required: false,
  order: 0,
});

const SheetAiChatView = ({
  form,
  printRootRef,
  printTitle,
  reloadNonce = 0,
  onOpenSession,
  onSessionDeleted,
}: Props) => {
  const { AltFormAPI } = useAPIv2();
  const [sessions, setSessions] = useState<TAIChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fieldById = useMemo(() => {
    const map = new Map<string, TAltFormField>();
    for (const field of form.fields || []) {
      if (isAiChatFieldType(field.type)) map.set(String(field._id), field);
    }
    return map;
  }, [form.fields]);

  const loadSessions = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    AltFormAPI.RFormAiChatSessions({ params: { _id: form._id } })
      .then(({ sessions: next }) => {
        if (!cancelled) setSessions(next || []);
      })
      .catch((err) => {
        if (!cancelled) ALERT_ERROR(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- useAPIv2 refs are unstable
  }, [form._id]);

  useEffect(() => {
    return loadSessions();
  }, [loadSessions, reloadNonce]);

  const handleDelete = async (session: TAIChatSession) => {
    if (deletingId) return;
    if (
      !window.confirm(
        "이 대화를 삭제할까요? 삭제하면 기록에서 다시 볼 수 없습니다."
      )
    ) {
      return;
    }
    setDeletingId(session._id);
    try {
      await AltFormAPI.DFormAiChatSession({
        params: { _id: form._id, sessionId: session._id },
      });
      setSessions((prev) => prev.filter((item) => item._id !== session._id));
      onSessionDeleted?.(session._id);
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className={style.sheetEmpty}>대화를 불러오는 중…</div>;
  }

  if (sessions.length === 0) {
    return <div className={style.sheetEmpty}>아직 AI 대화가 없습니다.</div>;
  }

  return (
    <div ref={printRootRef}>
      <div className={style.printTitle}>{printTitle || form.title || "AI 대화"}</div>
      <div className={style.formCardList}>
        {sessions.map((session) => {
          const field =
            (session.fieldId && fieldById.get(String(session.fieldId))) ||
            fallbackField(session);
          const turns = session.studentMessageCount ?? 0;
          return (
            <div
              key={session._id}
              className={`${style.formCard} ${style.formCardInteractive}`}
              role="button"
              tabIndex={0}
              title="대화 열기"
              onClick={() => onOpenSession(session, field)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpenSession(session, field);
                }
              }}
            >
              <div className={style.formCardMain}>
                <div className={style.formCardTitle}>
                  {session.studentName || "학생"}
                  {session.studentId ? (
                    <span className={style.formCardMeta}>
                      {" "}
                      ({session.studentId})
                    </span>
                  ) : null}
                </div>
                <div className={style.formCardMeta}>
                  <span>{field.label}</span>
                  <span>대화 {turns}턴</span>
                  {session.lastMessageAt && (
                    <span>{formatSessionTime(session.lastMessageAt)}</span>
                  )}
                  {session.responseDeleted && (
                    <span
                      className={`${style.formCardBadge} ${style.badgeAiChatDeleted}`}
                    >
                      응답 삭제됨
                    </span>
                  )}
                </div>
                {session.lastMessagePreview ? (
                  <p className={style.formCardHint}>
                    {session.lastMessagePreview}
                  </p>
                ) : null}
              </div>
              <div
                className={`${style.formCardRight} ${style.noPrint} ${NO_PRINT_CLASS}`}
              >
                <button
                  type="button"
                  className={`${style.formCardIconBtn} ${style.formCardIconBtnDanger}`}
                  title="대화 삭제"
                  aria-label="대화 삭제"
                  disabled={deletingId === session._id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(session);
                  }}
                >
                  <Svg type="trash" width="18px" height="18px" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SheetAiChatView;
