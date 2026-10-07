/**
 * Subscribes to the neutral domain bus and queues the existing Alter routine.
 * Loop guard, debounce, caps, and opt-ins stay in the queue.
 */

import { DOMAIN_EVENT_NAMES, onDomainEvent } from "../../../events/domainEvents.js";
import { emitAlterEvent } from "../../../services/alterEvent.js";

const KIND_LABEL = {
  approval: "승인",
  submission: "제출",
  post: "게시",
};

const ALLOWED_KIND = new Set(Object.keys(KIND_LABEL));

const clip = (value) => String(value || "").replace(/\s+/g, " ").trim().slice(0, 80);

/**
 * Form and board names, plus 승인/제출/게시, become the stored title the model reads.
 * Calendar and DM keep the title the domain already sent.
 */
export const toQueuedEvent = (name, payload = {}) => {
  const kind = ALLOWED_KIND.has(payload.kind) ? payload.kind : "";
  const boardName = clip(payload.boardName);
  const formName = clip(payload.formName);
  const named = [boardName, formName, KIND_LABEL[kind]].filter(Boolean);
  const event = {
    type: name,
    entityType: String(payload.entityType || ""),
    entityId: String(payload.entityId || ""),
    actorUserId: String(payload.actorUserId || ""),
    title: named.length ? named.join(" · ").slice(0, 80) : clip(payload.title),
  };
  if (formName) event.formName = formName;
  if (boardName) event.boardName = boardName;
  if (kind) event.kind = kind;
  if (payload.formId) event.formId = String(payload.formId);
  if (payload.boardId) event.boardId = String(payload.boardId);
  if (payload.calendarScope) event.calendarScope = payload.calendarScope;
  if (payload.senderUserId) event.senderUserId = String(payload.senderUserId);
  if (payload.recipientUserId) event.recipientUserId = String(payload.recipientUserId);
  if (Array.isArray(payload.recipientUserIds)) {
    event.recipientUserIds = payload.recipientUserIds.map(String);
  }
  if (payload.notificationType) event.notificationType = String(payload.notificationType);
  return event;
};

let started = false;

export const subscribeDomainEvents = () => {
  if (started) return;
  started = true;
  for (const name of DOMAIN_EVENT_NAMES) {
    onDomainEvent(name, (payload = {}) => {
      emitAlterEvent(payload.academyId, toQueuedEvent(name, payload));
    });
  }
};
