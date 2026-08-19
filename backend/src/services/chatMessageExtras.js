/**
 * Chat message extras: emoji reactions and participant socket emit.
 * @namespace Services.ChatMessageExtras
 */
import { FIELD_INVALID, PERMISSION_DENIED } from "../messages/index.js";

export const MAX_REACTION_TYPES = 24;
const EMOJI_MAX_UNITS = 32;

const hasSegmenter =
  typeof Intl !== "undefined" && typeof Intl.Segmenter === "function";

/**
 * A single emoji grapheme (including ZWJ / skin-tone sequences).
 * @param {unknown} input
 * @returns {boolean}
 */
export const isSingleEmoji = (input) => {
  if (typeof input !== "string") return false;
  const value = input.normalize("NFC").trim();
  if (!value || value.length > EMOJI_MAX_UNITS) return false;
  if (/[<>&]/.test(value)) return false;
  if (hasSegmenter) {
    const graphemes = [
      ...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(value),
    ];
    if (graphemes.length !== 1) return false;
  } else if ([...value].length > 8) {
    return false;
  }
  return (
    /\p{Extended_Pictographic}/u.test(value) ||
    /\p{Emoji_Presentation}/u.test(value)
  );
};

export const serializeReactions = (reactions) => {
  const merged = new Map();
  for (const group of reactions || []) {
    const emoji = group.emoji;
    if (!emoji) continue;
    const existing = merged.get(emoji) || { emoji, users: [] };
    const seen = new Set(
      existing.users.map((user) =>
        user.user?.toString ? user.user.toString() : String(user.user)
      )
    );
    for (const user of group.users || []) {
      const id = user.user?.toString ? user.user.toString() : String(user.user);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      existing.users.push({
        user: id,
        userId: user.userId,
        userName: user.userName,
      });
    }
    merged.set(emoji, existing);
  }
  return [...merged.values()];
};

/**
 * Toggle a reaction on a chat message. Mutates via Mongo updates.
 * @returns {Promise<{ reactions?: object[], error?: { status: number, message: string } }>}
 */
export const toggleMessageReaction = async ({
  ChatMessage,
  academyId,
  message,
  user,
  emoji,
}) => {
  if (!message || message.isDeleted || message.messageType === "system") {
    return { error: { status: 403, message: PERMISSION_DENIED } };
  }
  if (!isSingleEmoji(emoji)) {
    return { error: { status: 400, message: FIELD_INVALID("emoji") } };
  }

  const normalized = emoji.normalize("NFC").trim();
  const userId = user._id.toString();
  const actor = {
    user: user._id,
    userId: user.userId,
    userName: user.userName,
  };
  const reactions = Array.isArray(message.reactions) ? message.reactions : [];
  const group = reactions.find((item) => item.emoji === normalized);
  const already = (group?.users || []).some(
    (item) => item.user?.toString() === userId
  );

  if (already) {
    await ChatMessage(academyId).updateOne(
      { _id: message._id, "reactions.emoji": normalized },
      { $pull: { "reactions.$.users": { user: user._id } } }
    );
    await ChatMessage(academyId).updateOne(
      { _id: message._id },
      { $pull: { reactions: { users: { $size: 0 } } } }
    );
  } else if (group) {
    await ChatMessage(academyId).updateOne(
      { _id: message._id, "reactions.emoji": normalized },
      { $pull: { "reactions.$.users": { user: user._id } } }
    );
    await ChatMessage(academyId).updateOne(
      { _id: message._id, "reactions.emoji": normalized },
      { $push: { "reactions.$.users": actor } }
    );
  } else {
    if (serializeReactions(reactions).length >= MAX_REACTION_TYPES) {
      return { error: { status: 400, message: FIELD_INVALID("emoji") } };
    }
    await ChatMessage(academyId).updateOne(
      { _id: message._id, "reactions.emoji": { $ne: normalized } },
      {
        $push: {
          reactions: { emoji: normalized, users: [actor] },
        },
      }
    );
  }

  const updated = await ChatMessage(academyId).findById(message._id);
  return { reactions: serializeReactions(updated?.reactions) };
};

/**
 * Emit a chat socket event to room participants, skipping the actor.
 */
export const emitChatEvent = ({
  ioChat,
  academyId,
  participants,
  exceptUserId,
  event,
  payload,
}) => {
  if (!ioChat) return;
  (participants || []).forEach((participant) => {
    if (
      exceptUserId &&
      participant.user?.toString() === exceptUserId.toString()
    ) {
      return;
    }
    if (!participant.userId) return;
    ioChat
      .to(`chat:${academyId}:${participant.userId}`)
      .emit(event, payload);
  });
};
