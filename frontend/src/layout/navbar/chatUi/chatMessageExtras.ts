import { TChatMessage, TChatParticipant } from "types/chat";

export const PRESET_REACTION_EMOJIS = [
  "✅",
  "🙏",
  "👍",
  "😄",
  "❤️",
  "😂",
  "😮",
  "😢",
  "🎉",
] as const;

export const QUOTE_PREVIEW_MAX = 80;

export type TReactionUser = {
  user: string;
  userId: string;
  userName: string;
};

export type TChatReaction = {
  emoji: string;
  users: TReactionUser[];
};

export function canQuoteOrReact(message: {
  isDeleted?: boolean;
  messageType?: string;
}): boolean {
  return !message.isDeleted && message.messageType !== "system";
}

export function formatQuotePreview(message: {
  messageType?: string;
  content?: string;
  attachment?: { fileName?: string };
}): string {
  if (message.messageType === "image") return "[이미지]";
  if (message.messageType === "file") {
    const name = message.attachment?.fileName?.trim();
    return name ? `[파일] ${name}` : "[파일]";
  }
  const lines = String(message.content || "").split(/\r?\n/);
  const first = lines.find((line) => line.trim()) || "";
  const stripped = first.replace(/^>\s?/, "").trim();
  if (stripped.length <= QUOTE_PREVIEW_MAX) return stripped;
  return `${stripped.slice(0, QUOTE_PREVIEW_MAX)}…`;
}

export function formatQuoteTime(createdAt?: string | Date): string {
  if (!createdAt) return "";
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatQuotePrefix(
  senderName: string,
  message: {
    messageType?: string;
    content?: string;
    attachment?: { fileName?: string };
  },
  createdAt?: string | Date
): string {
  const name = (senderName || "").trim() || "알 수 없음";
  const time = formatQuoteTime(createdAt);
  const who = time ? `${name}[${time}]` : name;
  return `> ${who} : ${formatQuotePreview(message)}\n\n`;
}

export function splitQuoteContent(content: string): {
  quote: string | null;
  body: string;
} {
  if (!content) return { quote: null, body: "" };
  const lines = content.split("\n");
  const quoteLines: string[] = [];
  let i = 0;
  while (i < lines.length && lines[i].startsWith("> ")) {
    quoteLines.push(lines[i].slice(2));
    i += 1;
  }
  if (i < lines.length && lines[i].trim() === "") i += 1;
  const body = lines.slice(i).join("\n");
  if (quoteLines.length === 0) return { quote: null, body: content };
  return { quote: quoteLines.join("\n"), body };
}

export function toggleReactionLocal(
  reactions: TChatReaction[] | undefined,
  emoji: string,
  actor: TReactionUser
): TChatReaction[] {
  const list = (reactions || []).map((group) => ({
    ...group,
    users: [...group.users],
  }));
  const idx = list.findIndex((group) => group.emoji === emoji);
  if (idx === -1) {
    return [...list, { emoji, users: [actor] }];
  }
  const had = list[idx].users.some((user) => user.user === actor.user);
  if (had) {
    const users = list[idx].users.filter((user) => user.user !== actor.user);
    if (users.length === 0) {
      return list.filter((_, i) => i !== idx);
    }
    list[idx] = { ...list[idx], users };
    return list;
  }
  list[idx] = { ...list[idx], users: [...list[idx].users, actor] };
  return list;
}

export function countUnreadForMessage(
  message: { sender: string; createdAt: string },
  participants: Array<{ user: string; lastReadAt?: string }>
): number {
  if (!message?.createdAt || !Array.isArray(participants)) return 0;
  const created = new Date(message.createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  return participants.filter((participant) => {
    if (participant.user === message.sender) return false;
    if (!participant.lastReadAt) return true;
    const readAt = new Date(participant.lastReadAt).getTime();
    if (Number.isNaN(readAt)) return true;
    return readAt < created;
  }).length;
}

export function applyParticipantReadAt(
  participants: TChatParticipant[],
  userId: string,
  lastReadAt: string
): TChatParticipant[] {
  return participants.map((participant) =>
    participant.userId === userId
      ? { ...participant, lastReadAt }
      : participant
  );
}

export function applyMessageReactions(
  messages: TChatMessage[],
  messageId: string,
  reactions: TChatReaction[]
): TChatMessage[] {
  return messages.map((message) =>
    message._id === messageId ? { ...message, reactions } : message
  );
}
