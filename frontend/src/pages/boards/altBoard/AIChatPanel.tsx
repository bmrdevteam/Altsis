import { useState, useEffect, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";
import { TBoard, TAltBoardRole } from "types/board";
import { TAIChatMessage, TAIChatSession } from "types/aiChat";
import { useAuth } from "contexts/authContext";
import useAPIv2 from "hooks/useAPIv2";
import defaultProfilePic from "assets/img/default_profile.png";
import style from "./boardChat.module.scss";

type Props = {
  board: TBoard;
  socket: Socket | null;
  sessionId?: string; // teacher viewing a specific student's session
  myRole: TAltBoardRole | null;
};

const AIChatPanel = ({ board, socket, sessionId, myRole }: Props) => {
  const { currentUser } = useAuth();
  const { AIChatAPI } = useAPIv2();

  const [messages, setMessages] = useState<TAIChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isWaitingAI, setIsWaitingAI] = useState(false);
  const [currentSession, setCurrentSession] = useState<TAIChatSession | null>(
    null
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);

  const isTeacher = myRole === "admin" || myRole === "writer";

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    },
    []
  );

  // 학생 세션을 보고 있는 모드인지
  const isViewingStudentSession = isTeacher && !!sessionId;

  // Load session + messages
  useEffect(() => {
    setIsLoading(true);
    setMessages([]);
    setCurrentSession(null);

    if (sessionId) {
      // 특정 세션 보기 (교사가 학생 세션 열람)
      AIChatAPI.RAIChatMessages({
        params: { _id: board._id, sessionId },
        query: { limit: 50 },
      })
        .then(({ messages: loadedMessages }) => {
          setMessages(loadedMessages);
          setIsLoading(false);
          isInitialLoadRef.current = true;
        })
        .catch(() => setIsLoading(false));
    } else {
      // 본인 세션 로드 (학생/교사 공통)
      AIChatAPI.RAIChatSessions({ params: { _id: board._id } })
        .then(({ sessions }) => {
          if (sessions.length > 0) {
            setCurrentSession(sessions[0]);
            return AIChatAPI.RAIChatMessages({
              params: { _id: board._id, sessionId: sessions[0]._id },
              query: { limit: 50 },
            });
          }
          setIsLoading(false);
          return null;
        })
        .then((result) => {
          if (result) {
            setMessages(result.messages);
            setIsLoading(false);
            isInitialLoadRef.current = true;
          }
        })
        .catch(() => setIsLoading(false));
    }
  }, [board._id, sessionId]);

  // Scroll on new messages
  useEffect(() => {
    if (messages.length === 0) return;
    if (isInitialLoadRef.current) {
      scrollToBottom("instant" as ScrollBehavior);
      isInitialLoadRef.current = false;
    } else {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  // Socket listener for AI chat messages
  useEffect(() => {
    if (!socket) return;

    const handleAIChatMessage = (data: {
      boardId: string;
      sessionId: string;
      message: TAIChatMessage;
    }) => {
      if (data.boardId !== board._id) return;

      // Check if this message is for the current view
      const viewingSessionId =
        sessionId || currentSession?._id;
      if (data.sessionId === viewingSessionId) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m._id === data.message._id)) return prev;
          return [...prev, data.message];
        });
        if (data.message.senderType === "ai") {
          setIsWaitingAI(false);
        }
      }
    };

    socket.on("ai_chat_message", handleAIChatMessage);

    return () => {
      socket.off("ai_chat_message", handleAIChatMessage);
    };
  }, [socket, board._id, sessionId, currentSession?._id]);

  // Send message
  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setNewMessage("");

    try {
      // sessionId가 있으면 학생 세션에 교사 개입, 없으면 본인 AI 대화
      const { messages: newMessages } = await AIChatAPI.CAIChatMessage({
        params: { _id: board._id },
        data: {
          content: text,
          sessionId: isViewingStudentSession ? sessionId : undefined,
        },
      });

      // Add returned messages (user msg + AI response, or teacher intervention msg)
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m._id));
        const uniqueNew = newMessages.filter((m) => !existingIds.has(m._id));
        return [...prev, ...uniqueNew];
      });

      // 첫 메시지 시 세션 설정 (본인 세션 모드)
      if (!sessionId && !currentSession && newMessages.length > 0) {
        setCurrentSession({
          _id: newMessages[0].session,
          board: board._id,
          student: currentUser?._id || "",
          studentId: currentUser?.userId || "",
          studentName: currentUser?.userName || "",
          isActive: true,
          messageCount: newMessages.length,
          createdAt: newMessages[0].createdAt,
        });
      }
    } catch {
      setNewMessage(text); // restore on failure
    }

    setIsSending(false);
  };

  // Key handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Date formatting
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  };

  const isSameDay = (a: string, b: string) => {
    const da = new Date(a);
    const db = new Date(b);
    return (
      da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate()
    );
  };

  const containerStyle = { height: "100%", minHeight: 0, border: "none", borderRadius: 0 } as const;

  if (isLoading) {
    return (
      <div className={style.container} style={containerStyle}>
        <div className={style.loading}>AI 채팅을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className={style.container} style={{ ...containerStyle, position: "relative" }}>
      {/* Messages */}
      <div className={style.messages_area} ref={messagesAreaRef}>
        {messages.length === 0 ? (
          <div className={style.empty_state}>
            {isViewingStudentSession
              ? "아직 대화가 없습니다"
              : "Alter에게 질문해보세요!"}
          </div>
        ) : (
          messages.map((msg, idx) => {
            const prevMsg = messages[idx - 1];
            const showDate =
              !prevMsg || !isSameDay(prevMsg.createdAt, msg.createdAt);
            const isMine = msg.sender === currentUser?._id;

            return (
              <div key={msg._id}>
                {showDate && (
                  <div className={style.date_divider}>
                    <span>{formatDate(msg.createdAt)}</span>
                  </div>
                )}

                <div
                  className={`${style.message_group} ${
                    isMine ? style.mine : ""
                  }`}
                >
                  {!(isMine) && (
                    <div className={style.avatar}>
                      {msg.senderType === "ai" ? "A" : (
                        <img
                          src={msg.senderProfile || defaultProfilePic}
                          alt=""
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = defaultProfilePic;
                          }}
                        />
                      )}
                    </div>
                  )}
                  <div className={style.message_content}>
                    {!(isMine) && (
                      <div className={style.sender_name}>
                        {msg.senderType === "ai"
                          ? "Alter"
                          : `${msg.senderName}${
                              msg.senderType === "teacher" ? " (교사)" : ""
                            }`}
                      </div>
                    )}
                    <div className={style.bubble}>
                      {msg.content}
                    </div>
                    <div className={style.message_time}>
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {isWaitingAI && (
          <div className={style.message_group}>
            <div className={style.avatar}>A</div>
            <div className={style.message_content}>
              <div className={style.sender_name}>Alter</div>
              <div className={style.bubble}>
                <span style={{ color: "var(--accent-3)" }}>
                  응답을 생성하고 있습니다...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={style.input_area}>
        <textarea
          className={style.text_input}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isViewingStudentSession
              ? "학생에게 메시지를 보내세요..."
              : "Alter에게 질문하세요..."
          }
          rows={1}
          disabled={isSending || isWaitingAI}
        />
        <button
          className={style.send_btn}
          onClick={handleSend}
          disabled={isSending || isWaitingAI || !newMessage.trim()}
        >
          전송
        </button>
      </div>
    </div>
  );
};

export default AIChatPanel;
