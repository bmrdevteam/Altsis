import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import style from "./altBoard.module.scss";
import { TAltFormField } from "types/altForm";
import { TAIChatMessage, TFormAiChatSummary } from "types/aiChat";
import { TAltSheetRow } from "types/altSheet";
import { TMyAiUsage } from "types/dashboard";
import { MarkdownViewer } from "components/markdown";
import AiUsageBar from "components/ai/AiUsageBar";
import {
  ChatInputBar,
  ChatMessageBubble,
} from "layout/navbar/chatUi";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import normalizeAlterMarkdown from "utils/normalizeAlterMarkdown";
import { getUsageMeter } from "utils/aiUsageMeter";
import FieldDocResources from "./FieldDocResources";
import { TFormFileRef } from "./formFilePreview";
import { parseAiChatSummary } from "./formAiChat";

type Props = {
  formId: string;
  field: TAltFormField;
  value?: unknown;
  sessionId?: string;
  seasonId?: string;
  rowId?: string;
  disabled?: boolean;
  onChange?: (summary: TFormAiChatSummary) => void;
  onRowReady?: (row: TAltSheetRow) => void;
  onPreview?: (file: TFormFileRef) => void;
};

const formatBubbleTime = (dateString?: string) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const FormAiChatField = ({
  formId,
  field,
  value,
  sessionId,
  seasonId,
  rowId,
  disabled,
  onChange,
  onRowReady,
  onPreview,
}: Props) => {
  const { AltFormAPI, AIAPI } = useAPIv2();
  const [messages, setMessages] = useState<TAIChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [myUsage, setMyUsage] = useState<TMyAiUsage | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const guideId = useId();
  const summary = parseAiChatSummary(value);
  const loadedSessionId = sessionId || summary?.sessionId;
  const usageMeter = myUsage ? getUsageMeter(myUsage) : null;
  const usageLimitExceeded = !!usageMeter?.exceeded;
  const studentTurns =
    summary?.studentMessageCount ??
    messages.filter((msg) => msg.senderType === "student").length;
  const resourceCount =
    (field.attachments?.length || 0) + (field.links?.length || 0);
  const hasGuide = !!(field.content?.trim() || resourceCount > 0);
  const guideSummary = [
    field.content?.trim() ? "지침" : null,
    resourceCount > 0 ? `자료 ${resourceCount}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const refreshMyUsage = useCallback(() => {
    AIAPI.RMyAiUsage()
      .then((usage) => setMyUsage(usage))
      .catch(() => {
        /* 사용량 조회 실패는 채팅을 막지 않음 */
      });
    // AIAPI 객체는 렌더마다 새로 만들어지므로 deps에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (disabled) return;
    refreshMyUsage();
  }, [disabled, refreshMyUsage]);

  useEffect(() => {
    if (!loadedSessionId || !formId) return;
    let cancelled = false;
    setLoading(true);
    AltFormAPI.RFormAiChatMessages({
      params: { _id: formId, sessionId: loadedSessionId },
    })
      .then(({ messages: next }) => {
        if (!cancelled) setMessages(next || []);
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
  }, [formId, loadedSessionId]);

  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, sending, expanded]);

  useEffect(() => {
    if (!expanded) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || sending || disabled || usageLimitExceeded) return;
    setSending(true);
    try {
      const result = await AltFormAPI.CFormAiChatMessage({
        params: { _id: formId },
        data: {
          fieldId: field._id,
          content,
          ...(rowId ? { rowId } : {}),
          ...(seasonId ? { season: seasonId } : {}),
        },
      });
      setDraft("");
      setMessages(result.messages || []);
      if (result.summary) onChange?.(result.summary);
      if (result.row) onRowReady?.(result.row);
      if (result.session?._id) {
        const { messages: all } = await AltFormAPI.RFormAiChatMessages({
          params: { _id: formId, sessionId: result.session._id },
        });
        setMessages(all || result.messages || []);
      }
      refreshMyUsage();
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setSending(false);
    }
  };

  const fieldUi = (
    <div
      className={`${style.aiChatField} ${
        expanded ? style.aiChatFieldExpandedInner : ""
      }`}
    >
      {hasGuide && (
        <div className={style.aiChatGuide}>
          <button
            type="button"
            className={style.aiChatGuideToggle}
            aria-expanded={guideOpen}
            aria-controls={guideId}
            onClick={() => setGuideOpen((v) => !v)}
          >
            <span className={style.aiChatGuideToggleMain}>
              <span className={style.aiChatGuideToggleTitle}>지침 · 자료</span>
              <span className={style.aiChatGuideToggleSummary}>
                {guideOpen
                  ? "접기"
                  : guideSummary
                    ? `${guideSummary} · 펼쳐서 보기`
                    : "펼쳐서 보기"}
              </span>
            </span>
            <span className={style.aiChatGuideChevron} aria-hidden>
              {guideOpen ? "▾" : "▸"}
            </span>
          </button>
          {guideOpen && (
            <div id={guideId} className={style.aiChatGuideBody}>
              {field.content?.trim() && (
                <MarkdownViewer content={field.content} allowHtmlApp />
              )}
              <FieldDocResources
                attachments={field.attachments}
                links={field.links}
                onPreview={onPreview}
              />
            </div>
          )}
        </div>
      )}
      <div className={style.aiChatLogWrap}>
        <div className={style.aiChatLogBar}>
          <span className={style.aiChatLogBarTitle}>대화</span>
          <button
            type="button"
            className={style.aiChatExpandBtn}
            onClick={() => setExpanded((v) => !v)}
            aria-pressed={expanded}
            aria-label={expanded ? "채팅창 원래 크기" : "채팅창 확대"}
            title={expanded ? "원래 크기" : "확대"}
          >
            {expanded ? "원래 크기" : "확대"}
          </button>
        </div>
        <div
          className={style.aiChatLog}
          ref={logRef}
          role="log"
          aria-live="polite"
          aria-label={`${field.label || "AI 챗봇"} 대화`}
        >
          {loading && messages.length === 0 && (
            <p className={style.aiChatEmpty}>대화를 불러오는 중…</p>
          )}
          {!loading && messages.length === 0 && (
            <p className={style.aiChatEmpty}>
              이 활동의 지침과 자료를 바탕으로 질문해 보세요. 대화는 담당 교사가
              확인할 수 있습니다.
            </p>
          )}
          {messages.map((msg) => (
            <ChatMessageBubble
              key={msg._id}
              variant={msg.senderType === "student" ? "own" : "other"}
              wide={msg.senderType !== "student"}
              sender={
                msg.senderType === "student"
                  ? disabled
                    ? msg.senderName || "학생"
                    : "나"
                  : "Alter"
              }
              time={formatBubbleTime(msg.createdAt)}
            >
              {msg.senderType === "student" ? (
                <div className={style.aiChatMsgText}>{msg.content}</div>
              ) : (
                <div className={style.aiChatMd}>
                  <MarkdownViewer
                    content={normalizeAlterMarkdown(msg.content)}
                    allowHtmlApp
                  />
                </div>
              )}
            </ChatMessageBubble>
          ))}
          {sending && (
            <ChatMessageBubble variant="other" sender="Alter" wide>
              답변을 작성하는 중…
            </ChatMessageBubble>
          )}
        </div>
      </div>
      {disabled ? (
        <p className={style.aiChatNotice}>
          {studentTurns
            ? `대화 ${studentTurns}턴`
            : "아직 대화가 없습니다."}
        </p>
      ) : (
        <div className={style.aiChatComposer}>
          <AiUsageBar usage={myUsage} />
          <ChatInputBar
            bare
            value={draft}
            onChange={setDraft}
            onSend={handleSend}
            placeholder="메시지를 입력하세요"
            disabled={sending || usageLimitExceeded}
            sendDisabled={
              usageLimitExceeded || sending || !draft.trim()
            }
            sendActive={!!draft.trim() && !usageLimitExceeded && !sending}
            sendTitle={
              usageLimitExceeded
                ? "오늘 AI 사용량(Alt) 한도를 초과했습니다"
                : "보내기"
            }
          />
        </div>
      )}
    </div>
  );

  if (expanded) {
    return (
      <>
        <div className={style.aiChatExpandPlaceholder} aria-hidden />
        {createPortal(
          <div className={style.aiChatExpandRoot}>
            <button
              type="button"
              className={style.aiChatExpandBackdrop}
              aria-label="채팅창 닫기"
              onClick={() => setExpanded(false)}
            />
            <div
              className={style.aiChatFieldExpanded}
              role="dialog"
              aria-modal="true"
              aria-label={`${field.label || "학습 챗봇"} 확대`}
            >
              {fieldUi}
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  return fieldUi;
};

export default FormAiChatField;
