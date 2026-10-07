/**
 * In-process domain event bus. This module does not import Alter.
 * runners/event subscribes and queues routines.
 *
 * Names: approval_requested, form_submitted, form_posted, calendar_created, dm_received.
 *
 * Payload:
 * {
 *   academyId: string,
 *   entityType?: string,
 *   entityId?: string,
 *   actorUserId?: string,
 *   title?: string,
 *   formName?: string,     // 양식 이름. 프롬프트에 보인다.
 *   boardName?: string,    // 보드 이름. 프롬프트에 보인다.
 *   kind?: "approval" | "submission" | "post",
 *   formId?: string,
 *   boardId?: string,
 *   calendarScope?: "school" | "personal",
 *   senderUserId?: string,
 *   recipientUserId?: string,
 *   recipientUserIds?: string[],
 *   notificationType?: string,
 * }
 */

import { EventEmitter } from "node:events";

export const DOMAIN_EVENT_NAMES = [
  "approval_requested",
  "form_submitted",
  "form_posted",
  "calendar_created",
  "dm_received",
];

const NAMES = new Set(DOMAIN_EVENT_NAMES);
const bus = new EventEmitter();

export const onDomainEvent = (name, handler) => {
  if (!NAMES.has(name) || typeof handler !== "function") return () => {};
  bus.on(name, handler);
  return () => bus.off(name, handler);
};

export const emitDomainEvent = (name, payload = {}) => {
  if (!NAMES.has(name)) return;
  bus.emit(name, payload || {});
};
