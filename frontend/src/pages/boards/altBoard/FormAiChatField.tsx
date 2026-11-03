import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  ClipboardEvent,
} from "react";
import { createPortal } from "react-dom";
import style from "./altBoard.module.scss";
import { TAltForm, TAltFormField } from "types/altForm";
import {
  TAIChatAttachment,
  TAIChatMessage,
  TFormAiChatSummary,
} from "types/aiChat";
import { TAltSheetRow } from "types/altSheet";
import { TMyAiUsage } from "types/dashboard";
import { MarkdownViewer } from "components/markdown";
import { AlterAssistantBody } from "layout/navbar/alterUi";
import AiUsageBar from "components/ai/AiUsageBar";
import {
  ChatInputBar,
  ChatMessageBubble,
  chatUiStyle,
} from "layout/navbar/chatUi";
import Svg from "assets/svg/Svg";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { MESSAGE } from "hooks/_message";
import { getUsageMeter } from "utils/aiUsageMeter";
import FieldDocResources from "./FieldDocResources";
import { TFormFileRef } from "./formFilePreview";
import { isAssessmentGradeChatPayload, parseAiChatSummary } from "./formAiChat";
import FormAiChatGradeResult from "./FormAiChatGradeResult";

type Props = {
  form?: TAltForm;
  formId: string;
  field: TAltFormField;
  value?: unknown;
  sessionId?: string;
  seasonId?: string;
  rowId?: string;
  disabled?: boolean;
  /** 평가 모드면 대화/피드백 스킬을 고를 수 있음 */
  assessmentMode?: boolean;
  /** 피드백 전에 작성 중 답을 저장본으로 맞춤 */
  onBeforeSend?: () => Promise<string | undefined>;
  onChange?: (summary: TFormAiChatSummary) => void;
  onRowReady?: (row: TAltSheetRow) => void;
  onPreview?: (file: TFormFileRef) => void;
};

const ATTACHMENT_LIMIT = 3;
const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

type PendingAttachment = TAIChatAttachment & {
  localId: string;
  uploading?: boolean;
};

const formAttachmentUrl = (formId: string, seasonId: string) =>
  `${process.env.REACT_APP_SERVER_URL}/api/alt-forms/${formId}/ai-chat/attachment?season=${encodeURIComponent(
    seasonId
  )}`;

const isAcceptedAlterFile = (file: File) => {
  const lower = file.name.toLowerCase();
  const mime = String(file.type || "").toLowerCase();
  if (
    ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(mime) ||
    /\.(png|jpe?g|webp)$/i.test(lower)
  ) {
    return true;
  }
  return (
    /\.(txt|md|markdown|csv|pdf|docx)$/i.test(lower) ||
    [
      "text/plain",
      "text/markdown",
      "text/csv",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ].includes(mime)
  );
};

const guessAttachKind = (file: File): "image" | "text" => {
  const lower = file.name.toLowerCase();
  if (file.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(lower)) {
    return "image";
  }
  return "text";
};

const collectClipboardFiles = (dt: DataTransfer | null): File[] => {
  if (!dt) return [];
  const byKey = new Map<string, File>();
  const add = (file: File | null) => {
    if (!file) return;
    const key = `${file.name}|${file.size}|${file.type}|${file.lastModified}`;
    if (!byKey.has(key)) byKey.set(key, file);
  };
  if (dt.files?.length) Array.from(dt.files).forEach(add);
  if (dt.items?.length) {
    for (const item of Array.from(dt.items)) {
      if (item.kind === "file") add(item.getAsFile());
    }
  }
  return Array.from(byKey.values());
};

const visibleMessageText = (content: string, attachments?: TAIChatAttachment[]) => {
  if (!attachments?.length) return content;
  return content.replace(/\[첨부:\s*[^\]]+\]/g, "").trim();
};

const revokePreview = (item?: { previewUrl?: string }) => {
  if (item?.previewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(item.previewUrl);
  }
};

