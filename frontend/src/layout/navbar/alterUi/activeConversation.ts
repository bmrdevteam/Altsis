const KEY = "altsis.alterActiveConversation";

export type StoredActiveConversation = {
  userId: string;
  schoolId: string;
  conversationId: string | null;
};

const storage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const readActiveConversation = (
  userId: string,
  schoolId: string
): StoredActiveConversation | null => {
  const box = storage();
  if (!box || !userId || !schoolId) return null;
  try {
    const raw = box.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredActiveConversation>;
    if (parsed.userId !== userId || parsed.schoolId !== schoolId) return null;
    const id = String(parsed.conversationId || "").trim();
    return {
      userId,
      schoolId,
      conversationId: id || null,
    };
  } catch {
    return null;
  }
};

export const writeActiveConversation = (
  userId: string,
  schoolId: string,
  conversationId: string | null
) => {
  const box = storage();
  if (!box || !userId || !schoolId) return;
  const id = String(conversationId || "").trim();
  const row: StoredActiveConversation = {
    userId,
    schoolId,
    conversationId: id || null,
  };
  box.setItem(KEY, JSON.stringify(row));
};

/**
 * A stored row wins, including an explicit empty id (the user started a new chat).
 * No stored row falls back to the server's last active conversation.
 */
export const chooseConversationToRestore = (
  stored: StoredActiveConversation | null,
  serverId?: string | null
) => {
  if (stored) return stored.conversationId;
  const id = String(serverId || "").trim();
  return id || null;
};
