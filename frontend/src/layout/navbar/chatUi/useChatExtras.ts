import { Socket } from "socket.io-client";
import { Dispatch, SetStateAction, useCallback, useEffect, useRef } from "react";
import { TChatMessage, TChatParticipant } from "types/chat";
import {
  TChatReaction,
  applyMessageReactions,
  applyParticipantReadAt,
  toggleReactionLocal,
} from "./chatMessageExtras";

type Actor = {
  _id: string;
  userId: string;
  userName: string;
};

export function useChatReactionToggle(opts: {
  currentUser?: Actor;
  setMessages: Dispatch<SetStateAction<TChatMessage[]>>;
  requestToggle: (
    messageId: string,
    emoji: string
  ) => Promise<{ reactions?: TChatReaction[] }>;
}) {
  const inflight = useRef(new Set<string>());

  return useCallback(
    async (message: TChatMessage, emoji: string) => {
      const user = opts.currentUser;
      if (!user) return;
      const key = `${message._id}:${emoji}`;
      if (inflight.current.has(key)) return;
      inflight.current.add(key);

      const previous = message.reactions;
      const actor = {
        user: user._id,
        userId: user.userId,
        userName: user.userName,
      };
      opts.setMessages((prev) =>
        prev.map((item) =>
          item._id === message._id
            ? {
                ...item,
                reactions: toggleReactionLocal(item.reactions, emoji, actor),
              }
            : item
        )
      );

      try {
        const { reactions } = await opts.requestToggle(message._id, emoji);
        if (reactions) {
          opts.setMessages((prev) =>
            applyMessageReactions(prev, message._id, reactions)
          );
        }
      } catch {
        opts.setMessages((prev) =>
          prev.map((item) =>
            item._id === message._id ? { ...item, reactions: previous } : item
          )
        );
      } finally {
        inflight.current.delete(key);
      }
    },
    [opts.currentUser, opts.requestToggle, opts.setMessages]
  );
}

export function useChatExtrasSocket(opts: {
  socket?: Socket | null;
  roomId?: string | null;
  setMessages: Dispatch<SetStateAction<TChatMessage[]>>;
  onRoomRead?: (userId: string, lastReadAt: string) => void;
}) {
  const { socket, roomId, setMessages, onRoomRead } = opts;

  useEffect(() => {
    if (!socket || !roomId) return;

    const handleReaction = (data: {
      room: string;
      messageId: string;
      reactions: TChatReaction[];
    }) => {
      if (String(data.room) !== String(roomId)) return;
      setMessages((prev) =>
        applyMessageReactions(prev, String(data.messageId), data.reactions || [])
      );
    };

    const handleRoomRead = (data: {
      room: string;
      userId: string;
      lastReadAt: string;
    }) => {
      if (String(data.room) !== String(roomId)) return;
      if (!data.userId || !data.lastReadAt) return;
      onRoomRead?.(data.userId, data.lastReadAt);
    };

    socket.on("message_reaction", handleReaction);
    socket.on("room_read", handleRoomRead);
    return () => {
      socket.off("message_reaction", handleReaction);
      socket.off("room_read", handleRoomRead);
    };
  }, [socket, roomId, setMessages, onRoomRead]);
}

export function patchParticipantsReadAt(
  setRoom: Dispatch<SetStateAction<{ participants: TChatParticipant[] } | null | any>>,
  userId: string,
  lastReadAt: string
) {
  setRoom((prev: { participants?: TChatParticipant[] } | null) => {
    if (!prev?.participants) return prev;
    return {
      ...prev,
      participants: applyParticipantReadAt(prev.participants, userId, lastReadAt),
    };
  });
}