const formatBubbleTime = (dateString?: string) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AiChatAttachmentList = ({
  items,
  compact,
  onRemove,
}: {
  items: Array<TAIChatAttachment & { uploading?: boolean; localId?: string }>;
  compact?: boolean;
  onRemove?: (localId: string) => void;
}) => (
  <div
    className={`${style.aiChatAttachList} ${
      compact ? style.aiChatAttachListCompact : ""
    }`}
  >
    {items.map((item, index) => {
      const key = item.localId || `${item.kind}-${item.name}-${index}`;
      return (
        <div
          key={key}
          className={`${style.aiChatAttachItem} ${
            item.kind === "image" && item.previewUrl
              ? style.aiChatAttachImage
              : style.aiChatAttachFile
          } ${item.uploading ? style.aiChatAttachUploading : ""}`}
        >
          {item.kind === "image" && item.previewUrl ? (
            <img
              src={item.previewUrl}
              alt={item.name}
              className={style.aiChatAttachImg}
            />
          ) : (
            <div className={style.aiChatAttachFileInner}>
              <Svg type="file" width="18px" height="18px" />
              <span className={style.aiChatAttachFileName} title={item.name}>
                {item.uploading ? `${item.name} (업로드 중…)` : item.name}
              </span>
            </div>
          )}
          {onRemove && item.localId ? (
            <button
              type="button"
              className={style.aiChatAttachRemove}
              onClick={() => onRemove(item.localId as string)}
              aria-label={`${item.name} 제거`}
              disabled={item.uploading}
            >
              ×
            </button>
          ) : null}
        </div>
      );
    })}
  </div>
);

const FormAiChatField = ({
  form,
  formId,
  field,
  value,
  sessionId,
  seasonId,
  rowId,
  disabled,
  assessmentMode,
  onBeforeSend,
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
  const [skill, setSkill] = useState<"chat" | "grade">("chat");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [attachError, setAttachError] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const attachMenuOpenRef = useRef(false);
  attachMenuOpenRef.current = attachMenuOpen;
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef<PendingAttachment[]>([]);
  attachmentsRef.current = attachments;
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
        if (cancelled) return;
        setMessages([]);
        if (!disabled) ALERT_ERROR(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- useAPIv2 refs are unstable
  }, [formId, loadedSessionId, disabled]);

  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, sending, expanded]);

  useEffect(() => {
    if (!expanded) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !attachMenuOpenRef.current) setExpanded(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  const isGradeSkill = !!assessmentMode && skill === "grade";
  const attachBusy = attachments.some((item) => item.uploading);
  const readyAttachments = attachments.filter(
    (item) => !item.uploading && item.key && item.kind
  );
  const gradeAttachBlocked = isGradeSkill && attachments.length > 0;

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach(revokePreview);
    };
  }, []);

  useEffect(() => {
    if (!attachMenuOpen) return undefined;
    const onPointer = (event: MouseEvent) => {
      if (
        attachMenuRef.current &&
        !attachMenuRef.current.contains(event.target as Node)
      ) {
        setAttachMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAttachMenuOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [attachMenuOpen]);

  const removeAttachment = (localId: string) => {
    setAttachments((prev) => {
      const target = prev.find((item) => item.localId === localId);
      revokePreview(target);
      return prev.filter((item) => item.localId !== localId);
    });
  };

  const clearAttachments = () => {
    setAttachments((prev) => {
      prev.forEach(revokePreview);
      return [];
    });
  };

  const handleAttachFiles = async (files: FileList | File[] | null) => {
    if (!files?.length || disabled || sending) return;
    if (isGradeSkill) {
      setAttachError("피드백에는 파일을 첨부할 수 없습니다.");
      return;
    }
    if (!formId) {
      setAttachError("양식 정보가 없어 첨부할 수 없습니다.");
      return;
    }
    if (!seasonId) {
      setAttachError("학기 정보가 없어 첨부할 수 없습니다.");
      return;
    }
    const remaining = ATTACHMENT_LIMIT - attachments.length;
    if (remaining <= 0) {
      setAttachError("첨부는 최대 3개까지입니다.");
      return;
    }
    const picked = Array.from(files).slice(0, remaining);
    setAttachMenuOpen(false);
    setAttachError("");
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
    const queued: Array<{ file: File; placeholder: PendingAttachment }> = [];
    for (const file of picked) {
      if (!isAcceptedAlterFile(file)) {
        setAttachError(
          "지원하지 않는 파일입니다. png, jpg, webp, txt, md, csv, pdf, docx만 첨부할 수 있습니다."
        );
        continue;
      }
      if (file.size > ATTACHMENT_MAX_BYTES) {
        setAttachError(`"${file.name}" 파일이 너무 큽니다. (최대 10MB)`);
        continue;
      }
      const kind = guessAttachKind(file);
      queued.push({
        file,
        placeholder: {
          localId: `${file.name}-${file.size}-${file.lastModified}-${queued.length}-${Date.now()}`,
          kind,
          name: file.name,
          mimeType: file.type || undefined,
          previewUrl: kind === "image" ? URL.createObjectURL(file) : undefined,
          uploading: true,
        },
      });
    }
    if (!queued.length) return;
    setAttachments((prev) =>
      [...prev, ...queued.map((item) => item.placeholder)].slice(0, ATTACHMENT_LIMIT)
    );

    for (const { file, placeholder } of queued) {
      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch(formAttachmentUrl(formId, seasonId), {
          method: "POST",
          credentials: "include",
          body,
        });
        const data = (await res.json().catch(() => ({}))) as {
          message?: string;
          attachment?: TAIChatAttachment;
        };
        if (!res.ok || !data?.attachment?.key || !data?.attachment?.kind) {
          const rawMessage =
            typeof data?.message === "string" ? data.message : "";
          throw new Error(
            MESSAGE.get(rawMessage) ||
              rawMessage ||
              `"${file.name}" 첨부에 실패했습니다.`
          );
        }
        const uploaded = data.attachment as TAIChatAttachment;
        setAttachments((prev) =>
          prev.map((item) =>
            item.localId === placeholder.localId
              ? {
                  ...item,
                  kind: uploaded.kind,
                  name: uploaded.name || file.name,
                  key: uploaded.key,
                  mimeType: uploaded.mimeType,
                  uploading: false,
                }
              : item
          )
        );
      } catch (err) {
        revokePreview(placeholder);
        setAttachments((prev) =>
          prev.filter((item) => item.localId !== placeholder.localId)
        );
        setAttachError(
          err instanceof Error ? err.message : `"${file.name}" 첨부에 실패했습니다.`
        );
      }
    }
  };

  const handlePasteAttach = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (sending || attachBusy || disabled) return;
    const files = collectClipboardFiles(event.clipboardData).filter(
      isAcceptedAlterFile
    );
    if (!files.length) return;
    event.preventDefault();
    if (isGradeSkill) {
      setAttachError("피드백에는 파일을 첨부할 수 없습니다.");
      return;
    }
    void handleAttachFiles(files);
  };

  const handleSend = async () => {
    const content = draft.trim();
    if (sending || disabled || usageLimitExceeded || attachBusy || gradeAttachBlocked) {
      return;
    }
    if (!isGradeSkill && !content && readyAttachments.length === 0) return;
    setSending(true);
    try {
      let sendRowId = rowId;
      if (isGradeSkill && onBeforeSend) {
        sendRowId = (await onBeforeSend()) || rowId;
      }
      const result = await AltFormAPI.CFormAiChatMessage({
        params: { _id: formId },
        data: {
          fieldId: field._id,
          content:
            content ||
            (isGradeSkill
              ? "이 작성 중인 답을 루브릭에 맞게 피드백해 주세요."
              : ""),
          ...(sendRowId ? { rowId: sendRowId } : {}),
          ...(seasonId ? { season: seasonId } : {}),
          ...(isGradeSkill ? { skill: "assessment-grade" as const } : {}),
          ...(!isGradeSkill && readyAttachments.length
            ? {
                attachments: readyAttachments.map((item) => ({
                  kind: item.kind,
                  name: item.name,
                  key: item.key as string,
                  mimeType: item.mimeType,
                })),
              }
            : {}),
        },
      });
      setDraft("");
      clearAttachments();
      setAttachError("");
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
              {assessmentMode
                ? "대화로 질문하거나, 피드백으로 작성 중인 답을 루브릭에 맞게 볼 수 있습니다. 대화에는 사진·파일을 첨부할 수 있습니다."
                : "이 활동의 지침과 자료를 바탕으로 질문해 보세요. 사진·파일을 첨부할 수 있습니다. 대화는 담당 교사가 확인할 수 있습니다."}
            </p>
          )}
          {messages.map((msg) => {
            const studentText =
              msg.senderType === "student"
                ? visibleMessageText(msg.content, msg.attachments)
                : "";
            return (
            <ChatMessageBubble
              key={msg._id}
              variant={msg.senderType === "student" ? "own" : "other"}
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
                <>
                  {msg.attachments?.length ? (
                    <AiChatAttachmentList items={msg.attachments} />
                  ) : null}
                  {studentText ? (
                    <div className={style.aiChatMsgText}>{studentText}</div>
                  ) : null}
                </>
              ) : form &&
                msg.skill === "assessment-grade" &&
                isAssessmentGradeChatPayload(msg.payload) ? (
                <FormAiChatGradeResult form={form} payload={msg.payload} />
              ) : (
                <div className={style.aiChatMd}>
                  <AlterAssistantBody
                    content={msg.content}
                    className={style.aiChatMd}
                  />
                </div>
              )}
            </ChatMessageBubble>
            );
          })}
          {sending && (
            <ChatMessageBubble variant="other" sender="Alter">
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
          {assessmentMode && (
            <div className={style.aiChatSkillRow} role="group" aria-label="스킬">
              <button
                type="button"
                className={`${style.aiChatSkillChip} ${
                  skill === "chat" ? style.aiChatSkillChipChatOn : ""
                }`}
                aria-pressed={skill === "chat"}
                onClick={() => setSkill("chat")}
              >
                대화
              </button>
              <button
                type="button"
                className={`${style.aiChatSkillChip} ${
                  skill === "grade" ? style.aiChatSkillChipGradeOn : ""
                }`}
                aria-pressed={skill === "grade"}
                onClick={() => setSkill("grade")}
              >
                피드백
              </button>
            </div>
          )}
          <AiUsageBar usage={myUsage} />
          {attachments.length > 0 && (
            <div className={style.aiChatAttachRow}>
              <AiChatAttachmentList
                items={attachments}
                compact
                onRemove={removeAttachment}
              />
            </div>
          )}
          {gradeAttachBlocked && (
            <p className={style.aiChatAttachError} role="alert">
              피드백에는 파일을 첨부할 수 없습니다. 첨부를 제거한 뒤 보내 주세요.
            </p>
          )}
          {attachError && !gradeAttachBlocked ? (
            <p className={style.aiChatAttachError} role="alert">
              {attachError}
            </p>
          ) : null}
          <ChatInputBar
            bare
            value={draft}
            onChange={setDraft}
            onSend={handleSend}
            onPaste={handlePasteAttach}
            placeholder={
              isGradeSkill
                ? "피드백을 요청하거나 덧붙일 말을 입력하세요"
                : "메시지를 입력하세요. 사진·파일은 붙여넣거나 첨부할 수 있습니다"
            }
            disabled={sending || usageLimitExceeded}
            sendDisabled={
              usageLimitExceeded ||
              sending ||
              attachBusy ||
              gradeAttachBlocked ||
              (!isGradeSkill && !draft.trim() && readyAttachments.length === 0)
            }
            sendActive={
              !usageLimitExceeded &&
              !sending &&
              !attachBusy &&
              !gradeAttachBlocked &&
              (isGradeSkill || !!draft.trim() || readyAttachments.length > 0)
            }
            sendTitle={
              usageLimitExceeded
                ? "오늘 AI 사용량(Alt) 한도를 초과했습니다"
                : attachBusy
                  ? "첨부 업로드가 끝난 뒤 보내 주세요"
                  : gradeAttachBlocked
                    ? "피드백에는 파일을 첨부할 수 없습니다"
                    : "보내기"
            }
            leftSlot={
              isGradeSkill ? null : (
                <div className={chatUiStyle.actionMenuWrap} ref={attachMenuRef}>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                    multiple
                    hidden
                    onChange={(event) => void handleAttachFiles(event.target.files)}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.csv,.pdf,.docx,text/plain,text/markdown,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    multiple
                    hidden
                    onChange={(event) => void handleAttachFiles(event.target.files)}
                  />
                  <button
                    type="button"
                    className={chatUiStyle.slotBtn}
                    onClick={() => setAttachMenuOpen((open) => !open)}
                    aria-label="사진·파일 첨부"
                    title="사진·파일 첨부"
                    aria-expanded={attachMenuOpen}
                    aria-haspopup="menu"
                    disabled={
                      sending ||
                      usageLimitExceeded ||
                      attachBusy ||
                      attachments.length >= ATTACHMENT_LIMIT
                    }
                  >
                    <Svg type="plus" width="20px" height="20px" />
                  </button>
                  {attachMenuOpen && (
                    <div className={chatUiStyle.composerMenu} role="menu">
                      <button
                        type="button"
                        className={style.aiChatAttachMenuItem}
                        role="menuitem"
                        onClick={() => imageInputRef.current?.click()}
                      >
                        <Svg type="image" width="18px" height="18px" />
                        사진
                      </button>
                      <button
                        type="button"
                        className={style.aiChatAttachMenuItem}
                        role="menuitem"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Svg type="file" width="18px" height="18px" />
                        파일
                      </button>
                    </div>
                  )}
                </div>
              )
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
